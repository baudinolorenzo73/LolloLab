using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ScreenAI;

internal sealed record ProviderStatus(
    string Name,
    bool Configured,
    bool Available,
    string Model,
    long Milliseconds,
    string Message);

internal sealed record AnalysisResult(string Text, string Provider, string Model, bool SwitchedProvider);

internal sealed class ProviderManager : IDisposable
{
    private readonly HttpClient _http;
    private readonly List<VisionProvider> _providers = new();
    private readonly List<ProviderStatus> _statuses = new();
    private readonly SemaphoreSlim _initializeLock = new(1, 1);
    private VisionProvider? _selected;
    private bool _initialized;
    private readonly AppSettings _settings;

    private readonly string _envPath;
    public ProviderManager(AppSettings settings, HttpMessageHandler? handler = null, string? envPath = null)
    {
        _settings = settings.Clone();
        _http = handler is null ? new HttpClient() : new HttpClient(handler);
        _http.Timeout = TimeSpan.FromSeconds(90);
        _envPath = envPath ?? EnvFile.DefaultPath;
    }
    public bool HasSelectedProvider => _selected is not null;

    public string DeliveryDescription
    {
        get
        {
            if (_settings.Provider == "Auto" && _settings.AskMultipleProviders)
            {
                int requested = Math.Clamp(_settings.MultipleProviderCount, 2, 4);
                var selected = OrderedAvailableProviders().Take(requested).ToList();
                string names = selected.Count == 0 ? "nessuna IA" : string.Join(", ", selected.Select(x => x.Name));
                string fallback = _settings.AllowFallback
                    ? " Se una fallisce, può essere contattata un'altra riserva verificata."
                    : string.Empty;
                return $"Confronto di {selected.Count} IA: {names}. Lo screenshot confermato verrà inviato a tutti questi servizi.{fallback}";
            }
            return _settings.Provider == "Auto" && _settings.AllowFallback
                ? $"{SelectedDescription}. In caso di errore: possono essere usate le altre riserve verificate."
                : SelectedDescription;
        }
    }

    public string EnvPath => _envPath;
    public string SelectedDescription => _selected is null
        ? "Nessun provider selezionato"
        : $"{_selected.Name} · {_selected.ActiveModel}";

    public async Task InitializeAsync()
    {
        if (_initialized) return;
        await _initializeLock.WaitAsync();
        try
        {
            if (_initialized) return;
            var env = EnvFile.Load(EnvPath);

            if (_settings.EnableOllama || _settings.Provider == "Ollama locale")
            {
                string? configuredOllamaModel = !string.IsNullOrWhiteSpace(_settings.OllamaModel)
                    ? _settings.OllamaModel.Trim()
                    : EnvFile.Get(env, "OLLAMA_MODEL");
                AddProvider(new OllamaProvider(_http,
                    string.IsNullOrWhiteSpace(_settings.OllamaEndpoint)
                        ? EnvFile.Get(env, "OLLAMA_ENDPOINT") ?? "http://127.0.0.1:11434"
                        : _settings.OllamaEndpoint,
                    string.IsNullOrWhiteSpace(configuredOllamaModel)
                        ? new[] { "qwen3-vl:4b", "gemma3:4b", "qwen3-vl:8b", "gemma3:12b", "llava:7b", "minicpm-v:latest" }
                        : new[] { configuredOllamaModel },
                    !string.IsNullOrWhiteSpace(configuredOllamaModel),
                    _settings.AutoStartOllama,
                    string.IsNullOrWhiteSpace(_settings.OllamaExecutablePath)
                        ? EnvFile.Get(env, "OLLAMA_EXECUTABLE") ?? string.Empty
                        : _settings.OllamaExecutablePath,
                    Math.Clamp(_settings.OllamaStartupTimeoutSeconds, 10, 300)));
            }
            else if (_settings.Provider == "Auto")
            {
                _statuses.Add(new ProviderStatus("Ollama locale", false, false, "—", 0,
                    "Disattivato nelle impostazioni."));
            }

            AddProvider(new GoogleProvider(_http,
                EnvFile.Get(env, "GOOGLE_API_KEY") ?? EnvFile.Get(env, "GEMINI_API_KEY"),
                Models(env, "GOOGLE_MODEL", _settings.GoogleModel, "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash")));
            AddProvider(new GroqProvider(_http, EnvFile.Get(env, "GROQ_API_KEY"),
                Models(env, "GROQ_MODEL", _settings.GroqModel, "qwen/qwen3.8-27b", "meta-llama/llama-4-scout-17b-16e-instruct")));
            AddProvider(new OpenRouterProvider(_http, EnvFile.Get(env, "OPENROUTER_API_KEY"),
                Models(env, "OPENROUTER_MODEL", _settings.OpenRouterModel, "google/gemini-3-flash-preview", "openai/gpt-4o-mini", "google/gemini-2.5-flash")));

            string? openCodeKey = EnvFile.Get(env, "OPENCODE_API_KEY");
            if (!string.IsNullOrWhiteSpace(openCodeKey))
                _statuses.Add(new ProviderStatus("OpenCode", true, false, "—", 0,
                    "Chiave rilevata, ma non esiste un endpoint pubblico documentato per questa funzione."));

            string probeImage = ScreenCapture.CreateProbeDataUrl();
            var tests = _providers.Select(provider => TestAsync(provider, probeImage)).ToArray();
            ProviderStatus[] results = await Task.WhenAll(tests);
            _statuses.InsertRange(0, results);

            _selected = _providers
                .Where(provider => provider.Available)
                .OrderBy(provider => provider.ProbeMilliseconds)
                .FirstOrDefault();
            _initialized = true;
        }
        finally
        {
            _initializeLock.Release();
        }
    }

