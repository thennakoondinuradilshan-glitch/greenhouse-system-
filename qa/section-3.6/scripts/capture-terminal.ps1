param([Parameter(Mandatory=$true)][string]$OutputPath,[string]$WindowTitle='SmartGrow Selenium Section 3.6 - Actual Test Execution')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class SmartGrowTerminalCapture {
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr window,IntPtr after,int x,int y,int width,int height,uint flags);
  public delegate bool Callback(IntPtr window, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool EnumWindows(Callback callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr window, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint currentThread,uint foregroundThread,bool attach);
  [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@
[SmartGrowTerminalCapture]::SetThreadDpiAwarenessContext([IntPtr](-4)) | Out-Null
$qaMatchingWindows = New-Object System.Collections.Generic.List[System.IntPtr]
[SmartGrowTerminalCapture]::EnumWindows({param($qaWindow,$qaParameter)
    $qaWindowText = New-Object System.Text.StringBuilder 512
    [SmartGrowTerminalCapture]::GetWindowText($qaWindow,$qaWindowText,512) | Out-Null
    if ([SmartGrowTerminalCapture]::IsWindowVisible($qaWindow) -and $qaWindowText.ToString() -eq $WindowTitle) { $qaMatchingWindows.Add($qaWindow) }
    return $true
},[IntPtr]::Zero) | Out-Null
if ($qaMatchingWindows.Count -eq 0) { throw 'The named SmartGrow results terminal is not visible.' }
$qaConsoleHandle = $qaMatchingWindows[0]
$qaDisplayBounds = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
[SmartGrowTerminalCapture]::SetWindowPos($qaConsoleHandle,[IntPtr]::Zero,10,10,([Math]::Min(1500,$qaDisplayBounds.Width-20)),([Math]::Min(900,$qaDisplayBounds.Height-20)),4) | Out-Null
if ($qaConsoleHandle -eq [IntPtr]::Zero) { throw 'No visible console window is attached; a terminal screenshot cannot be fabricated.' }
[SmartGrowTerminalCapture]::ShowWindow($qaConsoleHandle, 9) | Out-Null
[uint32]$qaForegroundPid = 0
$qaForegroundThread = [SmartGrowTerminalCapture]::GetWindowThreadProcessId([SmartGrowTerminalCapture]::GetForegroundWindow(),[ref]$qaForegroundPid)
$qaCaptureThread = [SmartGrowTerminalCapture]::GetCurrentThreadId()
if ($qaForegroundThread -ne $qaCaptureThread) { [SmartGrowTerminalCapture]::AttachThreadInput($qaCaptureThread,$qaForegroundThread,$true) | Out-Null }
[SmartGrowTerminalCapture]::SetForegroundWindow($qaConsoleHandle) | Out-Null
if ($qaForegroundThread -ne $qaCaptureThread) { [SmartGrowTerminalCapture]::AttachThreadInput($qaCaptureThread,$qaForegroundThread,$false) | Out-Null }
Start-Sleep -Milliseconds 900
if ([SmartGrowTerminalCapture]::GetForegroundWindow() -ne $qaConsoleHandle) { throw 'The terminal did not become foreground; refusing to capture another application.' }
$qaConsoleRect = New-Object SmartGrowTerminalCapture+RECT
if (-not [SmartGrowTerminalCapture]::GetWindowRect($qaConsoleHandle, [ref]$qaConsoleRect)) { throw 'Cannot read the terminal window rectangle.' }
$qaCaptureWidth = $qaConsoleRect.Right - $qaConsoleRect.Left
$qaCaptureHeight = $qaConsoleRect.Bottom - $qaConsoleRect.Top
if ($qaCaptureWidth -lt 100 -or $qaCaptureHeight -lt 100) { throw 'The console window is not visible.' }
$qaBitmap = New-Object System.Drawing.Bitmap($qaCaptureWidth, $qaCaptureHeight)
$qaGraphics = [System.Drawing.Graphics]::FromImage($qaBitmap)
try {
    $qaGraphics.CopyFromScreen($qaConsoleRect.Left,$qaConsoleRect.Top,0,0,$qaBitmap.Size)
    $qaBitmap.Save($OutputPath,[System.Drawing.Imaging.ImageFormat]::Png)
} finally { $qaGraphics.Dispose(); $qaBitmap.Dispose() }
Write-Host ('Actual terminal screenshot: ' + $OutputPath)
