# concat-bundle.ps1 — Concatenates source files into a single bundle
# Usage:
#   First call (overwrite):  .\concat-bundle.ps1 -Output bundle.txt -- src/foo.ts src/bar.ts
#   Append more:             .\concat-bundle.ps1 -Append -Output bundle.txt -- src/baz.ts

param(
    [switch]$Append,

    [Parameter(Mandatory=$true)]
    [string]$Output,

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Sources
)

$mode = if ($Append) { 'Append' } else { 'Overwrite' }

$sb = [System.Text.StringBuilder]::new()

foreach ($src in $Sources) {
    if (-not (Test-Path -LiteralPath $src)) {
        Write-Error "File not found: $src"
        exit 1
    }
    $content = Get-Content -LiteralPath $src -Raw -Encoding UTF8
    [void]$sb.AppendLine("--- BEGIN FILE: $src ---")
    [void]$sb.Append($content)
    if (-not $content.EndsWith("`n")) {
        [void]$sb.AppendLine()
    }
    [void]$sb.AppendLine("--- END FILE: $src ---")
    [void]$sb.AppendLine()
}

$parent = Split-Path -Parent $Output
if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

if ($Append -and (Test-Path -LiteralPath $Output)) {
    # Ensure trailing newline before appending
    $existing = Get-Content -LiteralPath $Output -Raw -Encoding UTF8
    if ($existing -and -not $existing.EndsWith("`n")) {
        [void]$sb.Insert(0, "`n")
    }
    Add-Content -LiteralPath $Output -Value $sb.ToString() -Encoding UTF8 -NoNewline
} else {
    Set-Content -LiteralPath $Output -Value $sb.ToString() -Encoding UTF8 -NoNewline
}

Write-Host "Bundle $($mode.ToLower()): $Output ($($Sources.Count) files)"
