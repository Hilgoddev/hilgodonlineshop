# Troubleshooting Guide - Registration & Authentication Issues

## Recent Fixes Applied ✅

1. **Fixed Google Client ID** - Removed extra space that was causing OAuth issues
2. **Improved MongoDB Connection String** - Added database name and proper connection parameters
3. **Enhanced Error Handling** - Better error messages in signup and login pages
4. **Added Database Test Endpoint** - `/api/db-test` to verify DB connection
5. **Created System Test Page** - `/system-test` to check all services

---

## Quick Start - Test Your Setup

### Step 1: Restart Your Development Server
```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 2: Check System Status
Open your browser and go to:
```
http://localhost:3000/system-test
```

This page will show you:
- ✅ Authentication status
- ✅ Database connection status
- ✅ Quick links to test signup/login

### Step 3: Test Database Connection
Visit:
```
http://localhost:3000/api/db-test
```

You should see:
```json
{
  "success": true,
  "message": "Database connected successfully",
  "timestamp": "..."
}
```

---

## Common Issues & Solutions

### Issue 1: "JSON.parse: unexpected character" Error

**Cause:** The server is returning HTML instead of JSON (usually a Next.js error page)

**Solutions:**
1. Make sure your dev server is running: `npm run dev`
2. Check the terminal for any compilation errors
3. Open browser console (F12) → Network tab → Check the response from `/api/signup`
4. Verify `.env.local` file exists and has correct values

### Issue 2: "An error occurred during registration"

**Possible Causes:**

#### A. Password Doesn't Meet Requirements
Your password MUST have:
- ✅ At least 8 characters
- ✅ One uppercase letter (A-Z)
- ✅ One number (0-9)
- ✅ One special character (!@#$%^&*)

**Example valid password:** `Password123!`

#### B. Email Already Exists
- Try logging in instead with the same email
- Or use a different email address

#### C. Database Connection Failed
1. Check if MongoDB Atlas is running
2. Verify your IP is whitelisted in MongoDB Atlas
3. Test connection: `http://localhost:3000/api/db-test`

#### D. Missing Dependencies
Run:
```bash
npm install
```

### Issue 3: Google OAuth Not Working

**Fixed:** Removed extra space in `GOOGLE_CLIENT_ID`

If still not working:
1. Verify Google OAuth credentials in Google Cloud Console
2. Make sure redirect URIs are set correctly:
   - `http://localhost:3000/api/auth/callback/google`
3. Check that Google+ API is enabled

---

## Debugging Steps

### 1. Check Browser Console
Press F12 → Console tab
Look for red error messages when you try to sign up

### 2. Check Network Tab
Press F12 → Network tab
1. Try to sign up
2. Look for the `/api/signup` request
3. Click on it → Check:
   - Status Code (should be 201 for success)
   - Response tab (shows the actual error message)

### 3. Check Server Terminal
Look at the terminal where you ran `npm run dev`
Check for error messages like:
- ❌ MongoDB connection errors
- ❌ Compilation errors
- ❌ Missing environment variables

### 4. Verify Environment Variables
Make sure `.env.local` has:
```env
MONGODB_URI=mongodb+srv://hilgod:b4XBsQZXLD76N4Wx@cluster0.azuwpk2.mongodb.net/hilgod-shop?retryWrites=true&w=majority
NEXTAUTH_SECRET=e2a2a2624b4002be6da5e7bb1eb09c691e08dab03f59970106d8339c4ff49de4
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=605313142709-c46qeqgrovamln88uo2g5de25m8du2nj.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

---

## Testing Checklist

### Before Testing Signup:
- [ ] Dev server is running (`npm run dev`)
- [ ] No errors in terminal
- [ ] Database test passes (`/api/db-test` returns success)
- [ ] System test page shows green checks (`/system-test`)

### When Testing Signup:
- [ ] Use a valid email format (e.g., `test@example.com`)
- [ ] Password meets all requirements
- [ ] First name and last name are at least 2 characters
- [ ] Confirm password matches password
- [ ] Check "I agree to Terms" checkbox

### After Successful Signup:
- [ ] You should be automatically logged in
- [ ] Redirected to `/account` page
- [ ] Can see your name and email in the account page

---

## MongoDB Atlas Setup Verification

1. **Login to MongoDB Atlas**: https://cloud.mongodb.com
2. **Check Cluster Status**: Should show "Running"
3. **Network Access**: 
   - Go to Network Access
   - Make sure your IP is whitelisted OR add `0.0.0.0/0` (allow from anywhere)
4. **Database User**:
   - Go to Database Access
   - Verify user `hilgod` exists with correct password

---

## If Nothing Works

### Nuclear Option - Clean Restart:
```bash
# 1. Stop the server (Ctrl+C)

# 2. Delete node_modules and reinstall
rm -rf node_modules
npm install

# 3. Clear Next.js cache
rm -rf .next

# 4. Restart
npm run dev
```

### Check These Files:
1. `.env.local` - Must exist in root directory
2. `pages/api/signup.js` - Should have no syntax errors
3. `lib/mongodb.js` - MongoDB connection logic
4. `models/User.js` - User schema definition

---

## Contact/Support

If you're still having issues:
1. Share the exact error message from browser console
2. Share the response from `/api/db-test`
3. Share any errors from the terminal
4. Take a screenshot of the Network tab showing the failed request

---

## Success Indicators 🎉

You'll know everything is working when:
- ✅ `/api/db-test` returns `{"success": true}`
- ✅ `/system-test` shows all green checks
- ✅ Can create a new account without errors
- ✅ Can login with created account
- ✅ Google OAuth login works
- ✅ No errors in browser console or terminal
