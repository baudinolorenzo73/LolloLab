using System.Net;
using System.Text;
using System.Text.Json;
using ScreenAI;

// Test offline: nessuna chiave reale, nessuna chiamata esterna, nessuno screenshot.
string temporary = Path.Combine(Path.GetTempPath(), "ScreenAI-tests-" + Guid.NewGuid().ToString("N") + ".env");
try
{
    File.WriteAllText(temporary, "# test\nexport GOOGLE_API_KEY=\"test-google\nGROQ_API_KEY='test-groq'\nOPENROUTER_API_KEY=\"test-router\"\n");
    var parsed = EnvFile.Load(temporary);
    Assert(parsed["GOOGLE_API_KEY"] == "test-google" && parsed["GROQ_API_KEY"] == "test-groq", "lettura open.env anche con virgoletta non chiusa");

    var settings = JsonSerializer.Deserialize<AppSettings>("{\"Prompt\":\"Domanda precedente\"}")!;
    Assert(settings.Provider == "Auto" && settings.CopyToClipboard && settings.SaveHistory &&
           settings.AutoStartOllama && settings.EnableSounds && settings.EnableAiAnalysis &&
           settings.SaveScreenshots && !settings.StartWithWindows,
        "migrazione impostazioni precedenti");
    Assert(!string.IsNullOrWhiteSpace(settings.EffectiveScreenshotDirectory) &&
           settings.EffectiveScreenshotDirectory.EndsWith(Path.Combine("ScreenAI")),
        "cartella screenshot predefinita nella galleria Immagini");
    string signatureWithAi = settings.ProviderSignature();
    settings.EnableAiAnalysis = false;
    Assert(signatureWithAi != settings.ProviderSignature(), "cambio modalità IA reinizializza correttamente la sessione");
    settings.EnableAiAnalysis = true;
    var clone = settings.Clone();
    clone.Prompts[0].Text = "Nuovo testo";
    Assert(settings.Prompts[0].Text != clone.Prompts[0].Text, "Annulla non cambia i preferiti originali");
    clone.Prompt = "Fammi un riassunto di max 15 righe";
    var roundTrip = JsonSerializer.Deserialize<AppSettings>(JsonSerializer.Serialize(clone))!;
    Assert(roundTrip.Prompt == clone.Prompt, "richiesta personalizzata conservata senza aggiungere quella originale");
    Assert(settings.ShowImagePreview, "vecchie impostazioni mantengono l'anteprima attiva");
    var capture = new RepoAtlasExport("data:image/jpeg;base64,/9j/AA==", "Analisi salvata", "Prompt", "Groq", "vision", DateTime.UtcNow);
    using (var packet = JsonDocument.Parse(capture.ToJson()))
    {
        Assert(packet.RootElement.GetProperty("format").GetString() == "screenai.repo-atlas", "formato interoperabile Repo Atlas");
        Assert(packet.RootElement.GetProperty("imageDataUrl").GetString() == capture.ImageDataUrl &&
               packet.RootElement.GetProperty("analysis").GetString() == "Analisi salvata", "immagine e analisi esportate insieme");
        Assert(!packet.RootElement.TryGetProperty("apiKey", out _), "nessuna chiave API nell'esportazione");
    }
    clone.ShowImagePreview = false;
    clone.ShowResultWindow = false;
    clone.EnableSounds = false;
    clone.CopyToClipboard = true;
    var direct = JsonSerializer.Deserialize<AppSettings>(JsonSerializer.Serialize(clone))!;
    Assert(!direct.ShowImagePreview && !direct.ShowResultWindow && !direct.EnableSounds && direct.CopyToClipboard,
        "invio diretto, suono disattivato e risposta solo negli appunti vengono memorizzati");
    direct.EnableAiAnalysis = false;
    direct.SaveScreenshots = true;
    direct.ScreenshotDirectory = @"D:\ScreenAI";
    direct.StartWithWindows = true;
    var captureOnly = JsonSerializer.Deserialize<AppSettings>(JsonSerializer.Serialize(direct))!;
    Assert(!captureOnly.EnableAiAnalysis && captureOnly.SaveScreenshots &&
           captureOnly.EffectiveScreenshotDirectory == @"D:\ScreenAI" && captureOnly.StartWithWindows,
        "modalità solo cattura, cartella e avvio Windows vengono memorizzati");

    var mock = new FakeHandler();
    using (var manual = new ProviderManager(new AppSettings { Provider = "Groq", GroqModel = "chosen-model" }, mock, temporary))
    {
        await manual.InitializeAsync();
        Assert(manual.HasSelectedProvider && mock.Hosts.All(x => x == "api.groq.com"), "modalità specifica contatta solo il provider scelto");
        Assert(mock.Models.All(x => x == "chosen-model"), "modello personalizzato rispettato");
        mock.FailGroq = true;
        bool failed = false;
        try { await manual.AnalyzeAsync("Domanda", "data:image/jpeg;base64,TEST", "low", 500); }
        catch (InvalidOperationException) { failed = true; }
        Assert(failed && mock.Hosts.All(x => x == "api.groq.com"), "nessuna riserva in modalità specifica");
    }

    mock = new FakeHandler();
    using (var auto = new ProviderManager(new AppSettings(), mock, temporary))
    {
        await auto.InitializeAsync();
        Assert(mock.Hosts.Contains("127.0.0.1"), "Ollama locale verificato in Auto");
        Assert(auto.SelectedDescription.StartsWith("Groq"), "Auto sceglie il test più rapido");
        var first = await auto.AnalyzeAsync("Domanda", "data:image/jpeg;base64,TEST", "low", 500);
        Assert(first.Provider == "Groq" && !first.SwitchedProvider, "selezione stabile durante la sessione");
        mock.FailGroq = true;
        var backup = await auto.AnalyzeAsync("Domanda", "data:image/jpeg;base64,TEST", "low", 500);
        Assert(backup.Provider != "Groq" && backup.SwitchedProvider, "passaggio automatico a una riserva");
        var stable = await auto.AnalyzeAsync("Domanda", "data:image/jpeg;base64,TEST", "low", 500);
        Assert(stable.Provider == backup.Provider && !stable.SwitchedProvider, "la riserva diventa attiva per la sessione");
    }

    mock = new FakeHandler { OllamaVision = false };
    using (var textOnlyOllama = new ProviderManager(new AppSettings
           {
               Provider = "Ollama locale",
               OllamaModel = "qwen3-vl:4b",
               AutoStartOllama = false
           }, mock, temporary))
    {
        await textOnlyOllama.InitializeAsync();
        Assert(!textOnlyOllama.HasSelectedProvider &&
               textOnlyOllama.GetStatusSummary().Contains("non dichiara la capacità vision"),
            "Ollama rifiuta un modello che non dichiara la capacità vision");
    }

    mock = new FakeHandler();
    using (var fixedAuto = new ProviderManager(new AppSettings { AllowFallback = false }, mock, temporary))
    {
        await fixedAuto.InitializeAsync();
        int otherCalls = mock.Hosts.Count(x => x != "api.groq.com");
        mock.FailGroq = true;
        bool failed = false;
        try { await fixedAuto.AnalyzeAsync("Domanda", "data:image/jpeg;base64,TEST", "low", 500); }
        catch (InvalidOperationException) { failed = true; }
        Assert(failed && mock.Hosts.Count(x => x != "api.groq.com") == otherCalls, "Auto senza riserva non invia ad altri servizi");
    }

    mock = new FakeHandler();
    using (var multiple = new ProviderManager(new AppSettings
           {
               AskMultipleProviders = true,
               MultipleProviderCount = 3
           }, mock, temporary))
    {
        await multiple.InitializeAsync();
        int callsBeforeAnalysis = mock.Hosts.Count;
        var comparison = await multiple.AnalyzeAsync("Domanda", "data:image/jpeg;base64,TEST", "low", 500);
        var analysisHosts = mock.Hosts.Skip(callsBeforeAnalysis).ToList();
        Assert(analysisHosts.Count == 3 && analysisHosts.Distinct().Count() == 3,
            "risposte multiple interrogano tre provider diversi");
        Assert(comparison.Provider == "Confronto di 3 IA" &&
               comparison.Text.Contains("RISPOSTA 1") && comparison.Text.Contains("RISPOSTA 3"),
            "risposte multiple unite e separate chiaramente");
    }
    Console.WriteLine("TUTTI I TEST OFFLINE SUPERATI");
}
finally { File.Delete(temporary); }

