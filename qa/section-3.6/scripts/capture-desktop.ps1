param([Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$qaScreenBounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
$qaDesktopImage = New-Object System.Drawing.Bitmap($qaScreenBounds.Width,$qaScreenBounds.Height)
$qaDesktopGraphics = [System.Drawing.Graphics]::FromImage($qaDesktopImage)
try {
    $qaDesktopGraphics.CopyFromScreen($qaScreenBounds.Left,$qaScreenBounds.Top,0,0,$qaDesktopImage.Size)
    $qaDesktopImage.Save($OutputPath,[System.Drawing.Imaging.ImageFormat]::Png)
} finally { $qaDesktopGraphics.Dispose(); $qaDesktopImage.Dispose() }
