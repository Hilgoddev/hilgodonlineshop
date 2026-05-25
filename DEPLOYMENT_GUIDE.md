# Hilgod Online Shop - Vercel Deployment Guide

## Prerequisites
- Git installed
- Vercel CLI installed (`npm i -g vercel`)
- Vercel account linked to GitHub repository

## Deployment Strategy

Due to git configuration issues, we use a temporary `.git` folder rename strategy for deployment.

### Step-by-Step Deployment

#### 1. Ensure All Changes Are Committed
```bash
git add .
git commit -m "Your commit message"
```

#### 2. Push to GitHub (to sync remote)
```bash
git push client main
```

#### 3. Temporary Rename .git Folder
This prevents Vercel CLI from detecting git issues:

**Windows PowerShell:**
```powershell
Rename-Item -Path ".git" -NewName ".git.backup"
```

**Windows Command Prompt:**
```cmd
ren .git .git.backup
```

**macOS/Linux:**
```bash
mv .git .git.backup
```

#### 4. Deploy to Vercel
```bash
# Navigate to frontend directory
cd frontend

# Login to Vercel (if not already logged in)
vercel login

# Deploy to production
vercel --prod
```

#### 5. Restore .git Folder
After deployment completes:

**Windows PowerShell:**
```powershell
Rename-Item -Path ".git.backup" -NewName ".git"
```

**Windows Command Prompt:**
```cmd
ren .git.backup .git
```

**macOS/Linux:**
```bash
mv .git.backup .git
```

## Automated Deployment Script

For easier deployment, use the provided script:

**Windows (deploy.ps1):**
```powershell
# Hilgod Vercel Deployment Script
Write-Host "🚀 Starting Vercel deployment..." -ForegroundColor Green

# Step 1: Check if .git exists
if (Test-Path ".git") {
    Write-Host "📁 Renaming .git folder..." -ForegroundColor Yellow
    Rename-Item -Path ".git" -NewName ".git.backup"
} else {
    Write-Host "⚠️  .git folder not found, skipping rename" -ForegroundColor Yellow
}

# Step 2: Deploy to Vercel
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Green
cd frontend
vercel --prod
$deployResult = $LASTEXITCODE

# Step 3: Restore .git folder
if (Test-Path ".git.backup") {
    Write-Host "📁 Restoring .git folder..." -ForegroundColor Yellow
    Rename-Item -Path ".git.backup" -NewName ".git"
}

if ($deployResult -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed with exit code $deployResult" -ForegroundColor Red
}
```

**macOS/Linux (deploy.sh):**
```bash
#!/bin/bash
echo "🚀 Starting Vercel deployment..."

# Step 1: Check if .git exists
if [ -d ".git" ]; then
    echo "📁 Renaming .git folder..."
    mv .git .git.backup
else
    echo "⚠️  .git folder not found, skipping rename"
fi

# Step 2: Deploy to Vercel
echo "🚀 Deploying to Vercel..."
cd frontend
vercel --prod
deploy_result=$?

# Step 3: Restore .git folder
if [ -d ".git.backup" ]; then
    echo "📁 Restoring .git folder..."
    mv .git.backup .git
fi

if [ $deploy_result -eq 0 ]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment failed with exit code $deploy_result"
fi
```

## Post-Deployment

1. **Verify Deployment**: Visit your Vercel URL to confirm the site is live
2. **Test Critical Features**:
   - User registration/login
   - Product browsing
   - Order placement
   - Order tracking
   - Admin dashboard
   - Seller dashboard

3. **Check Environment Variables**: Ensure all required env vars are set in Vercel dashboard

## Troubleshooting

### Issue: Vercel CLI not found
**Solution:** Install globally: `npm i -g vercel`

### Issue: Permission denied on .git rename
**Solution:** Close any terminals or IDEs that might be using the git folder

### Issue: Deployment fails with git error
**Solution:** Ensure .git folder is properly renamed before deploying

### Issue: Environment variables missing
**Solution:** Add all required env vars in Vercel project settings:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Important Notes

- Always restore the `.git` folder after deployment
- The `.git.backup` folder should be deleted after successful restore
- This deployment strategy is necessary due to git configuration conflicts
- Consider fixing the git remote configuration for easier future deployments

## Alternative: GitHub Auto-Deploy

Once your GitHub repository is properly connected to Vercel:

1. Push changes to GitHub: `git push client main`
2. Vercel will automatically deploy from the main branch
3. No manual deployment needed!

This is the preferred method once git is properly configured.

---

**Last Updated:** 2026-05-24
**Project:** Hilgod Online Shop