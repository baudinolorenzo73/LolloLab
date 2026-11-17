namespace ScreenAI;

internal sealed class HistoryForm : Form
{
    public HistoryForm(IReadOnlyList<HistoryItem> items)
    {
        Text = "Cronologia ScreenAI";
        StartPosition = FormStartPosition.CenterScreen;
        Width = 900;
        Height = 560;

        var list = new ListBox { Dock = DockStyle.Left, Width = 300 };
        var answer = new TextBox
        {
            Dock = DockStyle.Fill,
            Multiline = true,
            ReadOnly = true,
            ScrollBars = ScrollBars.Vertical,
            Font = new Font("Segoe UI", 10F)
        };

        foreach (var item in items)
            list.Items.Add(new HistoryDisplay(item));

        list.SelectedIndexChanged += (_, _) =>
        {
            if (list.SelectedItem is HistoryDisplay selected)
                answer.Text = $"{selected.Item.Timestamp:G} — {selected.Item.Provider} · {selected.Item.Model}{Environment.NewLine}{Environment.NewLine}" +
                              $"Richiesta: {selected.Item.Prompt}{Environment.NewLine}{Environment.NewLine}{selected.Item.Answer}";
        };
        if (list.Items.Count > 0) list.SelectedIndex = 0;

        var copy = new Button { Text = "Copia risposta", AutoSize = true };
        copy.Click += (_, _) =>
        {
            if (list.SelectedItem is HistoryDisplay selected) Clipboard.SetText(selected.Item.Answer);
        };
        var close = new Button { Text = "Chiudi", AutoSize = true, DialogResult = DialogResult.OK };
        var buttons = new FlowLayoutPanel
        {
            Dock = DockStyle.Bottom,
            Height = 50,
            FlowDirection = FlowDirection.RightToLeft,
            Padding = new Padding(8)
        };
        buttons.Controls.Add(close);
        buttons.Controls.Add(copy);

        Controls.Add(answer);
        Controls.Add(list);
        Controls.Add(buttons);
    }

    private sealed record HistoryDisplay(HistoryItem Item)
    {
        public override string ToString() => $"{Item.Timestamp:g} — {Item.Provider} · {Item.Model}";
    }
}
