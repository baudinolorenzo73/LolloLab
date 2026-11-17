using System.Threading;

namespace ScreenAI;

internal static class Program
{
    private const string MutexName = "Local\\ScreenAI_9B96A723_9248_4BD0_A8F6_495521A0A4E0";

    [STAThread]
    private static void Main()
    {
        using var mutex = new Mutex(true, MutexName, out bool firstInstance);
        if (!firstInstance)
        {
            MessageBox.Show("ScreenAI è già in esecuzione nell'area di notifica.", "ScreenAI",
                MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }
}
