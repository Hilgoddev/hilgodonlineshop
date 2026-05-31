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
#   .\deploy.ps1 -EncryptEnvs           # encrypt .env files -> .env.encrypted (run once, then delete plain files)
#   .\deploy.ps1 -NoRestore             # do not restore .git after deploy
#
# Encryption:
#   .env.encrypted files use Windows DPAPI (user-account bound).
#   Only your Windows user on this machine can decrypt them.
#   Safe to commit to git. Plain .env files should NOT be committed.

param(
    [switch]$SkipGitCheck  = $false,
    [switch]$FrontendOnly  = $false,
    [switch]$BackendOnly   = $false,
    [switch]$NoRestore     = $false,
    [switch]$SkipEnvCheck  = $false,
    [switch]$SyncEnv       = $false,
    [switch]$EncryptEnvs   = $false
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
            Write-Status "!" "Could not restore .git - rename '$backupGitName' to '.git' manually." -Color "Red"
            Write-Status "*" "Error: $($_.Exception.Message)" -Color "White"
        }
    }
}

# ---------------------------------------------------------------------------
# DPAPI Encryption helpers
# ---------------------------------------------------------------------------
function Protect-EnvValue {
    param([string]$PlainText)
    # Encrypts using Windows DPAPI (current user scope).
    # Returns a hex string safe to store on disk.
    try {
        $secure    = ConvertTo-SecureString -String $PlainText -AsPlainText -Force
        $encrypted = ConvertFrom-SecureString -SecureString $secure
        return $encrypted
    } catch {
        throw "Encryption failed: $($_.Exception.Message)"
    }
}

function Unprotect-EnvValue {
    param([string]$EncryptedHex)
    # Decrypts a DPAPI-encrypted hex string back to plaintext.
    try {
        $secure = ConvertTo-SecureString -String $EncryptedHex
        $bstr   = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try {
            return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    } catch {
        throw "Decryption failed for an env entry: $($_.Exception.Message)"
    }
}

# ---------------------------------------------------------------------------
# Env file reading (plain and encrypted)
# ---------------------------------------------------------------------------
function Read-EnvFilePlain {
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

function Read-EnvFileEncrypted {
    param([string]$Path)
    $entries = @()
    if (-not (Test-Path $Path)) { return ,$entries }

    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) { continue }

        if ($trimmed -match '^(?<key>[A-Za-z0-9_]+)=(?<value>.+)$') {
            try {
                $plain   = Unprotect-EnvValue -EncryptedHex $matches['value']
                $entries += [pscustomobject]@{ Key = $matches['key']; Value = $plain }
            } catch {
                Write-Status "!" "Could not decrypt $($matches['key']) - skipping" -Color "Yellow"
            }
        }
    }
    return ,$entries
}

function Read-EnvFile {
    # Prefer .env.encrypted over plain .env files.
    # Auto-detects based on what files exist.
    param([string]$Path)
    $encPath = [System.IO.Path]::ChangeExtension($Path, $null).TrimEnd('.') + ".encrypted"
    if (Test-Path $encPath) {
        Write-Status "*" "Using encrypted env: $encPath" -Color "Cyan"
        return Read-EnvFileEncrypted -Path $encPath
    }
    return Read-EnvFilePlain -Path $Path
}

