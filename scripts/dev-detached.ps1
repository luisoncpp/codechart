# Launches `npm run tauri dev` in a completely detached PowerShell window
# (via WMI Win32_Process.Create when available) so it does not inherit
# Antigravity's headless ConPTY/startup state or stale WebView2 env vars.
$repoRoot = Split-Path -Parent $PSScriptRoot

Get-NetTCPConnection -LocalPort 1420 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Stop-Process -Name "codechart" -Force -ErrorAction SilentlyContinue

$innerCmd = @(
  'Remove-Item Env:WEBVIEW2_USER_DATA_FOLDER,Env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS,Env:CODECHART_WINDOW_SIZE,Env:CODECHART_STARTUP_PROJECT -ErrorAction SilentlyContinue'
  "Set-Location -LiteralPath '$repoRoot'"
  'npm run tauri dev'
) -join '; '

$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($innerCmd))
$cmdLine = "powershell.exe -NoExit -EncodedCommand $encoded"

$res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine      = $cmdLine
  CurrentDirectory = $repoRoot
} -ErrorAction SilentlyContinue

if (-not $res -or $res.ReturnValue -ne 0) {
  Start-Process powershell.exe -WorkingDirectory $repoRoot -ArgumentList "-NoExit", "-EncodedCommand", $encoded
}