static void Assert(bool condition, string label)
{
    if (!condition) throw new Exception("TEST FALLITO: " + label);
    Console.WriteLine("OK: " + label);
}

sealed class FakeHandler : HttpMessageHandler
{
    public List<string> Hosts { get; } = new();
    public List<string> Models { get; } = new();
    public bool FailGroq { get; set; }
    public bool OllamaVision { get; set; } = true;
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
    {
        string host = request.RequestUri!.Host;
        Hosts.Add(host);
        if (host == "127.0.0.1" && request.Method == HttpMethod.Get)
        {
            await Task.Delay(30, token);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"models\":[{\"name\":\"qwen3-vl:4b\"}]}", Encoding.UTF8, "application/json")
            };
        }

        if (host == "127.0.0.1" && request.RequestUri.AbsolutePath == "/api/show")
        {
            string showBody = await request.Content!.ReadAsStringAsync(token);
            using var showJson = JsonDocument.Parse(showBody);
            if (showJson.RootElement.TryGetProperty("model", out var shownModel)) Models.Add(shownModel.GetString()!);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(OllamaVision
                    ? "{\"capabilities\":[\"completion\",\"vision\"]}"
                    : "{\"capabilities\":[\"completion\"]}", Encoding.UTF8, "application/json")
            };
        }

        string body = await request.Content!.ReadAsStringAsync(token);
        using var json = JsonDocument.Parse(body);
        if (json.RootElement.TryGetProperty("model", out var model)) Models.Add(model.GetString()!);
        await Task.Delay(host == "api.groq.com" ? 10 : host == "openrouter.ai" ? 200 : host == "127.0.0.1" ? 300 : 400, token);
        if (host == "api.groq.com" && FailGroq)
            return new HttpResponseMessage(HttpStatusCode.TooManyRequests)
                { Content = new StringContent("{\"error\":{\"message\":\"Quota test\"}}") };
        string result = host == "127.0.0.1"
            ? "{\"message\":{\"content\":\"OK\"}}"
            : host == "generativelanguage.googleapis.com"
            ? "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"OK\"}]}}]}"
            : "{\"choices\":[{\"message\":{\"content\":\"OK\"}}]}";
        return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(result, Encoding.UTF8, "application/json") };
    }
}

namespace ScreenAI
{
    // Sostituto offline: il trasporto simulato non elabora dati immagine.
    internal static class ScreenCapture
    {
        public static string CreateProbeDataUrl() => "data:image/jpeg;base64,TEST";
    }
}