    public async Task<AnalysisResult> AnalyzeAsync(
        string prompt,
        string imageDataUrl,
        string detail,
        int maxTokens,
        CancellationToken cancellationToken = default)
    {
        await InitializeAsync();
        if (_selected is null)
            throw new InvalidOperationException("Nessun provider immagini è disponibile.\n\n" + GetStatusSummary());

        if (_settings.Provider == "Auto" && _settings.AskMultipleProviders)
            return await AnalyzeMultipleAsync(prompt, imageDataUrl, detail, maxTokens, cancellationToken);

        VisionProvider selected = _selected;
        var ordered = new[] { selected }
            .Concat(_providers.Where(provider => _settings.Provider == "Auto" && _settings.AllowFallback && provider.Available && provider != selected)
                .OrderBy(provider => provider.ProbeMilliseconds))
            .Distinct()
            .ToList();

        var errors = new List<string>();
        VisionProvider original = selected;
        foreach (var provider in ordered)
        {
            try
            {
                string answer = await provider.AnalyzeAsync(prompt, imageDataUrl, detail, maxTokens, cancellationToken);
                if (string.IsNullOrWhiteSpace(answer)) throw new InvalidOperationException("Risposta vuota o bloccata dal servizio.");
                _selected = provider;
                return new AnalysisResult(answer, provider.Name, provider.ActiveModel, provider != original);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                errors.Add($"{provider.Name}: tempo massimo superato");
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                errors.Add($"{provider.Name}: {ex.Message}");
            }
        }

        cancellationToken.ThrowIfCancellationRequested();
        throw new InvalidOperationException("Tutti i provider disponibili hanno restituito un errore:\n" +
                                            string.Join("\n", errors));
    }

    private async Task<AnalysisResult> AnalyzeMultipleAsync(
        string prompt,
        string imageDataUrl,
        string detail,
        int maxTokens,
        CancellationToken cancellationToken)
    {
        int requested = Math.Clamp(_settings.MultipleProviderCount, 2, 4);
        var candidates = OrderedAvailableProviders().ToList();
        int target = Math.Min(requested, candidates.Count);
        var successes = new List<(VisionProvider Provider, string Answer)>();
        var errors = new List<string>();

        var initial = candidates.Take(target).ToList();
        var initialResults = await Task.WhenAll(initial.Select(provider =>
            TryAnalyzeAsync(provider, prompt, imageDataUrl, detail, maxTokens, cancellationToken)));
        Collect(initialResults, successes, errors);

        if (_settings.AllowFallback && successes.Count < target)
        {
            foreach (VisionProvider reserve in candidates.Skip(target))
            {
                if (successes.Count >= target) break;
                var result = await TryAnalyzeAsync(reserve, prompt, imageDataUrl, detail, maxTokens, cancellationToken);
                Collect(new[] { result }, successes, errors);
            }
        }

        cancellationToken.ThrowIfCancellationRequested();
        if (successes.Count == 0)
            throw new InvalidOperationException("Nessuna IA ha restituito una risposta:\n" + string.Join("\n", errors));

        _selected = successes[0].Provider;
        var sections = successes.Select((result, index) =>
            $"RISPOSTA {index + 1} — {result.Provider.Name} · {result.Provider.ActiveModel}\n\n{result.Answer.Trim()}").ToList();

        var notes = new List<string>();
        if (candidates.Count < requested)
            notes.Add($"Richieste {requested} IA, ma erano disponibili soltanto {candidates.Count}.");
        if (errors.Count > 0)
            notes.Add("Servizi senza risposta:\n" + string.Join("\n", errors));
        if (notes.Count > 0)
            sections.Add("NOTE\n\n" + string.Join("\n", notes));

        return new AnalysisResult(
            string.Join("\n\n────────────────────────────\n\n", sections),
            $"Confronto di {successes.Count} IA",
            string.Join("; ", successes.Select(x => $"{x.Provider.Name}: {x.Provider.ActiveModel}")),
            false);
    }

