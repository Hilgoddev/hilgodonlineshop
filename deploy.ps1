# Hilgod Vercel Deployment Script
# Deploys frontend and/or backend to Vercel production.
#
# Usage:
#   .\deploy.ps1                        # deploy both
#   .\deploy.ps1 -FrontendOnly          # frontend only
#   .\deploy.ps1 -BackendOnly           # backend only
#   .\deploy.ps1 -SkipGitCheck          # skip uncommitted-changes warning
#   .\deploy.ps1 -SkipEnvCheck          # skip Vercel env presence check
#   .\deploy.ps1 -SyncEnv               # push local .env files to Vercel before deploying
#   .\deploy.ps1 -NoRestore             # do not restore .git after deploy

param(
    [switch]$SkipGitCheck  = $false,
    [switch]$FrontendOnly  = $false,
    [switch]$BackendOnly   = $false,
    [switch]$NoRestore     = $false,
    [switch]$SkipEnvCheck  = $false,
    [switch]$SyncEnv       = $false
)

$env:NO_UPDATE_NOTIFIER = "1"

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
$frontendResult = 99   # 99 = not attempted; 0 = success; other = failure
$backendResult  = 99
$gitRenamed     = $false
$backupGitName  = ".git.backup"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Write-Status {
    param([string]$Icon, [string]$Message, [string]$Color = "White")
    Write-Host "  $Icon $Message" -ForegroundColor $Color
}

function Restore-GitFolder {
    if ($gitRenamed -and -not $NoRestore -and (Test-Path $backupGitName)) {
        Write-Status "*" "Restoring .git folder from $backupGitName..." -Color "Yellow"
        try {
            Rename-Item -Path $backupGitName -NewName ".git" -ErrorAction Stop
            Write-Status "OK" ".git folder restored" -Color "Green"
        } catch {
            Write-Status "!" "Could not restore .git — rename '$backupGitName' to '.git' manually." -Color "Red"
            Write-Status "*" "Error: $($_.Exception.Message)" -Color "White"
        }
    }
}

function Read-EnvFile {
    param([string]$Path)
    $entries = @()
    if (-not (Test-Path $Path)) { return ,$entries }

    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) { continue }

        if ($trimmed -match '^(?<key>[A-Za-z0-9_]+)=(?<value>.*)$') {
            $value = $matches['value'].Trim()
            # Strip surrounding quotes
            if ($value.Length -ge 2) {
                if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                    ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
            }
            $entries += [pscustomobject]@{ Key = $matches['key']; Value = $value }
        }
    }
    return ,$entries
}

function Get-VercelEnvPolicy {
    param([string]$Key)

    $sensitiveKeys = @(
        'SUPABASE_SERVICE_ROLE_KEY',
        'PAYSTACK_SECRET_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'STRIPE_METER_KEY',
        'GREY_API_KEY',
        'GREY_WEBHOOK_SECRET',
        'RESEND_API_KEY',
        'GOOGLE_CLIENT_SECRET',
        'DATABASE_URL',
        'SUPABASE_DB_PASSWORD'
    )

    $publicKeys = @(
        'PORT',
        'FRONTEND_URL',
        'EMAIL_VERIFICATION_ENABLED',
        'SUPABASE_URL',
        'GOOGLE_CLIENT_ID',
        'NEXT_PUBLIC_STRIPE_ENABLED',
        'BANK_NAME',
        'BANK_ACCOUNT_NAME',
        'BANK_ACCOUNT_NUMBER',
        'BANK_SORT_CODE',
        'ADMIN_EMAIL',
        'EMAIL_FROM_NOREPLY',
        'EMAIL_FROM_ORDERS',
        'SUPPORT_EMAIL',
        'SUPPORT_PHONE',
        'COMPANY_WEBSITE',
        'COMPANY_NAME',
        'LOGO_URL'
    )

    if ($Key -like 'NEXT_PUBLIC_*')        { return [pscustomobject]@{ Sensitive = $false } }
    if ($sensitiveKeys -contains $Key)     { return [pscustomobject]@{ Sensitive = $true  } }
    if ($publicKeys    -contains $Key)     { return [pscustomobject]@{ Sensitive = $false } }
    return [pscustomobject]@{ Sensitive = $true }   # default: treat unknown keys as sensitive
}

