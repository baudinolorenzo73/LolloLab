using Microsoft.Win32;

namespace ScreenAI;

internal static class StartupManager
{
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string ValueName = "ScreenAI";

    public static void Apply(bool enabled)
    {
        using RegistryKey key = Registry.CurrentUser.CreateSubKey(RunKey, writable: true)
            ?? throw new InvalidOperationException("Impossibile aprire le impostazioni di avvio di Windows.");

        if (!enabled)
        {
            key.DeleteValue(ValueName, throwOnMissingValue: false);
            return;
        }

        string executable = Environment.ProcessPath ?? Application.ExecutablePath;
        if (string.IsNullOrWhiteSpace(executable))
            throw new InvalidOperationException("Impossibile determinare il percorso di ScreenAI.exe.");

        key.SetValue(ValueName, $"\"{executable}\"", RegistryValueKind.String);
    }
}
