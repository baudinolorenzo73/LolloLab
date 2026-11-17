namespace ScreenAI;

internal static class EnvFile
{
    public static string DefaultPath => Path.Combine(AppContext.BaseDirectory, "open.env");

    public static IReadOnlyDictionary<string, string> Load(string path)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!File.Exists(path)) return values;

        foreach (string rawLine in File.ReadLines(path))
        {
            string line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#')) continue;
            if (line.StartsWith("export ", StringComparison.OrdinalIgnoreCase))
                line = line[7..].TrimStart();

            int equals = line.IndexOf('=');
            if (equals <= 0) continue;

            string name = line[..equals].Trim();
            string value = line[(equals + 1)..].Trim();

            // Accetta anche una virgoletta aperta o chiusa per errore. In questo modo
            // la chiave non viene inviata con un carattere estraneo all'inizio/fine.
            if (value.Length > 0 && IsQuote(value[0])) value = value[1..];
            if (value.Length > 0 && IsQuote(value[^1])) value = value[..^1];
            value = value.Trim();

            if (name.Length > 0 && value.Length > 0) values[name] = value;
        }
        return values;
    }

    private static bool IsQuote(char value) => value is '"' or '\'' or '\u201C' or '\u201D' or '\u2018' or '\u2019';

    public static string? Get(IReadOnlyDictionary<string, string> values, string name)
    {
        if (values.TryGetValue(name, out string? value) && !string.IsNullOrWhiteSpace(value)) return value;
        value = Environment.GetEnvironmentVariable(name);
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }
}
