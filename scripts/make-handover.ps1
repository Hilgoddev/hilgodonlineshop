<#
  make-handover.ps1 — produce a clean, shareable copy of the project for client handover.

  WHAT IT DOES (non-destructive — your working repo is never modified):
    1. Exports only git-tracked files via `git archive` (so .env, node_modules, .next,
       and anything git-ignored are excluded automatically — they were never committed).
    2. Prunes a small list of internal/dev-only files (audit notes, probe/diagnostic
       scripts, this script itself).
    3. Adds HANDOVER.md (client setup guide) if present.
    4. Runs a SECRET SAFETY SCAN and aborts if a real secret or .env slips in.
    5. Zips the result into your Downloads folder.

  USAGE (from the repo root):
    powershell -ExecutionPolicy Bypass -File scripts\make-handover.ps1

  The original repository, its history, and your .env files are left completely untouched.
#>

$ErrorActionPreference = 'Stop'

# --- Resolve repo root (the parent of this script's folder) ---
$repoRoot = (git rev-parse --show-toplevel) 2>$null
if (-not $repoRoot) { throw "Not inside a git repository. Run this from the project folder." }
Set-Location $repoRoot

$stamp   = Get-Date -Format 'yyyyMMdd-HHmmss'
$name    = "hilgod-handover-$stamp"
$staging = Join-Path $env:TEMP $name
$zipPath = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\$name.zip"

# Internal/dev-only files to leave OUT of the client copy (kept in your repo).
$prune = @(
  'AUDIT_REPORT.md',
  'HANDOVER_AUDIT.md',
  'scripts/make-handover.ps1',
  'scripts/checkSellerMetrics.js'
)
# Whole folders of dev probes (optional — comment out to include them).
$prunePatterns = @('backend/scripts/*probe*.js')

Write-Host "Repo:    $repoRoot"
Write-Host "Staging: $staging"
Write-Host "Output:  $zipPath`n"

if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Path $staging | Out-Null

# --- 1. Export tracked files at HEAD into staging ---
# `git archive` emits a tar of exactly the committed tree; we pipe it through tar to extract.
Write-Host "Exporting tracked files (git archive HEAD)..."
git archive --format=tar HEAD | tar -x -C $staging
if ($LASTEXITCODE -ne 0) { throw "git archive failed." }

# --- 2. Prune internal/dev-only files ---
foreach ($p in $prune) {
  $full = Join-Path $staging $p
  if (Test-Path $full) { Remove-Item -Force $full; Write-Host "  pruned: $p" }
}
foreach ($pat in $prunePatterns) {
  Get-ChildItem -Path $staging -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName.Replace('\','/') -like "*$($pat.Replace('\','/'))" } |
    ForEach-Object { Remove-Item -Force $_.FullName; Write-Host "  pruned: $($_.Name)" }
}

# --- 3. Safety scan: no .env (other than .example) and no real secret values ---
Write-Host "`nRunning secret safety scan..."
$envLeaks = Get-ChildItem -Path $staging -Recurse -Force -File |
  Where-Object { $_.Name -match '^\.env' -and $_.Name -notmatch '\.example$' }
if ($envLeaks) {
  $envLeaks | ForEach-Object { Write-Host "  LEAK: $($_.FullName)" -ForegroundColor Red }
  throw "Aborting: a real .env file would be shipped. Investigate before sharing."
}

# Flag full-length live keys / service-role JWTs (truncated fragments & placeholders are ok).
$secretRegex = 'sk_(live|test)_[0-9A-Za-z]{20,}|re_[0-9A-Za-z]{20,}|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}'
$secretHits = Get-ChildItem -Path $staging -Recurse -File -Include *.js,*.ts,*.json,*.md,*.env* -ErrorAction SilentlyContinue |
  Select-String -Pattern $secretRegex -ErrorAction SilentlyContinue |
  Where-Object { $_.Line -notmatch 'your-|xxxx|placeholder|example|redacted' }
if ($secretHits) {
  $secretHits | ForEach-Object { Write-Host "  POSSIBLE SECRET: $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
  throw "Aborting: a possible real secret was found in the export. Investigate before sharing."
}
Write-Host "  clean — no .env files, no full secret keys." -ForegroundColor Green

# --- 4. Zip it ---
Write-Host "`nZipping..."
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath
$fileCount = (Get-ChildItem -Path $staging -Recurse -File).Count
$sizeMB    = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)

Remove-Item -Recurse -Force $staging

Write-Host "`n=== Handover package ready ===" -ForegroundColor Cyan
Write-Host "  Files: $fileCount"
Write-Host "  Size:  $sizeMB MB"
Write-Host "  Path:  $zipPath"
Write-Host "`nThe client unzips, runs 'npm install' in backend/ and frontend/, adds their own"
Write-Host ".env values (see HANDOVER.md), applies the migrations, and runs the app."