function Invoke-VercelEnvAdd {
    param(
        [string]$ProjectDir,
        [string]$Key,
        [string]$Value,
        [string]$Target,
        [switch]$Sensitive
    )

    $orig = Get-Location
    Set-Location $ProjectDir
    try {
        # vercel env add reads the value from stdin — pipe it in directly.
        # --force overwrites an existing key rather than erroring.
        $sensitiveFlag = if ($Sensitive) { '--sensitive' } else { '--no-sensitive' }
        $Value | & vercel env add $Key $Target --yes --force $sensitiveFlag
        if ($LASTEXITCODE -ne 0) {
            throw "vercel env add exited with code $LASTEXITCODE"
        }
    } finally {
        Set-Location $orig
    }
}

function Sync-VercelEnvFile {
    param(
        [string]$ProjectDir,
        [string]$EnvFilePath,
        [string[]]$Targets
    )

    if (-not (Test-Path $EnvFilePath)) {
        Write-Status "!" "Env file not found: $EnvFilePath" -Color "Yellow"
        return 0
    }

    $entries = Read-EnvFile $EnvFilePath
    if (-not $entries -or $entries.Count -eq 0) {
        Write-Status "!" "No env entries found in $EnvFilePath" -Color "Yellow"
        return 0
    }

    $synced = 0
    foreach ($entry in $entries) {
        $policy = Get-VercelEnvPolicy -Key $entry.Key
        foreach ($target in $Targets) {
            try {
                Invoke-VercelEnvAdd -ProjectDir $ProjectDir -Key $entry.Key -Value $entry.Value -Target $target -Sensitive:($policy.Sensitive)
                Write-Status "OK" "$($entry.Key) -> $target" -Color "Green"
                $synced++
            } catch {
                Write-Status "!" ("Failed {0} -> {1}: {2}" -f $entry.Key, $target, $_.Exception.Message) -Color "Red"
            }
        }
    }
    return $synced
}

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HILGOD ONLINE SHOP - VERCEL DEPLOY  "  -ForegroundColor Cyan
Write-Host "        FRONTEND + BACKEND             "  -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# [1/7] Vercel CLI installed?
# ---------------------------------------------------------------------------
Write-Host "[1/7] Checking Vercel CLI..." -ForegroundColor Yellow
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Status "X" "Vercel CLI not found. Install with: npm install -g vercel" -Color "Red"
    exit 1
}
Write-Status "OK" "Vercel CLI found" -Color "Green"
Write-Host ""

# ---------------------------------------------------------------------------
# [2/7] Vercel authentication
# ---------------------------------------------------------------------------
Write-Host "[2/7] Checking Vercel authentication..." -ForegroundColor Yellow
$whoami = & vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Status "X" "Not authenticated with Vercel. Run: vercel login" -Color "Red"
    Write-Host ""
    exit 1
}
Write-Status "OK" "Authenticated as: $whoami" -Color "Green"
Write-Host ""

# Validate required directories
if (-not $BackendOnly  -and -not (Test-Path "frontend")) {
    Write-Status "X" "frontend/ directory not found" -Color "Red"; exit 1
}
if (-not $FrontendOnly -and -not (Test-Path "backend")) {
    Write-Status "X" "backend/ directory not found" -Color "Red"; exit 1
}

# ---------------------------------------------------------------------------
# [3/7] Git status
# ---------------------------------------------------------------------------
Write-Host "[3/7] Checking git status..." -ForegroundColor Yellow

if ($SkipGitCheck) {
    Write-Status "!" "Skipping (SkipGitCheck)" -Color "Yellow"
} elseif (-not (Test-Path ".git")) {
    Write-Status "!" "No .git directory found" -Color "Yellow"
} else {
    $gitStatusOutput = git status --porcelain 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Status "!" "Could not read git status" -Color "Yellow"
    } elseif ($gitStatusOutput -and $gitStatusOutput.Count -gt 0) {
        Write-Status "!" "Working directory has uncommitted changes:" -Color "Yellow"
        $gitStatusOutput | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
        Write-Host ""
        $response = Read-Host -Prompt "  Continue anyway? (Y/N)"
        if ($response -notmatch '^[Yy]') {
            Write-Status "X" "Deployment cancelled." -Color "Red"
            exit 0
        }
    } else {
        Write-Status "OK" "Working directory is clean" -Color "Green"
    }

    $currentBranch = git branch --show-current 2>$null
    if ($currentBranch -and $currentBranch -ne "main" -and $currentBranch -ne "master") {
        Write-Status "!" "On branch '$currentBranch' (not main/master)" -Color "Yellow"
    }
    $gitLog = git log --oneline -1 2>$null
    if ($gitLog) { Write-Status "*" "Latest commit: $gitLog" -Color "Cyan" }
}
Write-Host ""