    private static async Task<(VisionProvider Provider, string? Answer, string? Error)> TryAnalyzeAsync(
        VisionProvider provider,
        string prompt,
        string imageDataUrl,
        string detail,
        int maxTokens,
        CancellationToken cancellationToken)
    {
        try
        {
            string answer = await provider.AnalyzeAsync(prompt, imageDataUrl, detail, maxTokens, cancellationToken);
            if (string.IsNullOrWhiteSpace(answer))
                return (provider, null, "Risposta vuota o bloccata dal servizio.");
            return (provider, answer, null);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return (provider, null, "Tempo massimo superato.");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return (provider, null, ex.Message);
        }
    }

    private static void Collect(
        IEnumerable<(VisionProvider Provider, string? Answer, string? Error)> results,
        ICollection<(VisionProvider Provider, string Answer)> successes,
        ICollection<string> errors)
    {
        foreach (var result in results)
        {
            if (!string.IsNullOrWhiteSpace(result.Answer))
                successes.Add((result.Provider, result.Answer));
            else
                errors.Add($"{result.Provider.Name}: {result.Error ?? "errore sconosciuto"}");
        }
    }

    private IEnumerable<VisionProvider> OrderedAvailableProviders()
    {
        if (_selected is null) return Enumerable.Empty<VisionProvider>();
        return new[] { _selected }
            .Concat(_providers.Where(provider => provider.Available && provider != _selected)
                .OrderBy(provider => provider.ProbeMilliseconds))
            .Distinct();
    }

    public string GetStatusSummary()
    {
        var lines = new List<string>
        {
            $"File configurazione: {EnvPath}",
            $"Provider scelto per la sessione: {SelectedDescription}",
            $"Modalità: {_settings.Provider}; riserva: {(_settings.Provider == "Auto" && _settings.AllowFallback ? "sì" : "no")}; " +
            $"risposte multiple: {(_settings.Provider == "Auto" && _settings.AskMultipleProviders ? $"sì ({Math.Clamp(_settings.MultipleProviderCount, 2, 4)})" : "no")}",
            ""
        };
        foreach (var status in _statuses)
        {
            string marker = status.Available ? "OK" : status.Configured ? "NO" : "—";
            string timing = status.Available ? $" · {status.Milliseconds} ms" : string.Empty;
            lines.Add($"[{marker}] {status.Name} · {status.Model}{timing}\n{status.Message}");
        }
        return string.Join("\n", lines);
    }

    private void AddProvider(VisionProvider provider)
    {
        if (_settings.Provider != "Auto" && _settings.Provider != provider.Name) return;
        if (provider.Configured) _providers.Add(provider);
        else _statuses.Add(new ProviderStatus(provider.Name, false, false, "—", 0, "Chiave non trovata."));
    }

