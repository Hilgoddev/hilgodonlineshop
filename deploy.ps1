# Hilgod Vercel Deployment Script (Enhanced)
# This script automates the Vercel deployment process for both frontend and backend
# by checking git status, handling existing backups, and temporarily renaming the .git folder

param(
    [switch]$SkipGitCheck = $false,
    [switch]$FrontendOnly = $false,
    [switch]$BackendOnly = $false,
    [switch]$NoRestore = $false,
    [switch]$SkipEnvCheck = $false,
    [switch]$SyncEnv = $false
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HILGOD ONLINE SHOP - VERCEL DEPLOY  " -ForegroundColor Cyan
Write-Host "        FRONTEND + BACKEND             " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Track overall deployment status - use 99 to distinguish uninitialized from success (0)
$frontendResult = 99
$backendResult = 99
$gitRenamed = $false
$backupGitName = ".git.backup"

# Function to write colored status messages
function Write-Status {
    param(
        [string]$Icon,
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host "  $Icon $Message" -ForegroundColor $Color
}

# Step 0: Check if Vercel CLI is installed
Write-Host "[1/7] Checking Vercel CLI installation..." -ForegroundColor Yellow
$vercelCheck = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCheck) {
    Write-Status "X" "Vercel CLI not found. Install with: npm install -g vercel" -Color "Red"
    exit 1
}
Write-Status "OK" "Vercel CLI found" -Color "Green"

# Validate required directories
if (-not $BackendOnly -and -not (Test-Path "frontend")) {
    Write-Status "X" "frontend directory not found!" -Color "Red"
    exit 1
}
if (-not $FrontendOnly -and -not (Test-Path "backend")) {
    Write-Status "X" "backend directory not found!" -Color "Red"
    exit 1
}
Write-Host ""

# Step 1: Check git status and working directory
Write-Host "[2/7] Checking git status..." -ForegroundColor Yellow

if ($SkipGitCheck) {
    Write-Status "!" "Skipping git status check (SkipGitCheck flag used)" -Color "Yellow"
} else {
    # Check if .git directory exists
    if (-not (Test-Path ".git")) {
        Write-Status "!" "No .git directory found. This might be a fresh copy." -Color "Yellow"
    } else {
        # Check git status - capture output as array
        $gitStatusOutput = git status --porcelain 2>$null
        $gitExitCode = $LASTEXITCODE

        if ($gitExitCode -ne 0) {
            Write-Status "!" "Could not determine git status (not a git repository?)" -Color "Yellow"
        } elseif ($gitStatusOutput -and $gitStatusOutput.Count -gt 0) {
            Write-Status "!" "Working directory has uncommitted changes:" -Color "Yellow"
            $gitStatusOutput | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
            Write-Host ""
            
            # Ask for confirmation
            $response = Read-Host "  Do you want to continue? (Y/N)"
            if ($response -notmatch '^[Yy](?:es)?$') {
                Write-Status "X" "Deployment cancelled by user." -Color "Red"
                exit 0
            }
        } else {
            Write-Status "OK" "Working directory is clean (no uncommitted changes)" -Color "Green"
        }

        # Check current branch
        $currentBranch = git branch --show-current 2>$null
        if ($currentBranch -and $currentBranch -ne "main" -and $currentBranch -ne "master") {
            Write-Status "!" "Currently on branch: $currentBranch (not main/master)" -Color "Yellow"
        }

        # Show latest commit
        $gitLog = git log --oneline -1 2>$null
        if ($gitLog) {
            Write-Status "*" "Latest commit: $gitLog" -Color "Cyan"
        }
    }
}
Write-Host ""

# Step 2: Handle existing .git backup folders
Write-Host "[3/7] Checking for existing .git backups..." -ForegroundColor Yellow

# Find any existing backup folders
$existingBackups = @()
if (Test-Path $backupGitName) {
    $existingBackups += $backupGitName
}

# Also check for numbered backups like .git.backup.1, .git.backup.2, etc.
try {
    $numberedBackups = Get-ChildItem -Path "." -Filter ".git.backup.*" -ErrorAction SilentlyContinue
    if ($numberedBackups) {
        foreach ($backup in $numberedBackups) {
            $existingBackups += $backup.Name
        }
    }
} catch {
    # Ignore errors if no backup folders exist
}

if ($existingBackups.Count -gt 0) {
    Write-Status "!" "Found $($existingBackups.Count) existing backup folder(s):" -Color "Yellow"
    $existingBackups | ForEach-Object { Write-Host "     - $_" -ForegroundColor Gray }

    # Clean up old backups (keep only the most recent 2)
    if ($existingBackups.Count -ge 2) {
        $sortedBackups = $existingBackups | Sort-Object
        $oldBackups = $sortedBackups | Select-Object -SkipLast 1
        Write-Status "*" "Cleaning up $($oldBackups.Count) old backup(s)..." -Color "Cyan"
        foreach ($oldBackup in $oldBackups) {
            try {
                Remove-Item -Path $oldBackup -Recurse -Force -ErrorAction Stop
                Write-Host "     - Removed: $oldBackup" -ForegroundColor Green
            } catch {
                Write-Host "     - Warning: Could not remove $oldBackup" -ForegroundColor Yellow
            }
        }
    }

    # Find next available backup name
    $nextBackupNum = ($existingBackups | Sort-Object | Select-Object -Last 1 |
                     Select-String -Pattern '\d+$' -AllMatches |
                     ForEach-Object { [int]$_.Matches.Value }) + 1
    $backupGitName = ".git.backup.$nextBackupNum"
    Write-Status "*" "Will use $backupGitName for new backup" -Color "Cyan"
} else {
    # Find any numbered backups even if .git.backup doesn't exist
    try {
        $numberedBackups = Get-ChildItem -Path "." -Filter ".git.backup.*" -Directory -ErrorAction SilentlyContinue
        if ($numberedBackups -and $numberedBackups.Count -gt 0) {
            $maxNum = ($numberedBackups.Name |
                      ForEach-Object { [int]($_ -replace '.git.backup.', '') } |
                      Measure-Object -Maximum).Maximum
            $backupGitName = ".git.backup.$($maxNum + 1)"
        }
    } catch {
        # Use default if parsing fails
    }
}
Write-Host ""

# Step 3: Rename .git folder (if exists and not skipped)
Write-Host "[4/7] Preparing .git folder for deployment..." -ForegroundColor Yellow

if (-not $SkipGitCheck -and (Test-Path ".git")) {
    Write-Status "*" "Renaming .git folder to $backupGitName..." -Color "Yellow"
    try {
        Rename-Item -Path ".git" -NewName $backupGitName -ErrorAction Stop
        $gitRenamed = $true
        Write-Status "OK" ".git folder renamed successfully" -Color "Green"
    } catch {
        Write-Status "X" "Failed to rename .git folder. Please close any programs using it." -Color "Red"
        Write-Status "*" "Error: $($_.Exception.Message)" -Color "White"
        
        # Try to restore if we somehow created a partial backup
        if (Test-Path $backupGitName) {
            try {
                Rename-Item -Path $backupGitName -NewName ".git" -ErrorAction SilentlyContinue
            } catch {
                # Best effort restore
            }
        }
        exit 1
    }
} elseif ($SkipGitCheck) {
    Write-Status "!" "Skipping .git rename (SkipGitCheck flag used)" -Color "Yellow"
} else {
    Write-Status "i" "No .git folder found, skipping rename" -Color "Gray"
}
Write-Host ""
# Step 4: Check Vercel environment variables (security + presence)
Write-Host "[4/7] Checking Vercel environment variables..." -ForegroundColor Yellow

if ($SkipEnvCheck) {
    Write-Status "!" "Skipping env check (SkipEnvCheck flag used)" -Color "Yellow"
} else {
    function Get-VercelEnvNames($dir) {
        $names = @()
        if (Test-Path $dir) {
            $orig = Get-Location
            Set-Location $dir
            try {
                $lines = vercel env ls 2>$null
                foreach ($line in $lines) {
                    if ($line -match '^\s*([A-Z0-9_]+)\s+') { $names += $matches[1] }
                }
            } catch {
                Write-Status "!" ("Could not list envs in ${dir}: {0}" -f $_.Exception.Message) -Color "Yellow"
            }
            Set-Location $orig
        }
        return ,$names
    }

    $frontendEnvNames = Get-VercelEnvNames "frontend"
    $backendEnvNames = Get-VercelEnvNames "backend"

    Write-Status "*" "Frontend envs: $($frontendEnvNames -join ', ')" -Color "Gray"
    Write-Status "*" "Backend envs: $($backendEnvNames -join ', ')" -Color "Gray"

    # Keys that should NEVER be present in frontend (sensitive server secrets)
    $sensitiveKeys = @(
        'SUPABASE_SERVICE_ROLE_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'PAYSTACK_SECRET_KEY',
        'RESEND_API_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
    )

    $foundSensitive = @()
    foreach ($k in $sensitiveKeys) {
        if ($frontendEnvNames -contains $k) { $foundSensitive += $k }
    }

    if ($foundSensitive.Count -gt 0) {
        Write-Status "!" "Sensitive keys detected in frontend envs: $($foundSensitive -join ', ')" -Color "Red"
        $resp = Read-Host "Remove them on Vercel or proceed anyway? (Y to proceed, N to abort)"
        if ($resp -notmatch '^[Yy]') {
            Write-Status "X" "Aborting due to sensitive keys present in frontend envs" -Color "Red"
            exit 1
        }
    }

    # Required env keys we expect
    $frontendRequired = @('NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','NEXT_PUBLIC_API_URL','GOOGLE_CLIENT_ID')
    $backendRequired = @('SUPABASE_SERVICE_ROLE_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','PAYSTACK_SECRET_KEY','SUPABASE_URL')

    $missingFrontend = $frontendRequired | Where-Object { $_ -notin $frontendEnvNames }
    $missingBackend = $backendRequired | Where-Object { $_ -notin $backendEnvNames }

    if ($missingFrontend.Count -gt 0) { Write-Status "!" "Missing frontend envs: $($missingFrontend -join ', ')" -Color "Yellow" }
    if ($missingBackend.Count -gt 0) { Write-Status "!" "Missing backend envs: $($missingBackend -join ', ')" -Color "Yellow" }

    if (($missingFrontend.Count -gt 0) -or ($missingBackend.Count -gt 0)) {
        $resp2 = Read-Host "Some required envs are missing. Proceed with deploy? (Y/N)"
        if ($resp2 -notmatch '^[Yy]') {
            Write-Status "X" "Aborted due to missing envs" -Color "Red"
            exit 1
        }
    }
}

# Optional: Interactive env sync step
if ($SyncEnv) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "    INTERACTIVE ENVIRONMENT SYNC      " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $syncCount = 0
    
    function Prompt-And-AddEnv($projectDir, $name, $envChoice) {
        $orig = Get-Location
        Set-Location $projectDir
        try {
            Write-Host ""
            Write-Status ">" "Syncing $name to $envChoice" -Color "Cyan"
            Write-Host "   (Value will be encrypted in Vercel)" -ForegroundColor Gray
            
            # Prompt for secure value
            $secure = Read-Host "   📝 Enter value (hidden input)" -AsSecureString
            if ($secure.Length -eq 0) {
                Write-Status "!" "Skipped: empty value" -Color "Yellow"
                Set-Location $orig
                return
            }
            
            $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

            & vercel env add $name $plain $envChoice 2>&1 | Out-Null
            Write-Status "OK" "✓ $name synced" -Color "Green"
            $script:syncCount++
        } catch {
            Write-Status "!" ("Failed: {0}" -f $_.Exception.Message) -Color "Red"
        }
        Set-Location $orig
    }

    # Frontend sync
    if (Test-Path "frontend") {
        Write-Host ""
        Write-Host "📦 FRONTEND ENVIRONMENT VARIABLES" -ForegroundColor Green
        Write-Host "═══════════════════════════════════" -ForegroundColor Green
        $frontendSkip = $false
        
        foreach ($k in $frontendRequired) {
            if ($frontendSkip) { break }
            Write-Host ""
            Write-Host "Key: $k" -ForegroundColor Yellow
            Write-Host "Type: Public (safe to expose in browser)" -ForegroundColor Gray
            
            $do = Read-Host "[1/4] Update this? (Y=yes, N=skip, S=skip all frontend)"
            
            if ($do -match '^[Ss]') { 
                $frontendSkip = $true
                Write-Status "-" "Skipping remaining frontend vars" -Color "Gray"
                break 
            }
            
            if ($do -match '^[Yy]') {
                Write-Host "Choose environment(s):" -ForegroundColor Cyan
                Write-Host "  [1] production  (live)"
                Write-Host "  [2] preview     (staging)"
                Write-Host "  [3] development (dev)"
                Write-Host "  [4] all three"
                
                $envOpt = Read-Host "Enter 1-4 (default: 1 for production)"
                
                switch ($envOpt) {
                    "2" { Prompt-And-AddEnv "frontend" $k "preview" }
                    "3" { Prompt-And-AddEnv "frontend" $k "development" }
                    "4" { 
                        Prompt-And-AddEnv "frontend" $k "production"
                        Prompt-And-AddEnv "frontend" $k "preview"
                        Prompt-And-AddEnv "frontend" $k "development"
                    }
                    default { Prompt-And-AddEnv "frontend" $k "production" }
                }
            }
        }
    }

    # Backend sync
    if (Test-Path "backend") {
        Write-Host ""
        Write-Host "🔒 BACKEND ENVIRONMENT VARIABLES" -ForegroundColor Green
        Write-Host "═══════════════════════════════════" -ForegroundColor Green
        Write-Host "(Secrets - do NOT expose to frontend)" -ForegroundColor Red
        $backendSkip = $false
        
        foreach ($k in $backendRequired) {
            if ($backendSkip) { break }
            Write-Host ""
            Write-Host "Key: $k" -ForegroundColor Yellow
            Write-Host "Type: Secret (server-side only)" -ForegroundColor Red
            
            $do = Read-Host "[1/5] Update this? (Y=yes, N=skip, S=skip all backend)"
            
            if ($do -match '^[Ss]') { 
                $backendSkip = $true
                Write-Status "-" "Skipping remaining backend vars" -Color "Gray"
                break 
            }
            
            if ($do -match '^[Yy]') {
                Write-Host "Choose environment(s):" -ForegroundColor Cyan
                Write-Host "  [1] production  (live)"
                Write-Host "  [2] preview     (staging)"
                Write-Host "  [3] development (dev)"
                Write-Host "  [4] all three"
                
                $envOpt = Read-Host "Enter 1-4 (default: 1 for production)"
                
                switch ($envOpt) {
                    "2" { Prompt-And-AddEnv "backend" $k "preview" }
                    "3" { Prompt-And-AddEnv "backend" $k "development" }
                    "4" { 
                        Prompt-And-AddEnv "backend" $k "production"
                        Prompt-And-AddEnv "backend" $k "preview"
                        Prompt-And-AddEnv "backend" $k "development"
                    }
                    default { Prompt-And-AddEnv "backend" $k "production" }
                }
            }
        }
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Status "OK" "Env sync complete. $syncCount vars added." -Color "Green"
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
}

# Step 4: Deploy Frontend
if (-not $BackendOnly) {
    Write-Host "[5/7] Deploying Frontend..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "         DEPLOYING FRONTEND            " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    if (Test-Path "frontend") {
        $originalLocation = Get-Location
        Set-Location frontend
        Write-Status ">" "Deploying frontend to Vercel..." -Color "Cyan"
        try {
            & vercel --prod --yes
            $frontendResult = $LASTEXITCODE
        } catch {
            Write-Status "X" "Frontend deployment failed: $($_.Exception.Message)" -Color "Red"
            $frontendResult = 1
        }
        Set-Location $originalLocation
        Write-Host ""
    } else {
        Write-Status "X" "frontend directory not found!" -Color "Red"
        $frontendResult = 1
    }
} else {
    Write-Status "-" "Skipping frontend deployment (BackendOnly flag used)" -Color "Yellow"
    Write-Host ""
}

