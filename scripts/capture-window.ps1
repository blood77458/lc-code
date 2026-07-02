param(
  [string]$OutputDir = "f:\project\lc_code\docs\demo\screenshots",
  [string]$WindowTitlePattern = "*LC Code*"
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
Add-Type -AssemblyName System.Windows.Forms, System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NativeRect {
  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left; public int Top; public int Right; public int Bottom;
  }
}
"@

$process = Get-Process |
  Where-Object { $_.MainWindowTitle -like $WindowTitlePattern -and $_.MainWindowHandle -ne 0 } |
  Select-Object -First 1

if ($process) {
  $rect = New-Object NativeRect+RECT
  [void][NativeRect]::GetWindowRect($process.MainWindowHandle, [ref]$rect)
  $width = $rect.Right - $rect.Left
  $height = $rect.Bottom - $rect.Top
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size($width, $height)))
  $path = Join-Path $OutputDir "lc-code-window.png"
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "CAPTURED_WINDOW:$path"
  exit 0
}

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$path = Join-Path $OutputDir "fullscreen-fallback.png"
$bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "CAPTURED_FULLSCREEN:$path"
