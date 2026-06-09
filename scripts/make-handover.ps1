<#
  make-handover.ps1 - produce a clean, shareable copy of the project for client handover.

  WHAT IT DOES (non-destructive - your working repo is never modified):
    1. Exports only git-tracked files via `git archive` (so .env, node_modules, .next,
       and anything git-ignored are excluded automatically - they were never committed).
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

# --- Resolve repo root (top level of the git repo) ---
$repoRoot = (git rev-parse --show-toplevel) 2>$null
if (-not $repoRoot) { throw "Not inside a git repository. Run this from the project folder." }
Set-Location $repoRoot

$stamp   = Get-Date -Format 'yyyyMMdd-HHmmss'
$name    = "hilgod-handover-$stamp"
# Output goes to a 'handover/' directory in the repo root (git-ignored).
$outRoot = Join-Path $repoRoot 'handover'
$staging = Join-Path $outRoot $name          # the clean, browsable copy
$zipPath = Join-Path $outRoot "$name.zip"     # a zip of that copy

# Client-facing docs to KEEP. Every other top-level *.md and everything in Docs/
# (except these) is treated as internal and removed from the handover copy.
$keepDocs = @(
  'README.md',
  'HANDOVER.md',
  'AUDIT_REPORT.md',
  'Docs/PROJECT_STRUCTURE.md'
)
# Internal/dev-only files to leave OUT of the client copy (kept in your repo).
$prune = @(
  'scripts/make-handover.ps1',
  'scripts/checkSellerMetrics.js',
  'skills-lock.json',
  'implementation_plan UI and Sellerstore fix'
)
# Internal/dev-only folders to remove entirely.
$pruneDirs = @('skills')
# Filename globs removed recursively (internal Word reports, etc.).
$pruneGlobs = @('*.docx')
# Path-suffix patterns (dev probe scripts).
$prunePatterns = @('backend/scripts/*probe*.js')

Write-Host "Repo:    $repoRoot"
Write-Host "Staging: $staging"
Write-Host "Output:  $zipPath"
Write-Host ""

if (-not (Test-Path $outRoot)) { New-Item -ItemType Directory -Path $outRoot | Out-Null }
if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Path $staging | Out-Null
# Canonicalize the path so later full-path comparisons against Get-ChildItem match.
$staging = (Resolve-Path -LiteralPath $staging).Path

# --- 1. Export tracked files at HEAD into staging ---
# Write the tar to a file first (PowerShell pipes corrupt binary streams), then extract.
Write-Host "Exporting tracked files (git archive HEAD)..."
$tarFile = Join-Path $env:TEMP "$name.tar"
git archive --format=tar -o $tarFile HEAD
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tarFile)) { throw "git archive failed." }
tar -x -f $tarFile -C $staging
if ($LASTEXITCODE -ne 0) { throw "tar extract failed." }
Remove-Item -Force $tarFile

# --- 2a. Keep only client-facing docs (drop internal notes) ---
$keepFull = $keepDocs | ForEach-Object { (Join-Path $staging ($_.Replace('/','\'))) }
# Root-level *.md not in the keep list.
Get-ChildItem -Path $staging -File -Filter *.md -ErrorAction SilentlyContinue | ForEach-Object {
  if ($keepFull -notcontains $_.FullName) { Remove-Item -Force $_.FullName; Write-Host "  pruned doc: $($_.Name)" }
}
# Everything in Docs/ except whitelisted files, then drop emptied subfolders.
$docsDir = Join-Path $staging 'Docs'
if (Test-Path $docsDir) {
  Get-ChildItem -Path $docsDir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
    if ($keepFull -notcontains $_.FullName) { Remove-Item -Force $_.FullName }
  }
  Get-ChildItem -Path $docsDir -Recurse -Directory -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Where-Object { -not (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue) } |
    Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
  Write-Host "  pruned Docs/ (kept only whitelisted docs)"
}

# --- 2b. Prune internal/dev-only & AI-tooling files, folders and globs ---
foreach ($p in $prune) {
  $full = Join-Path $staging $p
  if (Test-Path $full) { Remove-Item -Force $full; Write-Host "  pruned file: $p" }
}
foreach ($d in $pruneDirs) {
  $full = Join-Path $staging $d
  if (Test-Path $full) { Remove-Item -Recurse -Force $full; Write-Host "  pruned dir:  $d/" }
}
foreach ($g in $pruneGlobs) {
  Get-ChildItem -Path $staging -Recurse -File -Filter $g -ErrorAction SilentlyContinue |
    ForEach-Object { Remove-Item -Force $_.FullName; Write-Host "  pruned: $($_.Name)" }
}
foreach ($pat in $prunePatterns) {
  $needle = $pat.Replace('\','/')
  Get-ChildItem -Path $staging -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName.Replace('\','/') -like "*$needle" } |
    ForEach-Object { Remove-Item -Force $_.FullName; Write-Host "  pruned: $($_.Name)" }
}

# --- 3. Safety scan: no .env (other than .example) and no real secret values ---
Write-Host ""
Write-Host "Running secret safety scan..."
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
Write-Host "  clean - no .env files, no full secret keys." -ForegroundColor Green

# --- 4. Zip it ---
Write-Host ""
Write-Host "Zipping..."
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath
$fileCount = (Get-ChildItem -Path $staging -Recurse -File).Count
$sizeMB    = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)

# Keep the extracted copy (the client may prefer a folder over a zip).
Write-Host ""
Write-Host "=== Handover package ready ===" -ForegroundColor Cyan
Write-Host "  Files:  $fileCount"
Write-Host "  Zip:    $sizeMB MB"
Write-Host "  Folder: $staging"
Write-Host "  Zip:    $zipPath"
Write-Host ""
Write-Host "The client unzips (or copies the folder), runs 'npm install' in backend/ and"
Write-Host "frontend/, adds their own .env values (see HANDOVER.md), applies the migrations,"
Write-Host "and runs the app."