    private static IReadOnlyList<string> Models(
        IReadOnlyDictionary<string, string> env,
        string variable,
        string modelOverride,
        params string[] defaults)
    {
        if (!string.IsNullOrWhiteSpace(modelOverride)) return new[] { modelOverride.Trim() };
        string? configured = EnvFile.Get(env, variable);
        return string.IsNullOrWhiteSpace(configured)
            ? defaults
            : configured.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    private static async Task<ProviderStatus> TestAsync(VisionProvider provider, string probeImage)
    {
        var watch = Stopwatch.StartNew();
        try
        {
            using var timeout = new CancellationTokenSource(provider.ProbeTimeout);
            await provider.ProbeAsync(probeImage, timeout.Token);
            watch.Stop();
            provider.Available = true;
            provider.ProbeMilliseconds = watch.ElapsedMilliseconds;
            return new ProviderStatus(provider.Name, true, true, provider.ActiveModel,
                watch.ElapsedMilliseconds, "Verifica immagini riuscita.");
        }
        catch (Exception ex)
        {
            watch.Stop();
            return new ProviderStatus(provider.Name, true, false, provider.ActiveModel, 0,
                ShortMessage(ex.Message));
        }
    }

    private static string ShortMessage(string message) =>
        message.Length <= 600 ? message : message[..600] + "…";

    public void Dispose()
    {
        _http.Dispose();
        _initializeLock.Dispose();
    }

    private abstract class VisionProvider
    {
        protected readonly HttpClient Http;
        protected readonly string ApiKey;
        protected readonly IReadOnlyList<string> ModelsToTry;

        public abstract string Name { get; }
        public bool Configured { get; }
        public bool Available { get; set; }
        public long ProbeMilliseconds { get; set; }
        public string ActiveModel { get; protected set; }
        public virtual TimeSpan ProbeTimeout => TimeSpan.FromSeconds(30);

        protected VisionProvider(HttpClient http, string? apiKey, IReadOnlyList<string> models, bool requiresApiKey = true)
        {
            Http = http;
            ApiKey = apiKey ?? string.Empty;
            Configured = !requiresApiKey || !string.IsNullOrWhiteSpace(ApiKey);
            ModelsToTry = models;
            ActiveModel = models.FirstOrDefault() ?? string.Empty;
        }

        public virtual async Task ProbeAsync(string imageDataUrl, CancellationToken cancellationToken)
        {
            var errors = new List<string>();
            foreach (string model in ModelsToTry)
            {
                try
                {
                    ActiveModel = model;
                    string answer = await AnalyzeAsync("Rispondi solamente OK.", imageDataUrl, "low", 256, cancellationToken);
                    if (!string.IsNullOrWhiteSpace(answer)) return;
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    errors.Add($"{model}: {ex.Message}");
                }
            }
            throw new InvalidOperationException(string.Join(" | ", errors));
        }

        public abstract Task<string> AnalyzeAsync(
            string prompt, string imageDataUrl, string detail, int maxTokens, CancellationToken cancellationToken);

        protected async Task<string> ReadErrorAsync(HttpResponseMessage response, CancellationToken token)
        {
            string body = await response.Content.ReadAsStringAsync(token);
            try
            {
                using var json = JsonDocument.Parse(body);
                if (json.RootElement.TryGetProperty("error", out var error))
                {
                    if (error.ValueKind == JsonValueKind.Object && error.TryGetProperty("message", out var message))
                        return Redact(message.GetString() ?? response.ReasonPhrase ?? "Errore API");
                    if (error.ValueKind == JsonValueKind.String) return Redact(error.GetString() ?? "Errore API");
                }
            }
            catch { }
            return response.ReasonPhrase ?? "Errore API";
        }

        private string Redact(string text) => string.IsNullOrEmpty(ApiKey) ? text : text.Replace(ApiKey, "[chiave nascosta]", StringComparison.Ordinal);

        protected static string ParseChatCompletion(string body)
        {
            using var json = JsonDocument.Parse(body);
            var content = json.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content");
            if (content.ValueKind == JsonValueKind.String) return content.GetString() ?? string.Empty;
            if (content.ValueKind == JsonValueKind.Array)
                return string.Join(Environment.NewLine, content.EnumerateArray()
                    .Where(x => x.TryGetProperty("text", out _))
                    .Select(x => x.GetProperty("text").GetString())
                    .Where(x => !string.IsNullOrWhiteSpace(x)));
            return string.Empty;
        }
    }

    private sealed class OllamaProvider : VisionProvider
    {
        private readonly string _endpoint;
        private readonly bool _strictModel;
        private readonly bool _autoStart;
        private readonly string _executablePath;
        private readonly int _startupTimeoutSeconds;
        public override string Name => "Ollama locale";
        public override TimeSpan ProbeTimeout => TimeSpan.FromSeconds(_startupTimeoutSeconds + 120);

        public OllamaProvider(HttpClient http, string endpoint, IReadOnlyList<string> models, bool strictModel,
            bool autoStart, string executablePath, int startupTimeoutSeconds)
            : base(http, null, models, requiresApiKey: false)
        {
            _endpoint = endpoint.Trim().TrimEnd('/');
            _strictModel = strictModel;
            _autoStart = autoStart;
            _executablePath = executablePath.Trim().Trim('"');
            _startupTimeoutSeconds = startupTimeoutSeconds;
        }

        public override async Task ProbeAsync(string imageDataUrl, CancellationToken cancellationToken)
        {
            if (!Uri.TryCreate(_endpoint, UriKind.Absolute, out var endpointUri) ||
                (endpointUri.Scheme != Uri.UriSchemeHttp && endpointUri.Scheme != Uri.UriSchemeHttps))
                throw new InvalidOperationException("Indirizzo Ollama non valido. Usa per esempio http://127.0.0.1:11434");

            List<string> installed;
            try
            {
                using var quickCheck = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                quickCheck.CancelAfter(TimeSpan.FromSeconds(3));
                installed = await GetInstalledModelsAsync(quickCheck.Token);
            }
            catch (Exception ex) when (!cancellationToken.IsCancellationRequested &&
                                       ex is HttpRequestException or OperationCanceledException)
            {
                if (!_autoStart)
                    throw new InvalidOperationException("Ollama non risponde. Avvialo oppure attiva l'avvio automatico in Configurazione.", ex);
                if (!endpointUri.IsLoopback)
                    throw new InvalidOperationException("Ollama non risponde. L'avvio automatico è consentito soltanto per un indirizzo locale.", ex);
                installed = await StartAndWaitAsync(cancellationToken);
            }

            var preferred = ModelsToTry
                .Select(requested => FindInstalled(installed, requested))
                .Where(found => found is not null)
                .Cast<string>()
                .Concat(_strictModel ? Enumerable.Empty<string>() : installed)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            string? selected = null;
            foreach (string model in preferred)
            {
                if (await SupportsVisionAsync(model, cancellationToken))
                {
                    selected = model;
                    break;
                }
            }

            if (selected is null)
            {
                string? requestedModel = ModelsToTry.FirstOrDefault();
                bool installedRequested = requestedModel is not null && FindInstalled(installed, requestedModel) is not null;
                string requested = _strictModel && !installedRequested
                    ? $"Il modello '{requestedModel}' non è installato."
                    : _strictModel
                        ? $"Il modello '{requestedModel}' è installato ma non dichiara la capacità vision."
                        : "Ollama funziona, ma nessun modello installato dichiara la capacità vision.";
                throw new InvalidOperationException(requested + " Esegui: ollama pull qwen3-vl:4b");
            }

            ActiveModel = selected;
            string answer = await AnalyzeAsync("Rispondi solamente OK.", imageDataUrl, "low", 256, cancellationToken);
            if (string.IsNullOrWhiteSpace(answer))
                throw new InvalidOperationException("Ollama ha restituito una risposta vuota.");
        }

        private async Task<List<string>> GetInstalledModelsAsync(CancellationToken cancellationToken)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, _endpoint + "/api/tags");
            using var response = await Http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"{(int)response.StatusCode}: {await ReadErrorAsync(response, cancellationToken)}");