# ---------------------------------------------------------------------------
# [4/7] Rename .git (Vercel Hobby plan blocks deploy when .git is present)
# ---------------------------------------------------------------------------
Write-Host "[4/7] Preparing .git folder for deployment..." -ForegroundColor Yellow

if ($SkipGitCheck) {
    Write-Status "!" "Skipping .git rename (SkipGitCheck)" -Color "Yellow"
} elseif (Test-Path ".git") {
    # Find and clean up old backup folders
    $existingBackups = @()
    if (Test-Path ".git.backup") { $existingBackups += ".git.backup" }
    $numberedBackups = Get-ChildItem -Path "." -Filter ".git.backup.*" -ErrorAction SilentlyContinue
    if ($numberedBackups) { $existingBackups += $numberedBackups.Name }

    if ($existingBackups.Count -gt 0) {
        Write-Status "!" "Found $($existingBackups.Count) existing backup(s):" -Color "Yellow"
        $existingBackups | ForEach-Object { Write-Host "     - $_" -ForegroundColor Gray }

        if ($existingBackups.Count -gt 2) {
            $sorted   = $existingBackups | Sort-Object
            $toRemove = $sorted | Select-Object -First ($sorted.Count - 2)
            Write-Status "*" "Removing $($toRemove.Count) old backup(s)..." -Color "Cyan"
            foreach ($old in $toRemove) {
                try   { Remove-Item -Path $old -Recurse -Force -ErrorAction Stop; Write-Host "     Removed: $old" -ForegroundColor Green }
                catch { Write-Host "     Warning: could not remove $old" -ForegroundColor Yellow }
            }
        }

        # Pick next backup number
        $backupNumbers = $existingBackups | ForEach-Object {
            if ($_ -eq '.git.backup')                       { 0 }
            elseif ($_ -match '\.git\.backup\.(\d+)$')     { [int]$Matches[1] }
        } | Where-Object { $null -ne $_ }

        $nextNum = 1
        if ($backupNumbers) {
            $nextNum = (($backupNumbers | Measure-Object -Maximum).Maximum) + 1
        }
        $backupGitName = ".git.backup.$nextNum"
        Write-Status "*" "Using $backupGitName for this backup" -Color "Cyan"
    }

    Write-Status "*" "Renaming .git -> $backupGitName..." -Color "Yellow"
    try {
        Rename-Item -Path ".git" -NewName $backupGitName -ErrorAction Stop
        $gitRenamed = $true
        Write-Status "OK" ".git renamed successfully" -Color "Green"
    } catch {
        Write-Status "X" "Failed to rename .git: $($_.Exception.Message)" -Color "Red"
        exit 1
    }
} else {
    Write-Status "i" "No .git folder found, skipping rename" -Color "Gray"
}
Write-Host ""

# ---------------------------------------------------------------------------
# [5/7] Vercel environment check
# ---------------------------------------------------------------------------
Write-Host "[5/7] Checking Vercel environment variables..." -ForegroundColor Yellow

