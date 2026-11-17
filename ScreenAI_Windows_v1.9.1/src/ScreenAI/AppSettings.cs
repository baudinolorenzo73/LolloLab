using System.Text.Json;

namespace ScreenAI;

internal sealed class AppSettings
{
    public const string DefaultPrompt = "Descrivi cosa vedi sullo schermo e riassumi l'attività dell'utente in 5-6 righe in italiano. Non inventare dettagli non visibili.";

    public string Prompt { get; set; } = DefaultPrompt;
    public string CaptureMode { get; set; } = "Current";
    public string ImageDetail { get; set; } = "low";
    public int MaxOutputTokens { get; set; } = 500;
    public bool ShowResultWindow { get; set; } = true;
    public bool ShowImagePreview { get; set; } = true;
    public bool EnableSounds { get; set; } = true;
    public bool EnableAiAnalysis { get; set; } = true;
    public bool SaveScreenshots { get; set; } = true;
    public string ScreenshotDirectory { get; set; } = "";
    public bool StartWithWindows { get; set; } = false;
    public string Provider { get; set; } = "Auto";
    public bool AllowFallback { get; set; } = true;
    public bool AskMultipleProviders { get; set; } = false;
    public int MultipleProviderCount { get; set; } = 2;
    public string GoogleModel { get; set; } = "";
    public string GroqModel { get; set; } = "";
    public string OpenRouterModel { get; set; } = "";
    public bool EnableOllama { get; set; } = true;
    public string OllamaEndpoint { get; set; } = "";
    public string OllamaModel { get; set; } = "";
    public bool AutoStartOllama { get; set; } = true;
    public string OllamaExecutablePath { get; set; } = "";
    public int OllamaStartupTimeoutSeconds { get; set; } = 120;
    public bool CopyToClipboard { get; set; } = true;
    public bool SaveHistory { get; set; } = true;
    public bool RememberPreviewPrompt { get; set; } = true;
    public string PromptName { get; set; } = "Riassunto schermo";
    public List<PromptPreset> Prompts { get; set; } = PromptPreset.Defaults();

    public AppSettings Clone() => JsonSerializer.Deserialize<AppSettings>(
        JsonSerializer.Serialize(this)) ?? new AppSettings();

    public string ProviderSignature() => string.Join("|", EnableAiAnalysis, Provider, AllowFallback,
        AskMultipleProviders, MultipleProviderCount, GoogleModel, GroqModel, OpenRouterModel,
        EnableOllama, OllamaEndpoint, OllamaModel, AutoStartOllama, OllamaExecutablePath,
        OllamaStartupTimeoutSeconds);

    public string EffectiveScreenshotDirectory => string.IsNullOrWhiteSpace(ScreenshotDirectory)
        ? DefaultScreenshotDirectory
        : Environment.ExpandEnvironmentVariables(ScreenshotDirectory.Trim());

    public static string DefaultScreenshotDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.MyPictures), "ScreenAI");

    public static string DataDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ScreenAI");

    private static string SettingsPath => Path.Combine(DataDirectory, "settings.json");

    public static AppSettings Load()
    {
        try
        {
            if (!File.Exists(SettingsPath)) return new AppSettings();
            var settings = JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(SettingsPath), JsonOptions)
                           ?? new AppSettings();
            settings.Prompts ??= PromptPreset.Defaults();
            if (string.IsNullOrWhiteSpace(settings.Prompt)) settings.Prompt = DefaultPrompt;
            return settings;
        }
        catch
        {
            return new AppSettings();
        }
    }

    public void Save()
    {
        Directory.CreateDirectory(DataDirectory);
        File.WriteAllText(SettingsPath, JsonSerializer.Serialize(this, JsonOptions));
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };
}

internal sealed class PromptPreset
{
    public string Name { get; set; } = "";
    public string Text { get; set; } = "";
    public override string ToString() => Name;
    public static List<PromptPreset> Defaults() => new()
    {
        new() { Name = "Riassunto schermo", Text = AppSettings.DefaultPrompt },
        new() { Name = "Riassunto — massimo 15 righe", Text = "Fammi un riassunto di max 15 righe del contenuto visibile nell'immagine, in italiano. Non inventare dettagli non visibili." },
        new() { Name = "Trascrivi il testo", Text = "Trascrivi fedelmente il testo leggibile nell'immagine. Mantieni paragrafi ed elenchi. Indica [illeggibile] dove necessario e non completare il testo per supposizione." },
        new() { Name = "Spiega e riassumi", Text = "Spiega in italiano semplice il contenuto visibile, poi riassumi i punti principali. Distingui i dati visibili dalle tue interpretazioni e segnala le parti non leggibili." },
        new() { Name = "Analizza un errore", Text = "Leggi l'errore visibile e aiutami a capirlo. Indica cosa è certo, le possibili cause e i controlli sicuri da fare. Non inventare dettagli mancanti e non proporre cancellazioni di dati senza avvertire." },
        new() { Name = "Traduci in italiano", Text = "Traduci in italiano il testo leggibile nell'immagine, mantenendo titoli e struttura. Segnala le parti illeggibili senza inventarle." }
    };
}
