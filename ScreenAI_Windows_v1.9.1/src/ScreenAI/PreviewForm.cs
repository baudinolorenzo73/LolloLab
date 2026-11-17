namespace ScreenAI;

internal sealed class PreviewForm : Form
{
    private readonly Bitmap _source;
    private readonly PictureBox _picture = new();
    private readonly TextBox _prompt = new();
    private readonly List<Rectangle> _redactions = new();
    private Point? _dragStart;
    private Rectangle _currentDrag;

    public Bitmap? ProcessedImage { get; private set; }
    public string PromptText => _prompt.Text.Trim();

    public PreviewForm(Image source, string prompt, string destination)
    {
        _source = new Bitmap(source);
        Text = "Anteprima privata - ScreenAI";
        StartPosition = FormStartPosition.CenterScreen;
        Width = 1100;
        Height = 760;
        MinimumSize = new Size(760, 520);

        var info = new Label
        {
            Text = $"Destinazione: {destination}\nTrascina sull'immagine per oscurare dati sensibili, poi premi Invia.",
            Dock = DockStyle.Top,
            Height = 66,
            Padding = new Padding(8),
            AutoEllipsis = true
        };

        _prompt.Multiline = true;
        _prompt.Text = prompt;
        _prompt.Dock = DockStyle.Bottom;
        _prompt.Height = 72;
        _prompt.ScrollBars = ScrollBars.Vertical;

        _picture.Dock = DockStyle.Fill;
        _picture.Image = _source;
        _picture.SizeMode = PictureBoxSizeMode.Zoom;
        _picture.BackColor = Color.FromArgb(32, 32, 32);
        _picture.Cursor = Cursors.Cross;
        _picture.Paint += PicturePaint;
        _picture.MouseDown += PictureMouseDown;
        _picture.MouseMove += PictureMouseMove;
        _picture.MouseUp += PictureMouseUp;

        var undo = new Button { Text = "Annulla ultimo oscuramento", AutoSize = true };
        undo.Click += (_, _) =>
        {
            if (_redactions.Count > 0) _redactions.RemoveAt(_redactions.Count - 1);
            _picture.Invalidate();
        };

        var send = new Button { Text = "Invia all'IA", AutoSize = true, DialogResult = DialogResult.None };
        send.Click += (_, _) => AcceptImage();
        var cancel = new Button { Text = "Annulla", AutoSize = true, DialogResult = DialogResult.Cancel };

        var buttons = new FlowLayoutPanel
        {
            Dock = DockStyle.Bottom,
            Height = 46,
            FlowDirection = FlowDirection.RightToLeft,
            Padding = new Padding(6)
        };
        buttons.Controls.Add(cancel);
        buttons.Controls.Add(send);
        buttons.Controls.Add(undo);

        Controls.Add(_picture);
        Controls.Add(_prompt);
        Controls.Add(buttons);
        Controls.Add(info);
        CancelButton = cancel;
    }

    private Rectangle ImageDisplayRectangle()
    {
        double imageRatio = (double)_source.Width / _source.Height;
        double boxRatio = (double)_picture.ClientSize.Width / _picture.ClientSize.Height;
        int width, height, x, y;

        if (boxRatio > imageRatio)
        {
            height = _picture.ClientSize.Height;
            width = (int)Math.Round(height * imageRatio);
            x = (_picture.ClientSize.Width - width) / 2;
            y = 0;
        }
        else
        {
            width = _picture.ClientSize.Width;
            height = (int)Math.Round(width / imageRatio);
            x = 0;
            y = (_picture.ClientSize.Height - height) / 2;
        }
        return new Rectangle(x, y, Math.Max(1, width), Math.Max(1, height));
    }

    private void PictureMouseDown(object? sender, MouseEventArgs e)
    {
        if (e.Button == MouseButtons.Left && ImageDisplayRectangle().Contains(e.Location))
        {
            _dragStart = e.Location;
            _currentDrag = Rectangle.Empty;
        }
    }

    private void PictureMouseMove(object? sender, MouseEventArgs e)
    {
        if (_dragStart is null) return;
        var display = ImageDisplayRectangle();
        var end = new Point(Math.Clamp(e.X, display.Left, display.Right), Math.Clamp(e.Y, display.Top, display.Bottom));
        _currentDrag = Normalize(_dragStart.Value, end);
        _picture.Invalidate();
    }

    private void PictureMouseUp(object? sender, MouseEventArgs e)
    {
        if (_dragStart is null) return;
        if (_currentDrag.Width > 4 && _currentDrag.Height > 4)
            _redactions.Add(DisplayToImage(_currentDrag));
        _dragStart = null;
        _currentDrag = Rectangle.Empty;
        _picture.Invalidate();
    }

    private void PicturePaint(object? sender, PaintEventArgs e)
    {
        using var fill = new SolidBrush(Color.FromArgb(190, Color.Black));
        using var border = new Pen(Color.OrangeRed, 2);
        foreach (var item in _redactions)
        {
            var display = ImageToDisplay(item);
            e.Graphics.FillRectangle(fill, display);
            e.Graphics.DrawRectangle(border, display);
        }
        if (!_currentDrag.IsEmpty)
        {
            e.Graphics.FillRectangle(fill, _currentDrag);
            e.Graphics.DrawRectangle(border, _currentDrag);
        }
    }

    private Rectangle DisplayToImage(Rectangle rectangle)
    {
        var display = ImageDisplayRectangle();
        double sx = (double)_source.Width / display.Width;
        double sy = (double)_source.Height / display.Height;
        return Rectangle.FromLTRB(
            Math.Clamp((int)Math.Round((rectangle.Left - display.Left) * sx), 0, _source.Width),
            Math.Clamp((int)Math.Round((rectangle.Top - display.Top) * sy), 0, _source.Height),
            Math.Clamp((int)Math.Round((rectangle.Right - display.Left) * sx), 0, _source.Width),
            Math.Clamp((int)Math.Round((rectangle.Bottom - display.Top) * sy), 0, _source.Height));
    }

    private Rectangle ImageToDisplay(Rectangle rectangle)
    {
        var display = ImageDisplayRectangle();
        double sx = (double)display.Width / _source.Width;
        double sy = (double)display.Height / _source.Height;
        return Rectangle.FromLTRB(
            display.Left + (int)Math.Round(rectangle.Left * sx),
            display.Top + (int)Math.Round(rectangle.Top * sy),
            display.Left + (int)Math.Round(rectangle.Right * sx),
            display.Top + (int)Math.Round(rectangle.Bottom * sy));
    }

    private void AcceptImage()
    {
        if (string.IsNullOrWhiteSpace(PromptText))
        {
            MessageBox.Show("Inserisci una richiesta per l'analisi.", "ScreenAI",
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        ProcessedImage = new Bitmap(_source);
        using (var graphics = Graphics.FromImage(ProcessedImage))
            foreach (var rectangle in _redactions) graphics.FillRectangle(Brushes.Black, rectangle);

        DialogResult = DialogResult.OK;
        Close();
    }

    private static Rectangle Normalize(Point a, Point b) => Rectangle.FromLTRB(
        Math.Min(a.X, b.X), Math.Min(a.Y, b.Y), Math.Max(a.X, b.X), Math.Max(a.Y, b.Y));

    protected override void Dispose(bool disposing)
    {
        if (disposing) _source.Dispose();
        base.Dispose(disposing);
    }
}