if ($SkipEnvCheck) {
    Write-Status "!" "Skipping (SkipEnvCheck)" -Color "Yellow"
} else {
    function Get-VercelEnvNames($dir) {
        $names = @()
        if (-not (Test-Path $dir)) { return ,$names }
        $orig = Get-Location
        Set-Location $dir
        try {
            $lines = & vercel env ls 2>$null
            foreach ($line in $lines) {
                if ($line -match '^\s*([A-Z][A-Z0-9_]+)\s+') { $names += $Matches[1] }
            }
        } catch {}
        Set-Location $orig
        return ,$names
    }

    $frontendEnvNames = Get-VercelEnvNames "frontend"
    $backendEnvNames  = Get-VercelEnvNames "backend"

    Write-Status "*" "Frontend envs detected: $($frontendEnvNames.Count)" -Color "Gray"
    Write-Status "*" "Backend envs detected:  $($backendEnvNames.Count)"  -Color "Gray"

    # Keys that must NEVER be in the frontend project
    $mustNotBeFrontend = @(
        'SUPABASE_SERVICE_ROLE_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'PAYSTACK_SECRET_KEY',
        'RESEND_API_KEY',
        'GOOGLE_CLIENT_SECRET'
    )
    $leakedKeys = $mustNotBeFrontend | Where-Object { $frontendEnvNames -contains $_ }
    if ($leakedKeys.Count -gt 0) {
        Write-Status "!" "Sensitive keys found in frontend envs: $($leakedKeys -join ', ')" -Color "Red"
        $resp = Read-Host -Prompt "  Remove them first, or proceed anyway? (Y to proceed, N to abort)"
        if ($resp -notmatch '^[Yy]') {
            Write-Status "X" "Aborting." -Color "Red"
            Restore-GitFolder; exit 1
        }
    }

    # Required keys
    $frontendRequired = @('NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','NEXT_PUBLIC_API_URL','GOOGLE_CLIENT_ID')
    $backendRequired  = @('SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','PAYSTACK_SECRET_KEY','RESEND_API_KEY')

    $missingFrontend = $frontendRequired | Where-Object { $_ -notin $frontendEnvNames }
    $missingBackend  = $backendRequired  | Where-Object { $_ -notin $backendEnvNames  }

    if ($missingFrontend.Count -gt 0) { Write-Status "!" "Missing frontend envs: $($missingFrontend -join ', ')" -Color "Yellow" }
    if ($missingBackend.Count  -gt 0) { Write-Status "!" "Missing backend envs:  $($missingBackend  -join ', ')" -Color "Yellow" }

    if (($missingFrontend.Count -gt 0) -or ($missingBackend.Count -gt 0)) {
        $resp2 = Read-Host -Prompt "  Some required envs are missing. Deploy anyway? (Y/N)"
        if ($resp2 -notmatch '^[Yy]') {
            Write-Status "X" "Aborted." -Color "Red"
            Restore-GitFolder; exit 1
        }
    } else {
        Write-Status "OK" "All required environment variables present" -Color "Green"
    }
}
Write-Host ""

# ---------------------------------------------------------------------------
# [5b] Optional env sync (-SyncEnv flag)
# ---------------------------------------------------------------------------
if ($SyncEnv) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "     ENVIRONMENT SYNCHRONISATION      "  -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    $syncTotal = 0

    if (-not $BackendOnly -and (Test-Path "frontend")) {
        Write-Host "FRONTEND" -ForegroundColor Green
        $feFile = if (Test-Path "frontend\.env.local") { "frontend\.env.local" }
                  elseif (Test-Path "frontend\.env")   { "frontend\.env" }
                  else                                  { $null }
        if ($feFile) {
            $syncTotal += Sync-VercelEnvFile -ProjectDir "frontend" -EnvFilePath $feFile -Targets @('production','preview','development')
        } else {
            Write-Status "!" "No frontend env file found" -Color "Yellow"
        }
    }

    if (-not $FrontendOnly -and (Test-Path "backend")) {
        Write-Host ""
        Write-Host "BACKEND" -ForegroundColor Green
        $beFile = if (Test-Path "backend\.env")       { "backend\.env" }
                  elseif (Test-Path "backend\.env.local") { "backend\.env.local" }
                  else                                 { $null }
        if ($beFile) {
            $syncTotal += Sync-VercelEnvFile -ProjectDir "backend" -EnvFilePath $beFile -Targets @('production','preview','development')
        } else {
            Write-Status "!" "No backend env file found" -Color "Yellow"
        }
    }

    Write-Host ""
    Write-Status "OK" "Env sync complete — $syncTotal variable(s) pushed." -Color "Green"
    Write-Host ""
}

# ---------------------------------------------------------------------------
# [6/7] Deploy
# ---------------------------------------------------------------------------
if (-not $BackendOnly) {
    Write-Host "[6/7] Deploying Frontend..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    $orig = Get-Location
    Set-Location frontend
    Write-Status ">" "vercel --prod --yes" -Color "Cyan"
    try {
        & vercel --prod --yes
        $frontendResult = $LASTEXITCODE
    } catch {
        Write-Status "X" "Frontend deploy threw an exception: $($_.Exception.Message)" -Color "Red"
        $frontendResult = 1
    }
    Set-Location $orig
    Write-Host ""
} else {
    Write-Status "-" "Skipping frontend (BackendOnly)" -Color "Yellow"
    Write-Host ""
}