            string body = await response.Content.ReadAsStringAsync(cancellationToken);
            using var json = JsonDocument.Parse(body);
            return json.RootElement.TryGetProperty("models", out var models)
                ? models.EnumerateArray()
                    .Select(x => x.TryGetProperty("name", out var name) ? name.GetString() :
                                 x.TryGetProperty("model", out var model) ? model.GetString() : null)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Cast<string>()
                    .ToList()
                : new List<string>();
        }

        private async Task<List<string>> StartAndWaitAsync(CancellationToken cancellationToken)
        {
            string executable = ResolveExecutable();
            Process? process;
            try
            {
                process = Process.Start(new ProcessStartInfo
                {
                    FileName = executable,
                    Arguments = "serve",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                });
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    $"Non riesco ad avviare Ollama da '{executable}'. Seleziona ollama.exe in Configurazione. Dettaglio: {ex.Message}", ex);
            }

            if (process is null)
                throw new InvalidOperationException($"Windows non ha avviato Ollama da '{executable}'.");

            using (process)
            {
                var watch = Stopwatch.StartNew();
                Exception? lastError = null;
                while (watch.Elapsed < TimeSpan.FromSeconds(_startupTimeoutSeconds))
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    try
                    {
                        using var attempt = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                        attempt.CancelAfter(TimeSpan.FromSeconds(3));
                        return await GetInstalledModelsAsync(attempt.Token);
                    }
                    catch (Exception ex) when (!cancellationToken.IsCancellationRequested &&
                                               ex is HttpRequestException or OperationCanceledException)
                    {
                        lastError = ex;
                    }

                    if (process.HasExited)
                        throw new InvalidOperationException(
                            $"Ollama si è chiuso durante l'avvio (codice {process.ExitCode}). Controlla il percorso e prova ad avviarlo manualmente.");
                    await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
                }

                throw new InvalidOperationException(
                    $"Ollama è stato avviato ma non ha risposto entro {_startupTimeoutSeconds} secondi su {_endpoint}. " +
                    $"Ultimo errore: {lastError?.Message ?? "nessuna risposta"}");
            }
        }

        private string ResolveExecutable()
        {
            if (!string.IsNullOrWhiteSpace(_executablePath))
            {
                string expanded = Environment.ExpandEnvironmentVariables(_executablePath);
                if (Path.IsPathRooted(expanded) && !File.Exists(expanded))
                    throw new InvalidOperationException($"Il programma Ollama non esiste: {expanded}");
                return expanded;
            }

            string? localAppData = Environment.GetEnvironmentVariable("LOCALAPPDATA");
            if (!string.IsNullOrWhiteSpace(localAppData))
            {
                string commonPath = Path.Combine(localAppData, "Programs", "Ollama", "ollama.exe");
                if (File.Exists(commonPath)) return commonPath;
            }
            return "ollama";
        }

        private async Task<bool> SupportsVisionAsync(string model, CancellationToken cancellationToken)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, _endpoint + "/api/show")
            {
                Content = JsonContent.Create(new { model })
            };
            using var response = await Http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException(
                    $"Impossibile verificare il modello Ollama '{model}': {(int)response.StatusCode} {await ReadErrorAsync(response, cancellationToken)}");

            string body = await response.Content.ReadAsStringAsync(cancellationToken);
            using var json = JsonDocument.Parse(body);
            if (!json.RootElement.TryGetProperty("capabilities", out var capabilities) ||
                capabilities.ValueKind != JsonValueKind.Array)
                return IsKnownVisionModel(model); // Compatibilità con versioni Ollama precedenti.
            return capabilities.EnumerateArray().Any(capability =>
                capability.ValueKind == JsonValueKind.String &&
                capability.GetString()?.Equals("vision", StringComparison.OrdinalIgnoreCase) == true);
        }

        public override async Task<string> AnalyzeAsync(string prompt, string imageDataUrl, string detail,
            int maxTokens, CancellationToken cancellationToken)
        {
            int comma = imageDataUrl.IndexOf(',');
            string base64 = comma >= 0 ? imageDataUrl[(comma + 1)..] : imageDataUrl;
            var payload = new
            {
                model = ActiveModel,
                stream = false,
                messages = new[]
                {
                    new { role = "user", content = prompt, images = new[] { base64 } }
                },
                options = new { num_predict = maxTokens }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, _endpoint + "/api/chat")
            {
                Content = JsonContent.Create(payload)
            };
            using var response = await Http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"{(int)response.StatusCode}: {await ReadErrorAsync(response, cancellationToken)}");

            string body = await response.Content.ReadAsStringAsync(cancellationToken);
            using var json = JsonDocument.Parse(body);
            if (json.RootElement.TryGetProperty("message", out var message) &&
                message.TryGetProperty("content", out var content))
                return content.GetString() ?? string.Empty;
            throw new InvalidOperationException("Formato della risposta Ollama non riconosciuto.");
        }

        private static string? FindInstalled(IEnumerable<string> installed, string requested)
        {
            string? exact = installed.FirstOrDefault(name => name.Equals(requested, StringComparison.OrdinalIgnoreCase));
            if (exact is not null) return exact;
            return requested.Contains(':')
                ? null
                : installed.FirstOrDefault(name => name.StartsWith(requested + ":", StringComparison.OrdinalIgnoreCase));
        }

        private static bool IsKnownVisionModel(string model)
        {
            string name = model.ToLowerInvariant();
            return name.Contains("qwen3-vl") || name.Contains("qwen3.5") || name.Contains("qwen3.6") ||
                   name.Contains("qwen3.8") || name.Contains("gemma3") || name.Contains("gemma4") ||
                   name.Contains("llava") || name.Contains("minicpm-v") || name.Contains("moondream") ||
                   name.Contains("llama3.2-vision") || name.Contains("mistral-small3.1");
        }
    }

    private sealed class OpenRouterProvider : VisionProvider
    {
        public override string Name => "OpenRouter";
        public OpenRouterProvider(HttpClient http, string? key, IReadOnlyList<string> models) : base(http, key, models) { }

        public override async Task<string> AnalyzeAsync(string prompt, string imageDataUrl, string detail,
            int maxTokens, CancellationToken cancellationToken)
        {
            var payload = ChatPayload(ActiveModel, prompt, imageDataUrl, maxTokens);
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://openrouter.ai/api/v1/chat/completions");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);
            request.Headers.Add("X-Title", "ScreenAI");
            request.Content = JsonContent.Create(payload);
            using var response = await Http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"{(int)response.StatusCode}: {await ReadErrorAsync(response, cancellationToken)}");
            return ParseChatCompletion(await response.Content.ReadAsStringAsync(cancellationToken));
        }
    }

    private sealed class GroqProvider : VisionProvider
    {
        public override string Name => "Groq";
        public GroqProvider(HttpClient http, string? key, IReadOnlyList<string> models) : base(http, key, models) { }

        public override async Task<string> AnalyzeAsync(string prompt, string imageDataUrl, string detail,
            int maxTokens, CancellationToken cancellationToken)
        {
            var payload = ChatPayload(ActiveModel, prompt, imageDataUrl, maxTokens);
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);
            request.Content = JsonContent.Create(payload);
            using var response = await Http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"{(int)response.StatusCode}: {await ReadErrorAsync(response, cancellationToken)}");
            return ParseChatCompletion(await response.Content.ReadAsStringAsync(cancellationToken));
        }
    }

    private sealed class GoogleProvider : VisionProvider
    {
        public override string Name => "Google Gemini";
        public GoogleProvider(HttpClient http, string? key, IReadOnlyList<string> models) : base(http, key, models) { }

        public override async Task<string> AnalyzeAsync(string prompt, string imageDataUrl, string detail,
            int maxTokens, CancellationToken cancellationToken)
        {
            int comma = imageDataUrl.IndexOf(',');
            string base64 = comma >= 0 ? imageDataUrl[(comma + 1)..] : imageDataUrl;
            var payload = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = prompt },
                            new { inline_data = new { mime_type = "image/jpeg", data = base64 } }
                        }
                    }
                },
                generationConfig = new { maxOutputTokens = maxTokens }
            };

            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(ActiveModel)}:generateContent";
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("x-goog-api-key", ApiKey);
            request.Content = JsonContent.Create(payload);
            using var response = await Http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"{(int)response.StatusCode}: {await ReadErrorAsync(response, cancellationToken)}");

            string body = await response.Content.ReadAsStringAsync(cancellationToken);
            using var json = JsonDocument.Parse(body);
            if (!json.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            {
                string reason = json.RootElement.TryGetProperty("promptFeedback", out var feedback) &&
                                feedback.TryGetProperty("blockReason", out var blockReason)
                    ? blockReason.GetString() ?? "nessun candidato"
                    : "nessun candidato";
                throw new InvalidOperationException("Gemini non ha prodotto una risposta: " + reason);
            }
            var parts = candidates[0].GetProperty("content").GetProperty("parts");
            return string.Join(Environment.NewLine, parts.EnumerateArray()
                .Where(x => x.TryGetProperty("text", out _))
                .Select(x => x.GetProperty("text").GetString())
                .Where(x => !string.IsNullOrWhiteSpace(x)));
        }
    }

    private static object ChatPayload(string model, string prompt, string imageDataUrl, int maxTokens) => new
    {
        model,
        max_completion_tokens = maxTokens,
        messages = new object[]
        {
            new
            {
                role = "user",
                content = new object[]
                {
                    new { type = "text", text = prompt },
                    new { type = "image_url", image_url = new { url = imageDataUrl } }
                }
            }
        }
    };
}