# ---------------------------------------------------------------------------
# Vercel env policy
# ---------------------------------------------------------------------------
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
        # Vercel does not allow --sensitive on the development environment
        $effectiveSensitive = $Sensitive -and ($Target -ne 'development')
        $sensitiveFlag = if ($effectiveSensitive) { '--sensitive' } else { '--no-sensitive' }
        $Value | & vercel env add $Key $Target --yes --force $sensitiveFlag | Out-Host
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
        # Check for encrypted variant
        $encPath = $EnvFilePath -replace '(\.env[^.]*?)$', '$1.encrypted'
        if (-not (Test-Path $encPath)) {
            Write-Status "!" "Env file not found: $EnvFilePath" -Color "Yellow"
            return
        }
        $entries = Read-EnvFileEncrypted -Path $encPath
    } else {
        $entries = Read-EnvFile -Path $EnvFilePath
    }

    if (-not $entries -or $entries.Count -eq 0) {
        Write-Status "!" "No env entries found" -Color "Yellow"
        return
    }

    $synced = 0
    foreach ($entry in $entries) {
        $policy = Get-VercelEnvPolicy -Key $entry.Key
        foreach ($target in $Targets) {
            try {
                Invoke-VercelEnvAdd -ProjectDir $ProjectDir -Key $entry.Key -Value $entry.Value -Target $target -Sensitive:($policy.Sensitive)
                Write-Status "OK" "$($entry.Key) -> $target" -Color "Green"
                [int]$synced++
            } catch {
                Write-Status "!" ("Failed {0} -> {1}: {2}" -f $entry.Key, $target, $_.Exception.Message) -Color "Red"
            }
        }
    }
    Write-Status "*" "$synced variable(s) pushed from $ProjectDir" -Color "Cyan"
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
# -EncryptEnvs mode: encrypt .env files and exit
# ---------------------------------------------------------------------------
if ($EncryptEnvs) {
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "       ENCRYPTING ENV FILES           "  -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Status "*" "Using Windows DPAPI (current user, this machine only)" -Color "Cyan"
    Write-Host ""

    $toEncrypt = @(
        @{ Label = "Frontend"; Plain = "frontend\.env.local"; Fallback = "frontend\.env" },
        @{ Label = "Backend";  Plain = "backend\.env";        Fallback = "backend\.env.local" }
    )

    foreach ($item in $toEncrypt) {
        $plainPath = if (Test-Path $item.Plain) { $item.Plain }
                     elseif (Test-Path $item.Fallback) { $item.Fallback }
                     else { $null }

        if (-not $plainPath) {
            Write-Status "!" "$($item.Label): no .env file found, skipping" -Color "Yellow"
            continue
        }

        $encPath = $plainPath + ".encrypted"
        Write-Host "$($item.Label): $plainPath -> $encPath" -ForegroundColor Green

        $entries = Read-EnvFilePlain -Path $plainPath
        if (-not $entries -or $entries.Count -eq 0) {
            Write-Status "!" "No entries found in $plainPath" -Color "Yellow"
            continue
        }

        $lines = @("# Hilgod encrypted env - DPAPI (Windows user-account bound)")
        $lines += "# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        $lines += "# DO NOT edit manually. Re-run .\deploy.ps1 -EncryptEnvs to regenerate."
        $lines += ""

        $ok = 0; $failed = 0
        foreach ($entry in $entries) {
            try {
                $enc     = Protect-EnvValue -PlainText $entry.Value
                $lines  += "$($entry.Key)=$enc"
                $ok++
            } catch {
                Write-Status "!" "Could not encrypt $($entry.Key): $($_.Exception.Message)" -Color "Red"
                $failed++
            }
        }

        $lines | Set-Content -Path $encPath -Encoding UTF8
        Write-Status "OK" "Wrote $ok encrypted entries to $encPath" -Color "Green"
        if ($failed -gt 0) {
            Write-Status "!" "$failed entries could not be encrypted - check manually" -Color "Yellow"
        }
        Write-Host ""
    }

    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "  ENCRYPTION COMPLETE" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Verify .env.encrypted files were created above" -ForegroundColor White
    Write-Host "  2. Delete plain .env files (they are no longer needed):" -ForegroundColor White
    Write-Host "       Remove-Item frontend\.env.local, backend\.env" -ForegroundColor Gray
    Write-Host "  3. Add to .gitignore: .env, .env.local, .env.production" -ForegroundColor White
    Write-Host "  4. Commit .env.encrypted files (safe - DPAPI-encrypted)" -ForegroundColor White
    Write-Host "  5. Deploy as normal: .\deploy.ps1 -SyncEnv" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: .env.encrypted files only decrypt on this Windows user account." -ForegroundColor Gray
    Write-Host "      To move to another machine, re-encrypt on that machine." -ForegroundColor Gray
    Write-Host ""
    exit 0
}

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
        Write-Status "!" "Continuing anyway (commit first to track what was deployed)" -Color "Yellow"
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
    # Clean up old backup folders
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

        $backupNumbers = $existingBackups | ForEach-Object {
            if ($_ -eq '.git.backup')                   { 0 }
            elseif ($_ -match '\.git\.backup\.(\d+)$') { [int]$Matches[1] }
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
        Write-Status "!" "Sensitive keys found in frontend envs: $($leakedKeys -join ', ') - review in Vercel dashboard" -Color "Yellow"
    }

    $frontendRequired = @('NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','NEXT_PUBLIC_API_URL','GOOGLE_CLIENT_ID')
    $backendRequired  = @('SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','PAYSTACK_SECRET_KEY','RESEND_API_KEY')

    $missingFrontend = $frontendRequired | Where-Object { $_ -notin $frontendEnvNames }
    $missingBackend  = $backendRequired  | Where-Object { $_ -notin $backendEnvNames  }

    if ($missingFrontend.Count -gt 0) { Write-Status "!" "Missing frontend envs: $($missingFrontend -join ', ')" -Color "Yellow" }
    if ($missingBackend.Count  -gt 0) { Write-Status "!" "Missing backend envs:  $($missingBackend  -join ', ')" -Color "Yellow" }

    if (($missingFrontend.Count -gt 0) -or ($missingBackend.Count -gt 0)) {
        Write-Status "!" "Continuing despite missing envs - add them in Vercel dashboard if needed" -Color "Yellow"
    } else {
        Write-Status "OK" "All required environment variables present" -Color "Green"
    }
}
Write-Host ""

