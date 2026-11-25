$ErrorActionPreference = 'Stop'
$qaSectionDirectory = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $qaSectionDirectory
$Host.UI.RawUI.WindowTitle = 'SmartGrow Selenium Section 3.6 - Actual Test Execution'
try {
    $qaConsoleBuffer = $Host.UI.RawUI.BufferSize
    $qaConsoleBuffer.Width = 130
    $qaConsoleBuffer.Height = 3000
    $Host.UI.RawUI.BufferSize = $qaConsoleBuffer
    $qaConsoleWindow = $Host.UI.RawUI.WindowSize
    $qaConsoleWindow.Width = 125
    $qaConsoleWindow.Height = 40
    $Host.UI.RawUI.WindowSize = $qaConsoleWindow
} catch { Write-Host 'Using the available terminal dimensions.' }
Write-Host 'SmartGrow OS - EC4206 Section 3.6 - Headed Selenium'
Write-Host 'The real frontend, backend, and separate local test database will start automatically.'
node tests/run-selenium.cjs
$qaTestExitCode = $LASTEXITCODE
$qaEvidenceDirectory = (Get-Content -LiteralPath '.runtime\latest-evidence.txt' -Raw).Trim()
$qaResultsWindowTitle = 'SmartGrow Selenium Section 3.6 - Results ' + (Split-Path $qaEvidenceDirectory -Leaf)
$Host.UI.RawUI.WindowTitle = $qaResultsWindowTitle
Write-Host ''
Write-Host ('Selenium process exit code: ' + $qaTestExitCode)
Write-Host 'Final PASS/FAIL rows above are the actual output of this execution.'
try {
    & (Join-Path $PSScriptRoot 'capture-terminal.ps1') -OutputPath (Join-Path $qaEvidenceDirectory 'terminal-results.png') -WindowTitle $qaResultsWindowTitle
} catch {
    $_.Exception.Message | Set-Content -LiteralPath (Join-Path $qaEvidenceDirectory 'terminal-capture-error.txt')
    Write-Host ('Terminal screenshot unavailable: ' + $_.Exception.Message)
}
@{ExitCode=$qaTestExitCode;FinishedAt=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json |
    Set-Content -LiteralPath (Join-Path $qaEvidenceDirectory 'headed-run-complete.json') -Encoding UTF8
Write-Host 'Evidence collection finished. This terminal can be closed.'
