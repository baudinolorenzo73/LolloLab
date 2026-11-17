using System.Runtime.InteropServices;
using System.Media;

namespace ScreenAI;

internal sealed class MainForm : Form
{
    private const uint ModAlt = 0x0001;
    private const uint ModControl = 0x0002;
    private const uint WmHotkey = 0x0312;
    private const int HotkeyId = 0x9001;
    private const uint VkS = 0x53;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint modifiers, uint virtualKey);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    private ProviderManager _providers;
    private readonly NotifyIcon _tray;
    private AppSettings _settings;
    private bool _busy;
    private string _lastAnswer = string.Empty;
    private RepoAtlasExport? _lastCapture;
    private Task? _providerInitialization;
    private bool _configOpen;
    private readonly ToolStripMenuItem _primaryMenuItem;
    private readonly ToolStripMenuItem _repoAtlasMenuItem;
    private readonly ToolStripMenuItem _verifyMenuItem;

    public MainForm()
    {
        _settings = AppSettings.Load();
        _providers = new ProviderManager(_settings);
        Text = "ScreenAI";
        ShowInTaskbar = false;
        FormBorderStyle = FormBorderStyle.FixedToolWindow;
        WindowState = FormWindowState.Minimized;
        Opacity = 0;

        var menu = new ContextMenuStrip();
        _primaryMenuItem = new ToolStripMenuItem("Cattura / analizza ora (Ctrl+Alt+S)", null, async (_, _) => await FireAsync());
        _repoAtlasMenuItem = new ToolStripMenuItem("Cattura idea per Repo Atlas", null, async (_, _) => await FireAsync(RepoAtlasExport.ArchivePrompt));
        menu.Items.Add(_primaryMenuItem);
        menu.Items.Add(_repoAtlasMenuItem);
        menu.Items.Add("Configurazione…", null, async (_, _) => await OpenSettingsAsync());
        _verifyMenuItem = new ToolStripMenuItem("Verifica di nuovo i provider", null, async (_, _) => await ShowProviderStatusAsync());
        menu.Items.Add(_verifyMenuItem);
        menu.Items.Add("Ultima risposta", null, (_, _) => ShowLastAnswer());
        menu.Items.Add("Cronologia", null, (_, _) => ShowHistory());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Esci", null, (_, _) => Close());

        _tray = new NotifyIcon
        {
            Icon = SystemIcons.Application,
            Text = "ScreenAI - Ctrl+Alt+S per analizzare",
            Visible = true,
            ContextMenuStrip = menu
        };
        _tray.DoubleClick += async (_, _) => await FireAsync();
        UpdateModeUi();
    }

    protected override void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        if (!RegisterHotKey(Handle, HotkeyId, ModControl | ModAlt, VkS))
        {
            MessageBox.Show("La scorciatoia Ctrl+Alt+S è già usata da un altro programma.\nPuoi comunque avviare l'analisi dall'icona vicino all'orologio.",
                "ScreenAI", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        try { StartupManager.Apply(_settings.StartWithWindows); }
        catch (Exception ex) { _tray.ShowBalloonTip(3500, "Avvio automatico non aggiornato", ex.Message, ToolTipIcon.Warning); }
        _tray.ShowBalloonTip(2500, "ScreenAI attivo", _settings.EnableAiAnalysis
            ? "Premi Ctrl+Alt+S per catturare e analizzare."
            : "Premi Ctrl+Alt+S per salvare uno screenshot.", ToolTipIcon.Info);
        if (_settings.EnableAiAnalysis) _providerInitialization = InitializeProvidersAsync();
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        Hide();
    }

    protected override void WndProc(ref Message message)
    {
        if (message.Msg == WmHotkey && message.WParam.ToInt32() == HotkeyId)
            _ = FireAsync();
        base.WndProc(ref message);
    }

    private async Task FireAsync(string? overridePrompt = null)
    {
        if (_busy || _configOpen)
        {
            _tray.ShowBalloonTip(1500, "ScreenAI", "Operazione già in corso.", ToolTipIcon.Info);
            return;
        }

        _busy = true;
        try
        {
            using var screenshot = ScreenCapture.Capture(_settings.CaptureMode == "All");
            DateTime capturedAt = DateTime.UtcNow;
            DateTime localCapturedAt = capturedAt.ToLocalTime();

            if (!_settings.EnableAiAnalysis)
            {
                string captureOnlyPath = ScreenCapture.SavePng(screenshot, _settings.EffectiveScreenshotDirectory, localCapturedAt);
                PlayCompletionSound();
                _tray.ShowBalloonTip(3500, "Screenshot salvato", captureOnlyPath, ToolTipIcon.Info);
                return;
            }

            await (_providerInitialization ??= InitializeProvidersAsync());
            if (!_providers.HasSelectedProvider)
                await RefreshProvidersAsync();
            if (!_providers.HasSelectedProvider)
            {
                string? savedWithoutAi = _settings.SaveScreenshots
                    ? ScreenCapture.SavePng(screenshot, _settings.EffectiveScreenshotDirectory, localCapturedAt)
                    : null;
                string details = _providers.GetStatusSummary();
                if (savedWithoutAi is not null) details += $"\n\nScreenshot comunque salvato in:\n{savedWithoutAi}";
                MessageBox.Show(details, "Nessuna IA disponibile", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            string prompt = overridePrompt ?? _settings.Prompt;
            string dataUrl;
            string? savedPath = null;
            if (_settings.ShowImagePreview)
            {
                using var preview = new PreviewForm(screenshot, prompt, _providers.DeliveryDescription);
                if (preview.ShowDialog() != DialogResult.OK || preview.ProcessedImage is null)
                    return;
                using var processedImage = preview.ProcessedImage!;
                prompt = preview.PromptText;
                dataUrl = ScreenCapture.ToAnalysisDataUrl(processedImage, _settings.ImageDetail);
                if (_settings.SaveScreenshots)
                    savedPath = ScreenCapture.SavePng(processedImage, _settings.EffectiveScreenshotDirectory, localCapturedAt);
                if (_settings.RememberPreviewPrompt && overridePrompt is null)
                {
                    _settings.Prompt = prompt;
                    _settings.Save();
                }
            }
            else
            {
                // Invio diretto esplicitamente abilitato in Configurazione.
                // Nessuna finestra o richiesta di conferma, nessun oscuramento manuale.
                dataUrl = ScreenCapture.ToAnalysisDataUrl(screenshot, _settings.ImageDetail);
                if (_settings.SaveScreenshots)
                    savedPath = ScreenCapture.SavePng(screenshot, _settings.EffectiveScreenshotDirectory, localCapturedAt);
            }

            _tray.ShowBalloonTip(1200, "ScreenAI", "Analisi in corso…", ToolTipIcon.Info);
            AnalysisResult analysis = await _providers.AnalyzeAsync(prompt,
                dataUrl, _settings.ImageDetail, _settings.MaxOutputTokens);

            _lastAnswer = analysis.Text.Trim();
            _lastCapture = new RepoAtlasExport(dataUrl, _lastAnswer, prompt, analysis.Provider, analysis.Model, capturedAt);
            _tray.Text = ("ScreenAI - " + _providers.SelectedDescription).Length <= 63
                ? "ScreenAI - " + _providers.SelectedDescription : "ScreenAI - provider verificato";
            var warnings = new List<string>();
            if (_settings.SaveHistory)
            {
                try { HistoryStore.Add(new HistoryItem(DateTime.Now, prompt, _lastAnswer, analysis.Model, analysis.Provider)); }
                catch { warnings.Add("Cronologia non salvata; la risposta resta disponibile in Ultima risposta."); }
            }
            if (_settings.CopyToClipboard)
            {
                try { Clipboard.SetText(_lastAnswer); }
                catch (ExternalException) { warnings.Add("Appunti occupati; copia la risposta da Ultima risposta."); }
            }

            if (analysis.SwitchedProvider)
                _tray.ShowBalloonTip(3000, "Provider di riserva attivato",
                    $"Ora viene usato {analysis.Provider} · {analysis.Model}", ToolTipIcon.Warning);

            PlayCompletionSound();

            if (_settings.ShowResultWindow)
                using (var resultForm = new ResultForm(_lastAnswer, _lastCapture)) resultForm.ShowDialog();
            else
                _tray.ShowBalloonTip(3000, "Analisi completata",
                    _settings.CopyToClipboard && warnings.Count == 0
                        ? savedPath is null ? "Risposta copiata negli appunti." : "Risposta copiata e screenshot salvato."
                        : savedPath is null ? "Risposta disponibile in Ultima risposta." : "Risposta disponibile e screenshot salvato.", ToolTipIcon.Info);
            if (warnings.Count > 0) MessageBox.Show(string.Join("\n", warnings), "ScreenAI", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        catch (TaskCanceledException)
        {
            MessageBox.Show("La richiesta ha superato il tempo massimo. Riprova.", "ScreenAI",
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "Errore ScreenAI", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            _busy = false;
        }
    }

    private async Task OpenSettingsAsync()
    {
        if (_busy || _configOpen) return;
        _configOpen = true;
        try
        {
            if (_settings.EnableAiAnalysis)
                await (_providerInitialization ??= InitializeProvidersAsync());
            string status = _settings.EnableAiAnalysis
                ? _providers.GetStatusSummary()
                : "Analisi IA disattivata. Puoi comunque verificare i provider da questa finestra.";
            using var form = new SettingsForm(_settings, status);
            if (form.ShowDialog() != DialogResult.OK) return;
            bool providerChanged = _settings.ProviderSignature() != form.Settings.ProviderSignature();
            StartupManager.Apply(form.Settings.StartWithWindows);
            form.Settings.Save();
            _settings = form.Settings;
            UpdateModeUi();
            if (providerChanged)
            {
                _providers.Dispose();
                _providers = new ProviderManager(_settings);
                _providerInitialization = null;
                if (_settings.EnableAiAnalysis)
                {
                    _providerInitialization = InitializeProvidersAsync();
                    await _providerInitialization;
                }
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "Configurazione ScreenAI", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally { _configOpen = false; }
    }

    private async Task InitializeProvidersAsync()
    {
        if (!_settings.EnableAiAnalysis) return;
        try { await _providers.InitializeAsync(); }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "Verifica servizi ScreenAI", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        string selected = _providers.SelectedDescription;
        _tray.Text = selected.Length > 50 ? "ScreenAI - provider verificato" : $"ScreenAI - {selected}";
        if (selected.StartsWith("Nessun", StringComparison.OrdinalIgnoreCase))
            _tray.ShowBalloonTip(4000, "ScreenAI: nessun provider disponibile",
                "Controlla open.env dal menu Verifica di nuovo i provider.", ToolTipIcon.Error);
        else
            _tray.ShowBalloonTip(2500, "Provider verificato", selected, ToolTipIcon.Info);
    }

    private async Task ShowProviderStatusAsync()
    {
        if (_busy || _configOpen) return;
        _busy = true;
        try
        {
            await (_providerInitialization ??= InitializeProvidersAsync());
            await RefreshProvidersAsync();
            MessageBox.Show(_providers.GetStatusSummary(), "Stato provider ScreenAI",
                MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "Verifica provider ScreenAI", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        finally { _busy = false; }
    }

    private async Task RefreshProvidersAsync()
    {
        var refreshed = new ProviderManager(_settings);
        try
        {
            await refreshed.InitializeAsync();
        }
        catch
        {
            refreshed.Dispose();
            throw;
        }

        ProviderManager previous = _providers;
        _providers = refreshed;
        _providerInitialization = Task.CompletedTask;
        previous.Dispose();
        string selected = _providers.SelectedDescription;
        _tray.Text = selected.Length > 50 ? "ScreenAI - provider verificato" : $"ScreenAI - {selected}";
    }

    private void ShowLastAnswer()
    {
        if (string.IsNullOrWhiteSpace(_lastAnswer))
        {
            var first = HistoryStore.Load().FirstOrDefault();
            _lastAnswer = first?.Answer ?? string.Empty;
        }
        if (string.IsNullOrWhiteSpace(_lastAnswer))
            MessageBox.Show("Nessuna analisi presente.", "ScreenAI");
        else
            using (var result = new ResultForm(_lastAnswer, _lastCapture)) result.ShowDialog();
    }

    private void ShowHistory()
    {
        using var form = new HistoryForm(HistoryStore.Load());
        form.ShowDialog();
    }

    private void UpdateModeUi()
    {
        _primaryMenuItem.Text = _settings.EnableAiAnalysis
            ? "Cattura / analizza ora (Ctrl+Alt+S)"
            : "Cattura screenshot (Ctrl+Alt+S)";
        _repoAtlasMenuItem.Enabled = _settings.EnableAiAnalysis;
        _verifyMenuItem.Enabled = _settings.EnableAiAnalysis;
        _tray.Text = _settings.EnableAiAnalysis ? "ScreenAI - Ctrl+Alt+S per analizzare" : "ScreenAI - Ctrl+Alt+S per catturare";
    }

    private void PlayCompletionSound()
    {
        if (!_settings.EnableSounds) return;
        try
        {
            SystemSounds.Asterisk.Play();
        }
        catch
        {
            // Un problema audio non deve interrompere l'analisi.
        }
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (_busy || _configOpen || _providerInitialization?.IsCompleted == false)
        {
            e.Cancel = true;
            _tray.ShowBalloonTip(2000, "ScreenAI", "Attendi che l'operazione in corso termini, poi scegli Esci.", ToolTipIcon.Info);
            return;
        }
        UnregisterHotKey(Handle, HotkeyId);
        _tray.Visible = false;
        _tray.Dispose();
        _providers.Dispose();
        base.OnFormClosing(e);
    }
}