# Step 5: Deploy Backend
if (-not $FrontendOnly) {
    Write-Host "[6/7] Deploying Backend..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "         DEPLOYING BACKEND             " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    if (Test-Path "backend") {
        $originalLocation = Get-Location
        Set-Location backend
        Write-Status ">" "Deploying backend to Vercel..." -Color "Cyan"
        try {
            & vercel --prod --yes
            $backendResult = $LASTEXITCODE
        } catch {
            Write-Status "X" "Backend deployment failed: $($_.Exception.Message)" -Color "Red"
            $backendResult = 1
        }
        Set-Location $originalLocation
        Write-Host ""
    } else {
        Write-Status "X" "backend directory not found!" -Color "Red"
        $backendResult = 1
    }
} else {
    Write-Status "-" "Skipping backend deployment (FrontendOnly flag used)" -Color "Yellow"
    Write-Host ""
}

# Step 6: Restore .git folder
Write-Host "[7/7] Restoring .git folder..." -ForegroundColor Yellow

if ($gitRenamed -and -not $NoRestore) {
    if (Test-Path $backupGitName) {
        Write-Status "*" "Restoring .git folder from $backupGitName..." -Color "Yellow"
        try {
            Rename-Item -Path $backupGitName -NewName ".git" -ErrorAction Stop
            Write-Status "OK" ".git folder restored successfully" -Color "Green"
        } catch {
            Write-Status "!" "Failed to restore .git folder. Please rename $backupGitName to .git manually." -Color "Yellow"
            Write-Status "*" "Error: $($_.Exception.Message)" -Color "White"
        }
    } else {
        Write-Status "!" "Backup folder $backupGitName not found. Cannot restore." -Color "Yellow"
    }
} elseif ($NoRestore) {
    Write-Status "!" "Skipping .git restore (NoRestore flag used)" -Color "Yellow"
    Write-Status "*" "Remember to rename $backupGitName back to .git manually!" -Color "Cyan"
} else {
    Write-Status "i" "No .git folder was renamed, nothing to restore" -Color "Gray"
}
Write-Host ""

