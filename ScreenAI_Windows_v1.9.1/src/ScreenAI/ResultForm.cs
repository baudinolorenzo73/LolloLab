namespace ScreenAI;

internal sealed class ResultForm : Form
{
    public ResultForm(string answer, RepoAtlasExport? capture = null)
    {
        Text = "Risultato ScreenAI";
        StartPosition = FormStartPosition.CenterScreen;
        Width = 760;
        Height = 480;

        var text = new TextBox
        {
            Text = answer,
            Multiline = true,
            ReadOnly = true,
            ScrollBars = ScrollBars.Vertical,
            Dock = DockStyle.Fill,
            Font = new Font("Segoe UI", 11F)
        };

        var copy = new Button { Text = "Copia", AutoSize = true };
        copy.Click += (_, _) => Clipboard.SetText(text.Text);
        var save = new Button { Text = "Salva come TXT", AutoSize = true };
        save.Click += (_, _) =>
        {
            using var dialog = new SaveFileDialog
            {
                Filter = "File di testo (*.txt)|*.txt",
                FileName = $"ScreenAI_{DateTime.Now:yyyyMMdd_HHmmss}.txt"
            };
            if (dialog.ShowDialog() == DialogResult.OK) File.WriteAllText(dialog.FileName, text.Text);
        };
        var close = new Button { Text = "Chiudi", AutoSize = true, DialogResult = DialogResult.OK };
        var archive = new Button { Text = "Esporta per Repo Atlas", AutoSize = true, Enabled = capture is not null };
        archive.Click += (_, _) =>
        {
            if (capture is null) return;
            using var dialog = new SaveFileDialog
            {
                Filter = "Schermata per Repo Atlas (*.screenai.json)|*.screenai.json",
                FileName = $"ScreenAI_{DateTime.Now:yyyyMMdd_HHmmss}.screenai.json"
            };
            if (dialog.ShowDialog() != DialogResult.OK) return;
            try
            {
                File.WriteAllText(dialog.FileName, capture.ToJson());
                MessageBox.Show("File salvato con immagine e analisi. In Repo Atlas premi Screenshot / ScreenAI, importa questo file e scegli Archivia da valutare. Non contiene chiavi API.",
                    "Esportazione completata", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception error)
            {
                MessageBox.Show("Esportazione non riuscita: " + error.Message, "ScreenAI", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        };
        var buttons = new FlowLayoutPanel
        {
            Dock = DockStyle.Bottom,
            Height = 50,
            FlowDirection = FlowDirection.RightToLeft,
            Padding = new Padding(8)
        };
        buttons.Controls.Add(close);
        buttons.Controls.Add(save);
        buttons.Controls.Add(copy);
        buttons.Controls.Add(archive);

        Controls.Add(text);
        Controls.Add(buttons);
        AcceptButton = close;
    }
}
