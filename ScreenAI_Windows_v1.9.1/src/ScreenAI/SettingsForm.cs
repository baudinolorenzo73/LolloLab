using System.Diagnostics;
using System.Media;

namespace ScreenAI;

internal sealed class SettingsForm : Form
{
    private readonly ComboBox _presets = Choice();
    private readonly TextBox _name = new();
    private readonly TextBox _prompt = new() { Multiline = true, ScrollBars = ScrollBars.Vertical, Height = 190 };
    private readonly ComboBox _provider = Choice("Auto", "Ollama locale", "Google Gemini", "Groq", "OpenRouter");
    private readonly CheckBox _fallback = Check("In Auto: passa a una riserva se il servizio fallisce");
    private readonly CheckBox _multiple = Check("In Auto: interroga più IA e confronta le risposte");
    private readonly NumericUpDown _multipleCount = new() { Minimum = 2, Maximum = 4, Value = 2 };
    private readonly CheckBox _ollamaEnabled = Check("In Auto: verifica anche Ollama locale");
    private readonly TextBox _ollamaEndpoint = new();
    private readonly TextBox _ollamaModel = new();
    private readonly CheckBox _ollamaAutoStart = Check("Avvia Ollama se il server locale non risponde");
    private readonly TextBox _ollamaExecutable = new() { Width = 400 };
    private readonly Button _ollamaBrowse = new() { Text = "Sfoglia…", AutoSize = true };
    private readonly NumericUpDown _ollamaStartupTimeout = new() { Minimum = 10, Maximum = 300, Increment = 10 };
    private readonly TextBox _google = new();
    private readonly TextBox _groq = new();
    private readonly TextBox _router = new();
    private readonly ComboBox _capture = Choice("Monitor corrente", "Tutti i monitor");
    private readonly ComboBox _quality = Choice("low", "high", "auto");
    private readonly NumericUpDown _tokens = new() { Minimum = 100, Maximum = 8000, Increment = 100 };
    private readonly CheckBox _show = Check("Mostra la risposta in una finestra");
    private readonly CheckBox _preview = Check("Mostra anteprima e chiedi conferma prima dell'invio");
    private readonly CheckBox _sounds = Check("Riproduci un suono quando l'analisi è completata");
    private readonly CheckBox _copy = Check("Copia automaticamente negli appunti (sostituisce il contenuto)");
    private readonly CheckBox _history = Check("Memorizza le ultime 50 risposte, senza immagini");
    private readonly CheckBox _remember = Check("Ricorda le modifiche alla domanda fatte nell'anteprima");
    private readonly CheckBox _startWithWindows = Check("Avvia ScreenAI automaticamente all'accesso a Windows");
    private readonly CheckBox _useAi = Check("Analizza lo screenshot con l'IA");
    private readonly CheckBox _saveScreenshots = Check("Salva una copia locale di ogni screenshot");
    private readonly TextBox _screenshotDirectory = new() { Width = 390 };
    private readonly Button _screenshotBrowse = new() { Text = "Sfoglia…", AutoSize = true };
    private readonly Button _screenshotOpen = new() { Text = "Apri", AutoSize = true };
    private readonly TextBox _status = new() { Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Vertical, Height = 240 };
    private readonly Button _save = new() { Text = "Salva e applica", AutoSize = true };
    private bool _testing;
    public AppSettings Settings { get; }