# Step 7: Final Results
$frontendSuccess = ($frontendResult -eq 0) -or $BackendOnly
$backendSuccess = ($backendResult -eq 0) -or $FrontendOnly
$overallSuccess = $frontendSuccess -and $backendSuccess

Write-Host "========================================" -ForegroundColor $(if ($overallSuccess) { "Green" } else { "Red" })
if ($overallSuccess) {
    Write-Host "       DEPLOYMENT SUCCESSFUL!        " -ForegroundColor Green
} else {
    Write-Host "     DEPLOYMENT PARTIALLY FAILED     " -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor $(if ($overallSuccess) { "Green" } else { "Red" })
Write-Host ""

# Detailed results
Write-Host "Deployment Results:" -ForegroundColor Yellow
if ($FrontendOnly) {
    Write-Status "-" "Frontend: SKIPPED (FrontendOnly flag used)" -Color "Gray"
} elseif ($frontendResult -eq 0) {
    Write-Status "OK" "Frontend: SUCCESS" -Color "Green"
} elseif ($frontendResult -eq 99) {
    Write-Status "-" "Frontend: SKIPPED" -Color "Gray"
} else {
    Write-Status "X" "Frontend: FAILED (Exit Code: $frontendResult)" -Color "Red"
}

if ($BackendOnly) {
    Write-Status "-" "Backend: SKIPPED (BackendOnly flag used)" -Color "Gray"
} elseif ($backendResult -eq 0) {
    Write-Status "OK" "Backend: SUCCESS" -Color "Green"
} elseif ($backendResult -eq 99) {
    Write-Status "-" "Backend: SKIPPED" -Color "Gray"
} else {
    Write-Status "X" "Backend: FAILED (Exit Code: $backendResult)" -Color "Red"
}
Write-Host ""

if ($overallSuccess) {
    Write-Status "*" "Deployment completed successfully!" -Color "Cyan"
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Visit your Vercel dashboard to see the deployments" -ForegroundColor White
    Write-Host "   2. Test your live site and API endpoints" -ForegroundColor White
    Write-Host "   3. Check that all features work correctly" -ForegroundColor White
    Write-Host "   4. Verify backend API responses" -ForegroundColor White
    Write-Host ""
} else {
    Write-Status "!" "Some deployments failed. Please check the errors above." -Color "Red"
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check that you're logged into Vercel (vercel login)" -ForegroundColor White
    Write-Host "   2. Ensure your Vercel projects are properly configured" -ForegroundColor White
    Write-Host "   3. Check the error messages above for details" -ForegroundColor White
    Write-Host "   4. Verify environment variables are set correctly" -ForegroundColor White
    Write-Host ""
    exit 1  # Exit with error code if deployment failed
}

Write-Host "For more information, see DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""

# Show available flags
Write-Host "Available flags for next time:" -ForegroundColor Cyan
Write-Host "   -SkipGitCheck   Skip git status checks" -ForegroundColor Gray
Write-Host "   -FrontendOnly   Deploy only the frontend" -ForegroundColor Gray
Write-Host "   -BackendOnly    Deploy only the backend" -ForegroundColor Gray
Write-Host "   -NoRestore      Don't restore .git folder after deployment" -ForegroundColor Gray
Write-Host ""