if (-not $FrontendOnly) {
    Write-Host "[6/7] Deploying Backend..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    $orig = Get-Location
    Set-Location backend
    Write-Status ">" "vercel --prod --yes" -Color "Cyan"
    try {
        & vercel --prod --yes
        $backendResult = $LASTEXITCODE
    } catch {
        Write-Status "X" "Backend deploy threw an exception: $($_.Exception.Message)" -Color "Red"
        $backendResult = 1
    }
    Set-Location $orig
    Write-Host ""
} else {
    Write-Status "-" "Skipping backend (FrontendOnly)" -Color "Yellow"
    Write-Host ""
}

# ---------------------------------------------------------------------------
# [7/7] Restore .git
# ---------------------------------------------------------------------------
Write-Host "[7/7] Restoring .git folder..." -ForegroundColor Yellow

if ($gitRenamed -and -not $NoRestore) {
    if (Test-Path $backupGitName) {
        Write-Status "*" "Renaming $backupGitName -> .git..." -Color "Yellow"
        try {
            Rename-Item -Path $backupGitName -NewName ".git" -ErrorAction Stop
            Write-Status "OK" ".git restored" -Color "Green"
        } catch {
            Write-Status "!" "Restore failed — rename '$backupGitName' to '.git' manually." -Color "Red"
            Write-Status "*" "Error: $($_.Exception.Message)" -Color "White"
        }
    } else {
        Write-Status "!" "Backup '$backupGitName' not found — cannot restore." -Color "Yellow"
    }
} elseif ($NoRestore) {
    Write-Status "!" "Skipping restore (NoRestore) — rename '$backupGitName' to '.git' manually." -Color "Yellow"
} else {
    Write-Status "i" "Nothing to restore" -Color "Gray"
}
Write-Host ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
$frontendSkipped = $BackendOnly
$backendSkipped  = $FrontendOnly
$frontendSuccess = $frontendSkipped -or ($frontendResult -eq 0)
$backendSuccess  = $backendSkipped  -or ($backendResult  -eq 0)
$overallSuccess  = $frontendSuccess -and $backendSuccess

$summaryColor = if ($overallSuccess) { "Green" } else { "Red" }
Write-Host "========================================" -ForegroundColor $summaryColor
if ($overallSuccess) {
    Write-Host "       DEPLOYMENT SUCCESSFUL!        " -ForegroundColor Green
} else {
    Write-Host "       DEPLOYMENT FAILED             " -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor $summaryColor
Write-Host ""
Write-Host "Results:" -ForegroundColor Yellow

if ($frontendSkipped) {
    Write-Status "-" "Frontend: SKIPPED (BackendOnly)" -Color "Gray"
} elseif ($frontendResult -eq 0) {
    Write-Status "OK" "Frontend: SUCCESS" -Color "Green"
} elseif ($frontendResult -eq 99) {
    Write-Status "-" "Frontend: NOT ATTEMPTED" -Color "Gray"
} else {
    Write-Status "X" "Frontend: FAILED (exit $frontendResult)" -Color "Red"
}

if ($backendSkipped) {
    Write-Status "-" "Backend: SKIPPED (FrontendOnly)" -Color "Gray"
} elseif ($backendResult -eq 0) {
    Write-Status "OK" "Backend: SUCCESS" -Color "Green"
} elseif ($backendResult -eq 99) {
    Write-Status "-" "Backend: NOT ATTEMPTED" -Color "Gray"
} else {
    Write-Status "X" "Backend: FAILED (exit $backendResult)" -Color "Red"
}
Write-Host ""

if ($overallSuccess) {
    Write-Status "*" "All done! Check Vercel dashboard and test your live site." -Color "Cyan"
} else {
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. vercel login         — re-authenticate if token expired" -ForegroundColor White
    Write-Host "  2. vercel whoami        — confirm which account is active"  -ForegroundColor White
    Write-Host "  3. Check error output above for details"                    -ForegroundColor White
    Write-Host "  4. vercel env ls        — verify env vars are set"          -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Flags:" -ForegroundColor Cyan
Write-Host "  -FrontendOnly   Deploy frontend only"            -ForegroundColor Gray
Write-Host "  -BackendOnly    Deploy backend only"             -ForegroundColor Gray
Write-Host "  -SkipGitCheck   Skip uncommitted-changes check"  -ForegroundColor Gray
Write-Host "  -SkipEnvCheck   Skip env variable check"         -ForegroundColor Gray
Write-Host "  -SyncEnv        Push local .env files to Vercel" -ForegroundColor Gray
Write-Host "  -NoRestore      Keep .git renamed after deploy"  -ForegroundColor Gray
Write-Host ""
