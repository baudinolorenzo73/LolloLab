using System.Text.Json;

namespace ScreenAI;

internal sealed record HistoryItem(DateTime Timestamp, string Prompt, string Answer, string Model, string Provider = "");

internal static class HistoryStore
{
    private static string HistoryPath => Path.Combine(AppSettings.DataDirectory, "history.json");
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };

    public static IReadOnlyList<HistoryItem> Load()
    {
        try
        {
            if (!File.Exists(HistoryPath)) return Array.Empty<HistoryItem>();
            return JsonSerializer.Deserialize<List<HistoryItem>>(File.ReadAllText(HistoryPath), Options)
                   ?? new List<HistoryItem>();
        }
        catch
        {
            return Array.Empty<HistoryItem>();
        }
    }

    public static void Add(HistoryItem item)
    {
        Directory.CreateDirectory(AppSettings.DataDirectory);
        var items = Load().Prepend(item).Take(50).ToList();
        File.WriteAllText(HistoryPath, JsonSerializer.Serialize(items, Options));
    }
}
