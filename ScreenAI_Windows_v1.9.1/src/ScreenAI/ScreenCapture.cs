using System.Drawing.Imaging;

namespace ScreenAI;

internal static class ScreenCapture
{
    public static Bitmap Capture(bool allScreens)
    {
        Rectangle bounds = allScreens
            ? SystemInformation.VirtualScreen
            : Screen.FromPoint(Cursor.Position).Bounds;

        if (bounds.Width <= 0 || bounds.Height <= 0)
            throw new InvalidOperationException("Dimensioni dello schermo non valide.");

        var bitmap = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format24bppRgb);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.CopyFromScreen(bounds.Left, bounds.Top, 0, 0, bounds.Size, CopyPixelOperation.SourceCopy);
        return bitmap;
    }

    public static string ToJpegDataUrl(Image image, long quality = 72L)
    {
        using var stream = new MemoryStream();
        var encoder = ImageCodecInfo.GetImageEncoders().First(x => x.FormatID == ImageFormat.Jpeg.Guid);
        using var parameters = new EncoderParameters(1);
        using var qualityParameter = new EncoderParameter(Encoder.Quality, quality);
        parameters.Param[0] = qualityParameter;
        image.Save(stream, encoder, parameters);
        return "data:image/jpeg;base64," + Convert.ToBase64String(stream.ToArray());
    }

    public static string ToAnalysisDataUrl(Image image, string quality)
    {
        int limit = quality == "low" ? 1280 : quality == "auto" ? 2560 : int.MaxValue;
        int side = Math.Max(image.Width, image.Height);
        if (side <= limit) return ToJpegDataUrl(image, quality == "low" ? 75L : 92L);
        double scale = (double)limit / side;
        using var resized = new Bitmap(Math.Max(1, (int)Math.Round(image.Width * scale)),
            Math.Max(1, (int)Math.Round(image.Height * scale)));
        using (var graphics = Graphics.FromImage(resized))
        {
            graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
            graphics.DrawImage(image, new Rectangle(0, 0, resized.Width, resized.Height));
        }
        return ToJpegDataUrl(resized, quality == "low" ? 75L : 92L);
    }

    public static string CreateProbeDataUrl()
    {
        using var bitmap = new Bitmap(32, 32, PixelFormat.Format24bppRgb);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.Clear(Color.White);
        graphics.FillRectangle(Brushes.ForestGreen, 8, 8, 16, 16);
        return ToJpegDataUrl(bitmap, 60L);
    }

    public static string SavePng(Image image, string directory, DateTime capturedAt)
    {
        if (string.IsNullOrWhiteSpace(directory))
            throw new InvalidOperationException("Scegli una cartella per salvare gli screenshot.");

        string targetDirectory = Path.GetFullPath(Environment.ExpandEnvironmentVariables(directory.Trim()));
        Directory.CreateDirectory(targetDirectory);
        string baseName = $"ScreenAI_{capturedAt:yyyy-MM-dd_HH-mm-ss-fff}";

        for (int suffix = 0; suffix < 1000; suffix++)
        {
            string name = suffix == 0 ? baseName + ".png" : $"{baseName}_{suffix}.png";
            string path = Path.Combine(targetDirectory, name);
            try
            {
                using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.Read);
                image.Save(stream, ImageFormat.Png);
                return path;
            }
            catch (IOException) when (File.Exists(path))
            {
                // Un secondo scatto nello stesso millisecondo riceve un suffisso progressivo.
            }
        }

        throw new IOException("Impossibile creare un nome univoco per lo screenshot.");
    }
}