# ---------------------------------------------------------------------------
# [5b] Optional env sync (-SyncEnv)
# ---------------------------------------------------------------------------
if ($SyncEnv) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "     ENVIRONMENT SYNCHRONISATION      "  -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    if (-not $BackendOnly -and (Test-Path "frontend")) {
        Write-Host "FRONTEND" -ForegroundColor Green
        $feFile = if (Test-Path "frontend\.env.local.encrypted") { "frontend\.env.local" }
                  elseif (Test-Path "frontend\.env.encrypted")   { "frontend\.env" }
                  elseif (Test-Path "frontend\.env.local")       { "frontend\.env.local" }
                  elseif (Test-Path "frontend\.env")             { "frontend\.env" }
                  else                                            { $null }
        if ($feFile) {
            Sync-VercelEnvFile -ProjectDir "frontend" -EnvFilePath $feFile -Targets @('production','preview','development')
        } else {
            Write-Status "!" "No frontend env file found (checked .env.local.encrypted, .env.encrypted, .env.local, .env)" -Color "Yellow"
        }
    }

    if (-not $FrontendOnly -and (Test-Path "backend")) {
        Write-Host ""
        Write-Host "BACKEND" -ForegroundColor Green
        $beFile = if (Test-Path "backend\.env.encrypted")        { "backend\.env" }
                  elseif (Test-Path "backend\.env.local.encrypted") { "backend\.env.local" }
                  elseif (Test-Path "backend\.env")              { "backend\.env" }
                  elseif (Test-Path "backend\.env.local")        { "backend\.env.local" }
                  else                                            { $null }
        if ($beFile) {
            Sync-VercelEnvFile -ProjectDir "backend" -EnvFilePath $beFile -Targets @('production','preview','development')
        } else {
            Write-Status "!" "No backend env file found (checked .env.encrypted, .env, .env.local)" -Color "Yellow"
        }
    }

    Write-Host ""
    Write-Status "OK" "Env sync complete." -Color "Green"
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
            Write-Status "!" "Restore failed - rename '$backupGitName' to '.git' manually." -Color "Red"
            Write-Status "*" "Error: $($_.Exception.Message)" -Color "White"
        }
    } else {
        Write-Status "!" "Backup '$backupGitName' not found - cannot restore." -Color "Yellow"
    }
} elseif ($NoRestore) {
    Write-Status "!" "Skipping restore (NoRestore) - rename '$backupGitName' to '.git' manually." -Color "Yellow"
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
    Write-Host "  1. vercel login          - re-authenticate if token expired"    -ForegroundColor White
    Write-Host "  2. vercel whoami         - confirm which account is active"     -ForegroundColor White
    Write-Host "  3. Check error output above for details"                        -ForegroundColor White
    Write-Host "  4. vercel env ls         - verify env vars are set"             -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Flags:" -ForegroundColor Cyan
Write-Host "  -FrontendOnly    Deploy frontend only"                   -ForegroundColor Gray
Write-Host "  -BackendOnly     Deploy backend only"                    -ForegroundColor Gray
Write-Host "  -SkipGitCheck    Skip uncommitted-changes check"         -ForegroundColor Gray
Write-Host "  -SkipEnvCheck    Skip env variable check"                -ForegroundColor Gray
Write-Host "  -SyncEnv         Push local .env files to Vercel"        -ForegroundColor Gray
Write-Host "  -EncryptEnvs     Encrypt .env files -> .env.encrypted"   -ForegroundColor Gray
Write-Host "  -NoRestore       Keep .git renamed after deploy"         -ForegroundColor Gray
Write-Host ""
