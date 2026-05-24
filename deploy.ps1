# Hilgod Vercel Deployment Script
# This script automates the Vercel deployment process for both frontend and backend
# by temporarily renaming the .git folder

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         HILGOD ONLINE SHOP - VERCEL DEPLOY               ║" -ForegroundColor Cyan
Write-Host "║              FRONTEND + BACKEND                          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Track overall deployment status
$frontendResult = 0
$backendResult = 0

# Step 0: Check if Vercel CLI is installed
Write-Host "🔍 Checking Vercel CLI installation..." -ForegroundColor Yellow
$vercelCheck = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCheck) {
    Write-Host "❌ Vercel CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g vercel" -ForegroundColor White
    exit 1
}
Write-Host "✅ Vercel CLI found" -ForegroundColor Green
Write-Host ""

# Step 1: Check if .git exists and rename it
$gitExists = Test-Path ".git"
if ($gitExists) {
    Write-Host "📁 Renaming .git folder to .git.backup..." -ForegroundColor Yellow
    try {
        Rename-Item -Path ".git" -NewName ".git.backup" -ErrorAction Stop
        Write-Host "✅ .git folder renamed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to rename .git folder. Please close any programs using it." -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor White
        exit 1
    }
} else {
    Write-Host "⚠️  .git folder not found, skipping rename" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Deploy Frontend
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              DEPLOYING FRONTEND                          ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

if (Test-Path "frontend") {
    Set-Location frontend
    Write-Host "🚀 Deploying frontend to Vercel..." -ForegroundColor Cyan
    vercel --prod
    $frontendResult = $LASTEXITCODE
    Set-Location ..
    Write-Host ""
} else {
    Write-Host "❌ frontend directory not found!" -ForegroundColor Red
    $frontendResult = 1
}

# Step 3: Deploy Backend
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              DEPLOYING BACKEND                           ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

if (Test-Path "backend") {
    Set-Location backend
    Write-Host "🚀 Deploying backend to Vercel..." -ForegroundColor Cyan
    vercel --prod
    $backendResult = $LASTEXITCODE
    Set-Location ..
    Write-Host ""
} else {
    Write-Host "❌ backend directory not found!" -ForegroundColor Red
    $backendResult = 1
}

# Step 4: Restore .git folder
if (Test-Path ".git.backup") {
    Write-Host "📁 Restoring .git folder..." -ForegroundColor Yellow
    try {
        Rename-Item -Path ".git.backup" -NewName ".git" -ErrorAction Stop
        Write-Host "✅ .git folder restored successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Failed to restore .git folder. Please rename .git.backup to .git manually." -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 5: Final Results
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor $(if ($frontendResult -eq 0 -and $backendResult -eq 0) { "Green" } else { "Red" })
if ($frontendResult -eq 0 -and $backendResult -eq 0) {
    Write-Host "║              ✅ DEPLOYMENT SUCCESSFUL!                    ║" -ForegroundColor Green
} else {
    Write-Host "║              ❌ DEPLOYMENT PARTIALLY FAILED                 ║" -ForegroundColor Red
}
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor $(if ($frontendResult -eq 0 -and $backendResult -eq 0) { "Green" } else { "Red" })
Write-Host ""

# Detailed results
Write-Host "📊 Deployment Results:" -ForegroundColor Yellow
if ($frontendResult -eq 0) {
    Write-Host "   ✅ Frontend: SUCCESS" -ForegroundColor Green
} else {
    Write-Host "   ❌ Frontend: FAILED" -ForegroundColor Red
}
if ($backendResult -eq 0) {
    Write-Host "   ✅ Backend: SUCCESS" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend: FAILED" -ForegroundColor Red
}
Write-Host ""

if ($frontendResult -eq 0 -and $backendResult -eq 0) {
    Write-Host "🎉 Both frontend and backend have been deployed to Vercel!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Visit your Vercel dashboard to see the deployments" -ForegroundColor White
    Write-Host "   2. Test your live site and API endpoints" -ForegroundColor White
    Write-Host "   3. Check that all features work correctly" -ForegroundColor White
    Write-Host "   4. Verify backend API responses" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️  Some deployments failed. Please check the errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check that you're logged into Vercel (vercel login)" -ForegroundColor White
    Write-Host "   2. Ensure your Vercel projects are properly configured" -ForegroundColor White
    Write-Host "   3. Check the error messages above for details" -ForegroundColor White
    Write-Host "   4. Verify environment variables are set correctly" -ForegroundColor White
    Write-Host ""
}

Write-Host "📖 For more information, see DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""