    public SettingsForm(AppSettings source, string providerStatus)
    {
        Settings = source.Clone();
        Text = "ScreenAI 1.9.1 — Configurazione";
        StartPosition = FormStartPosition.CenterScreen;
        Size = new Size(860, 700);
        MinimumSize = new Size(700, 550);
        AutoScaleMode = AutoScaleMode.Dpi;
        var tabs = new TabControl { Dock = DockStyle.Fill };
        var general = Page(tabs, "Uso e salvataggio");
        var questions = Page(tabs, "Domande salvate");
        var ai = Page(tabs, "IA e modelli");
        var options = Page(tabs, "Cattura e privacy");
        var diagnostics = Page(tabs, "Verifica servizi");

        _startWithWindows.Checked = Settings.StartWithWindows;
        _useAi.Checked = Settings.EnableAiAnalysis;
        _saveScreenshots.Checked = Settings.SaveScreenshots;
        _screenshotDirectory.Text = Settings.EffectiveScreenshotDirectory;
        Row(general, "Windows", _startWithWindows);
        Row(general, "Modalità", _useAi);
        Row(general, "Archivio immagini", _saveScreenshots);
        var screenshotPath = new FlowLayoutPanel { AutoSize = true, WrapContents = false };
        screenshotPath.Controls.AddRange(new Control[] { _screenshotDirectory, _screenshotBrowse, _screenshotOpen });
        Row(general, "Cartella screenshot", screenshotPath);
        Row(general, "", Note($"Cartella predefinita: {AppSettings.DefaultScreenshotDirectory}\nCon IA disattivata, Ctrl+Alt+S salva soltanto lo screenshot e nessun dato viene inviato. Se l'anteprima IA è attiva, viene salvata l'immagine finale con gli eventuali oscuramenti."));
        _screenshotBrowse.Click += (_, _) =>
        {
            using var picker = new FolderBrowserDialog
            {
                Description = "Scegli dove salvare gli screenshot di ScreenAI",
                SelectedPath = _screenshotDirectory.Text,
                ShowNewFolderButton = true
            };
            if (picker.ShowDialog(this) == DialogResult.OK) _screenshotDirectory.Text = picker.SelectedPath;
        };
        _screenshotOpen.Click += (_, _) =>
        {
            try
            {
                string path = Path.GetFullPath(Environment.ExpandEnvironmentVariables(_screenshotDirectory.Text.Trim()));
                Directory.CreateDirectory(path);
                Process.Start(new ProcessStartInfo("explorer.exe", path) { UseShellExecute = true });
            }
            catch (Exception ex) { MessageBox.Show(this, ex.Message, "Cartella screenshot", MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        };
        _useAi.CheckedChanged += (_, _) => UpdateUsageControls();
        _saveScreenshots.CheckedChanged += (_, _) => UpdateUsageControls();

        _prompt.Text = Settings.Prompt;
        _name.Text = Settings.PromptName;
        Row(questions, "Scegli una domanda", _presets);
        Row(questions, "Nome della domanda", _name);
        Row(questions, "Testo da inviare all'IA", _prompt);
        var promptButtons = new FlowLayoutPanel { AutoSize = true };
        var store = new Button { Text = "Memorizza / aggiorna", AutoSize = true };
        var remove = new Button { Text = "Elimina selezionata", AutoSize = true };
        promptButtons.Controls.AddRange(new Control[] { store, remove });
        Row(questions, "Archivio domande", promptButtons);
        Row(questions, "", Note("Il testo qui sopra sostituisce completamente la richiesta originale. Salva e applica lo memorizza e lo rende attivo anche ai prossimi avvii. Altro… consente di scrivere una richiesta libera. Annulla scarta le modifiche."));
        RefreshPrompts();
        _presets.SelectedIndexChanged += (_, _) =>
        {
            if (_presets.SelectedItem is PromptPreset preset)
            {
                _name.Text = preset.Name;
                _prompt.Text = preset.Text;
            }
            else if (_presets.SelectedItem is string)
            {
                _name.Text = "Personalizzata";
                _prompt.Clear();
                _prompt.Focus();
            }
        };
        store.Click += (_, _) =>
        {
            if (!ValidPrompt()) return;
            string name = _name.Text.Trim();
            if (name.Length == 0) { MessageBox.Show(this, "Dai un nome alla domanda."); return; }
            var item = Settings.Prompts.FirstOrDefault(x => x.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (item is null) Settings.Prompts.Add(new PromptPreset { Name = name, Text = _prompt.Text.Trim() });
            else item.Text = _prompt.Text.Trim();
            RefreshPrompts();
        };
        remove.Click += (_, _) =>
        {
            if (_presets.SelectedItem is not PromptPreset item) return;
            if (MessageBox.Show(this, $"Eliminare la domanda '{item.Name}'?", "Domande",
                MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            Settings.Prompts.Remove(item);
            _name.Clear();
            RefreshPrompts();
        };

        _provider.SelectedItem = Settings.Provider;
        if (_provider.SelectedIndex < 0) _provider.SelectedIndex = 0;
        _fallback.Checked = Settings.AllowFallback;
        _multiple.Checked = Settings.AskMultipleProviders;
        _multipleCount.Value = Math.Clamp(Settings.MultipleProviderCount, 2, 4);
        _ollamaEnabled.Checked = Settings.EnableOllama;
        _ollamaEndpoint.Text = string.IsNullOrWhiteSpace(Settings.OllamaEndpoint)
            ? "http://127.0.0.1:11434"
            : Settings.OllamaEndpoint;
        _ollamaModel.Text = Settings.OllamaModel;
        _ollamaAutoStart.Checked = Settings.AutoStartOllama;
        _ollamaExecutable.Text = Settings.OllamaExecutablePath;
        _ollamaStartupTimeout.Value = Math.Clamp(Settings.OllamaStartupTimeoutSeconds, 10, 300);
        _google.Text = Settings.GoogleModel;
        _groq.Text = Settings.GroqModel;
        _router.Text = Settings.OpenRouterModel;
        Row(ai, "Servizio da usare", _provider);
        Row(ai, "Riserva automatica", _fallback);
        Row(ai, "Risposte multiple", _multiple);
        Row(ai, "Numero di IA", _multipleCount);
        Row(ai, "Ollama in Auto", _ollamaEnabled);
        Row(ai, "Indirizzo Ollama", _ollamaEndpoint);
        Row(ai, "Modello Ollama", _ollamaModel);
        Row(ai, "Avvio Ollama", _ollamaAutoStart);
        var ollamaPath = new FlowLayoutPanel { AutoSize = true, WrapContents = false };
        ollamaPath.Controls.AddRange(new Control[] { _ollamaExecutable, _ollamaBrowse });
        Row(ai, "Programma Ollama", ollamaPath);
        Row(ai, "Attesa avvio (secondi)", _ollamaStartupTimeout);
        Row(ai, "Modello Google", _google);
        Row(ai, "Modello Groq", _groq);
        Row(ai, "Modello OpenRouter", _router);
        Row(ai, "", Note("Lascia i modelli vuoti per usare open.env e i valori predefiniti. ScreenAI interroga Ollama per riconoscere i modelli che dichiarano la capacità vision. Programma Ollama può restare vuoto se ollama.exe è nel PATH; se è su un disco esterno, seleziona il suo percorso. L'avvio automatico vale soltanto per un indirizzo locale."));
        Row(ai, "Modalità Auto", Note("Con Risposte multiple attivo, la stessa immagine viene inviata in parallelo al numero scelto di provider diversi e le risposte vengono mostrate separatamente. Se sono disponibili meno IA, ScreenAI usa quelle verificate. Una riserva può essere contattata dopo un errore. Ollama elabora localmente; ogni servizio cloud può consumare quota o credito."));
        _provider.SelectedIndexChanged += (_, _) => UpdateProviderControls();
        _multiple.CheckedChanged += (_, _) => UpdateProviderControls();
        _ollamaEnabled.CheckedChanged += (_, _) => UpdateProviderControls();
        _ollamaAutoStart.CheckedChanged += (_, _) => UpdateProviderControls();
        _ollamaBrowse.Click += (_, _) =>
        {
            using var picker = new OpenFileDialog
            {
                Title = "Seleziona ollama.exe",
                Filter = "Ollama (ollama.exe)|ollama.exe|Programmi eseguibili (*.exe)|*.exe|Tutti i file (*.*)|*.*",
                CheckFileExists = true
            };
            if (picker.ShowDialog(this) == DialogResult.OK) _ollamaExecutable.Text = picker.FileName;
        };
        UpdateProviderControls();

        _capture.SelectedIndex = Settings.CaptureMode == "All" ? 1 : 0;
        _quality.SelectedItem = Settings.ImageDetail;
        if (_quality.SelectedIndex < 0) _quality.SelectedIndex = 0;
        _tokens.Value = Math.Clamp(Settings.MaxOutputTokens, 100, 8000);
        _show.Checked = Settings.ShowResultWindow;
        _preview.Checked = Settings.ShowImagePreview;
        _sounds.Checked = Settings.EnableSounds;
        _copy.Checked = Settings.CopyToClipboard;
        _history.Checked = Settings.SaveHistory;
        _remember.Checked = Settings.RememberPreviewPrompt;
        Row(options, "Schermo", _capture);
        Row(options, "Prima dell'invio", _preview);
        Row(options, "Invio diretto", Note("Disattivando l'anteprima, Ctrl+Alt+S, Analizza ora o il doppio clic sull'icona catturano e inviano subito lo schermo con la domanda salvata, senza conferma né oscuramento. In modalità multipla lo ricevono più IA; anche le riserve abilitate possono riceverlo. Non è una cattura continua: parte solo con questi comandi."));
        Row(options, "Risoluzione inviata", _quality);
        Row(options, "", Note("low: lato massimo 1280 px; auto: 2560 px; high: dimensioni originali. Per leggere testo piccolo usa high. L'anteprima resta a risoluzione originale."));
        Row(options, "Limite risposta (token)", _tokens);
        Row(options, "Risultato", _show);
        var soundOptions = new FlowLayoutPanel { AutoSize = true, WrapContents = false };
        var testSound = new Button { Text = "Prova suono", AutoSize = true };
        testSound.Click += (_, _) => { if (_sounds.Checked) SystemSounds.Asterisk.Play(); };
        soundOptions.Controls.AddRange(new Control[] { _sounds, testSound });
        Row(options, "Suoni ScreenAI", soundOptions);
        Row(options, "Appunti", _copy);
        Row(options, "Cronologia", _history);
        Row(options, "Domanda", _remember);
        Row(options, "Privacy", Note("Per controllare e oscurare dati sensibili lascia attiva l'anteprima. Per avere solo gli appunti, disattiva la finestra della risposta e attiva la copia automatica. Le due opzioni sono indipendenti. Disabilitare la cronologia non cancella quella già presente. Le chiavi rimangono in open.env."));
        var folder = new Button { Text = "Apri cartella impostazioni e cronologia", AutoSize = true };
        folder.Click += (_, _) =>
        {
            Directory.CreateDirectory(AppSettings.DataDirectory);
            Process.Start(new ProcessStartInfo("explorer.exe", AppSettings.DataDirectory) { UseShellExecute = true });
        };
        Row(options, "Dati locali", folder);

        UpdateUsageControls();

        _status.Text = providerStatus;
        Row(diagnostics, "Stato attuale", _status);
        var test = new Button { Text = "Verifica ora con queste impostazioni", AutoSize = true };
        Row(diagnostics, "Test", test);
        Row(diagnostics, "Chiavi", Note($"File letto: {EnvFile.DefaultPath}\nIl test rilegge il file e usa le scelte della scheda IA. Non invia lo schermo e non cambia la sessione attiva: per applicare premi Salva e applica. Dal menu dell'icona, Verifica di nuovo i provider aggiorna la sessione e rilegge open.env."));
        test.Click += async (_, _) =>
        {
            _testing = true;
            test.Enabled = _save.Enabled = false;
            _status.Text = "Verifica immagini in corso…";
            try
            {
                var draft = Settings.Clone();
                ReadProviderSettings(draft);
                using var manager = new ProviderManager(draft);
                await manager.InitializeAsync();
                _status.Text = manager.GetStatusSummary();
            }
            catch (Exception ex) { _status.Text = ex.Message; }
            finally { _testing = false; test.Enabled = _save.Enabled = true; }
        };
        FormClosing += (_, e) => { if (_testing) e.Cancel = true; };

        var buttons = new FlowLayoutPanel { Dock = DockStyle.Bottom, Height = 52,
            FlowDirection = FlowDirection.RightToLeft, Padding = new Padding(8) };
        var cancel = new Button { Text = "Annulla", DialogResult = DialogResult.Cancel, AutoSize = true };
        _save.Click += (_, _) => SaveAndClose();
        buttons.Controls.AddRange(new Control[] { cancel, _save });
        Controls.Add(tabs);
        Controls.Add(buttons);
        CancelButton = cancel;
    }

    private void RefreshPrompts()
    {
        string name = _name.Text.Trim();
        _presets.Items.Clear();
        foreach (var item in Settings.Prompts) _presets.Items.Add(item);
        _presets.Items.Add("Altro…");
        _presets.SelectedItem = Settings.Prompts.FirstOrDefault(x => x.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
    }
    private bool ValidPrompt()
    {
        if (!string.IsNullOrWhiteSpace(_prompt.Text)) return true;
        MessageBox.Show(this, "La domanda non può essere vuota.", "ScreenAI");
        return false;
    }
    private void ReadProviderSettings(AppSettings settings)
    {
        settings.Provider = _provider.SelectedItem?.ToString() ?? "Auto";
        settings.AllowFallback = _fallback.Checked;
        settings.AskMultipleProviders = settings.Provider == "Auto" && _multiple.Checked;
        settings.MultipleProviderCount = (int)_multipleCount.Value;
        settings.EnableOllama = settings.Provider == "Ollama locale" || _ollamaEnabled.Checked;
        settings.OllamaEndpoint = string.IsNullOrWhiteSpace(_ollamaEndpoint.Text)
            ? "http://127.0.0.1:11434"
            : _ollamaEndpoint.Text.Trim();
        settings.OllamaModel = _ollamaModel.Text.Trim();
        settings.AutoStartOllama = _ollamaAutoStart.Checked;
        settings.OllamaExecutablePath = _ollamaExecutable.Text.Trim().Trim('"');
        settings.OllamaStartupTimeoutSeconds = (int)_ollamaStartupTimeout.Value;
        settings.GoogleModel = _google.Text.Trim();
        settings.GroqModel = _groq.Text.Trim();
        settings.OpenRouterModel = _router.Text.Trim();
    }
    private void UpdateProviderControls()
    {
        string provider = _provider.SelectedItem?.ToString() ?? "Auto";
        bool auto = provider == "Auto";
        bool ollama = provider == "Ollama locale";
        bool ai = _useAi.Checked;
        _provider.Enabled = ai;
        _fallback.Enabled = ai && auto;
        _multiple.Enabled = ai && auto;
        _multipleCount.Enabled = ai && auto && _multiple.Checked;
        _ollamaEnabled.Enabled = ai && auto;
        if (ollama) _ollamaEnabled.Checked = true;
        _ollamaEndpoint.Enabled = ai && (ollama || (auto && _ollamaEnabled.Checked));
        _ollamaModel.Enabled = _ollamaEndpoint.Enabled;
        _ollamaAutoStart.Enabled = _ollamaEndpoint.Enabled;
        _ollamaExecutable.Enabled = _ollamaEndpoint.Enabled && _ollamaAutoStart.Checked;
        _ollamaBrowse.Enabled = _ollamaExecutable.Enabled;
        _ollamaStartupTimeout.Enabled = _ollamaExecutable.Enabled;
        _google.Enabled = ai;
        _groq.Enabled = ai;
        _router.Enabled = ai;
    }
    private void UpdateUsageControls()
    {
        bool ai = _useAi.Checked;
        _screenshotDirectory.Enabled = _saveScreenshots.Checked;
        _screenshotBrowse.Enabled = _saveScreenshots.Checked;
        _screenshotOpen.Enabled = _saveScreenshots.Checked;
        _preview.Enabled = ai;
        _quality.Enabled = ai;
        _tokens.Enabled = ai;
        _show.Enabled = ai;
        _copy.Enabled = ai;
        _history.Enabled = ai;
        _remember.Enabled = ai;
        UpdateProviderControls();
    }
    private void SaveAndClose()
    {
        if (_useAi.Checked && !ValidPrompt()) return;
        if (_useAi.Checked && !_show.Checked && !_copy.Checked && !_history.Checked)
        {
            MessageBox.Show(this, "Attiva almeno una destinazione per la risposta: finestra, appunti o cronologia.");
            return;
        }
        if (!_useAi.Checked && !_saveScreenshots.Checked)
        {
            MessageBox.Show(this, "Con l'IA disattivata devi lasciare attivo il salvataggio degli screenshot.");
            return;
        }
        if (_saveScreenshots.Checked && string.IsNullOrWhiteSpace(_screenshotDirectory.Text))
        {
            MessageBox.Show(this, "Scegli una cartella per salvare gli screenshot.");
            return;
        }
        ReadProviderSettings(Settings);
        Settings.Prompt = _prompt.Text.Trim();
        Settings.PromptName = string.IsNullOrWhiteSpace(_name.Text) ? "Personalizzata" : _name.Text.Trim();
        var active = Settings.Prompts.FirstOrDefault(x => x.Name.Equals(Settings.PromptName, StringComparison.OrdinalIgnoreCase));
        if (active is null) Settings.Prompts.Add(new PromptPreset { Name = Settings.PromptName, Text = Settings.Prompt });
        else active.Text = Settings.Prompt;
        Settings.CaptureMode = _capture.SelectedIndex == 1 ? "All" : "Current";
        Settings.ImageDetail = _quality.SelectedItem?.ToString() ?? "low";
        Settings.MaxOutputTokens = (int)_tokens.Value;
        Settings.ShowResultWindow = _show.Checked;
        Settings.ShowImagePreview = _preview.Checked;
        Settings.EnableSounds = _sounds.Checked;
        Settings.CopyToClipboard = _copy.Checked;
        Settings.SaveHistory = _history.Checked;
        Settings.RememberPreviewPrompt = _remember.Checked;
        Settings.StartWithWindows = _startWithWindows.Checked;
        Settings.EnableAiAnalysis = _useAi.Checked;
        Settings.SaveScreenshots = _saveScreenshots.Checked;
        Settings.ScreenshotDirectory = _screenshotDirectory.Text.Trim();
        DialogResult = DialogResult.OK;
        Close();
    }
    private static ComboBox Choice(params string[] items)
    {
        var box = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList };
        box.Items.AddRange(items.Cast<object>().ToArray());
        return box;
    }
    private static CheckBox Check(string text) => new() { Text = text, AutoSize = true, MaximumSize = new Size(570, 0) };
    private static Label Note(string text) => new() { Text = text, AutoSize = true, MaximumSize = new Size(570, 0), Padding = new Padding(0, 4, 0, 8) };
    private static TableLayoutPanel Page(TabControl tabs, string title)
    {
        var page = new TabPage(title) { AutoScroll = true };
        var table = new TableLayoutPanel { Dock = DockStyle.Top, AutoSize = true, Padding = new Padding(12), ColumnCount = 2, RowCount = 0 };
        table.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 170));
        table.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        page.Controls.Add(table);
        tabs.TabPages.Add(page);
        return table;
    }
    private static void Row(TableLayoutPanel table, string text, Control control)
    {
        int row = table.RowCount++;
        table.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        table.Controls.Add(new Label { Text = text, AutoSize = true, Padding = new Padding(0, 6, 0, 0) }, 0, row);
        control.Dock = DockStyle.Fill;
        table.Controls.Add(control, 1, row);
    }
}
