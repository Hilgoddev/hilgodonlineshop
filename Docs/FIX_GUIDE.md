# 🚀 Quick Fix Guide - Database Connection & Authentication

## ⚡ Immediate Steps to Fix "Database connection failed" Error

### Step 1: Restart Your Development Server Completely

```bash
# Press Ctrl+C to stop the current server
# Then run these commands:

# Clear Next.js cache
rm -rf .next

# Restart the server
npm run dev
```

**IMPORTANT:** After making changes to `.env.local`, you MUST restart the server for changes to take effect!

---

### Step 2: Verify MongoDB Atlas Setup

1. **Login to MongoDB Atlas**: https://cloud.mongodb.com
2. **Check Cluster Status**: 
   - Go to Database → Clusters
   - Make sure your cluster shows "Running" (green)
3. **Network Access**:
   - Go to Security → Network Access
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) OR add your current IP
   - Click Confirm
4. **Database User**:
   - Go to Security → Database Access
   - Verify user `hilgod` exists
   - If needed, reset the password and update `.env.local`

---

### Step 3: Test Database Connection

Open your browser and visit:
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

If you see an error, check the terminal where you ran `npm run dev` for detailed error messages.

---

### Step 4: Test Signup

1. Visit: `http://localhost:3000/auth/signup`
2. Fill in the form with:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com (use a unique email)
   - Password: `Password123!` (must have uppercase, number, special char)
   - Confirm Password: `Password123!`
   - Check "I agree to Terms"
3. Click "Create Account"

---

## 🔍 Common Issues & Solutions

### Issue 1: "Database connection failed" 

**Cause:** MongoDB can't be reached

**Solutions:**
1. ✅ Restart your dev server (`npm run dev`)
2. ✅ Check MongoDB Atlas cluster is running
3. ✅ Whitelist your IP in MongoDB Atlas Network Access
4. ✅ Verify MongoDB URI in `.env.local` is correct
5. ✅ Check terminal for specific error messages

---

### Issue 2: Facebook Provider Causing Errors

**Fixed!** ✅ The Facebook provider was configured but credentials weren't set, causing NextAuth to fail.

**Solution Applied:** Made Facebook provider conditional - it only loads if credentials are provided.

---

### Issue 3: Environment Variables Not Loading

**Fixed!** ✅ Added explicit environment variable mapping in `next.config.js`

**What was done:**
- Recreated `.env.local` with clean formatting
- Added env mapping in `next.config.js`
- Improved MongoDB connection with better timeout settings

---

### Issue 4: Admin Role Configuration

**Current Setup:** 
- `ADMIN_EMAIL_1=hilgoddev@gmail.com`
- `ADMIN_EMAIL_2=linuxrate@gmail.com`

These emails will automatically get admin role when they sign up. This is working correctly and NOT causing any issues.

---

## 📋 What Was Fixed

### 1. **MongoDB Connection** ([lib/mongodb.js](file:///c:/Users/etiuz/Music/hilgodonlineshop/lib/mongodb.js))
- ✅ Added connection timeout settings (5 seconds)
- ✅ Better error logging
- ✅ More descriptive console messages

### 2. **NextAuth Configuration** ([pages/api/auth/[...nextauth].js](file:///c:/Users/etiuz/Music/hilgodonlineshop/pages/api/auth/[...nextauth].js))
- ✅ Made Facebook provider conditional (only loads if configured)
- ✅ Prevents errors when Facebook credentials aren't set

### 3. **Environment Variables** ([.env.local](file:///c:/Users/etiuz/Music/hilgodonlineshop/.env.local))
- ✅ Cleaned up formatting
- ✅ Removed extra spaces
- ✅ Added proper database name in MongoDB URI

### 4. **Next.js Config** ([next.config.js](file:///c:/Users/etiuz/Music/hilgodonlineshop/next.config.js))
- ✅ Added explicit environment variable mapping
- ✅ Ensures all env vars are properly loaded

### 5. **Error Handling** ([pages/api/signup.js](file:///c:/Users/etiuz/Music/hilgodonlineshop/pages/api/signup.js))
- ✅ Better error messages
- ✅ Database connection error handling
- ✅ Validation error details

---

## 🧪 Testing Checklist

Run through this checklist to verify everything works:

### Database Connection
- [ ] Visit `/api/db-test` - should show success
- [ ] Check terminal - should see "✅ MongoDB connected successfully"

### Signup
- [ ] Visit `/auth/signup`
- [ ] Create account with valid data
- [ ] Should redirect to `/account` after signup
- [ ] No errors in browser console (F12)

### Login
- [ ] Visit `/auth/login`
- [ ] Login with created account
- [ ] Should redirect to homepage or `/account`
- [ ] Can see user info in navbar

### Account Page
- [ ] Visit `/account`
- [ ] Should see profile information
- [ ] Can view orders tab
- [ ] Can view wishlist tab
- [ ] Can change password (if using email login)

### Google OAuth
- [ ] Click "Continue with Google" on login page
- [ ] Should authenticate with Google
- [ ] Creates account if doesn't exist

---

## 🐛 Debugging Tips

### Check Browser Console
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Look for red error messages
4. Try signing up again and watch for errors

### Check Network Tab
1. Press F12 → Network tab
2. Try to sign up
3. Look for `/api/signup` request
4. Click on it → Check Response tab
5. Should see JSON response, not HTML

### Check Server Terminal
Look at the terminal where you ran `npm run dev`:
- Should see "✅ MongoDB connected successfully"
- Should NOT see any red error messages
- If you see errors, copy them and search for solutions

---

## 📞 If Still Having Issues

Share these details:
1. **Exact error message** from browser or terminal
2. **Response from** `/api/db-test`
3. **Screenshot** of Network tab showing the failed request
4. **Terminal output** when you try to sign up

---

## ✨ Expected Behavior

After fixes, your website should work like this:

1. **Signup**: User fills form → Account created → Auto-login → Redirect to account page
2. **Login**: User enters credentials → Validates → Redirects to homepage
3. **Google Login**: Click button → Google auth → Creates/logs in user → Redirects
4. **Account Page**: Shows user profile, orders, wishlist, settings
5. **Admin Users**: If email matches ADMIN_EMAIL_1 or ADMIN_EMAIL_2, gets admin role automatically

Everything should work smoothly without any "Database connection failed" errors!

---

## 🎯 Quick Commands

```bash
# Stop server (Ctrl+C)

# Clear cache
rm -rf .next

# Reinstall dependencies (if needed)
npm install

# Start fresh
npm run dev
```

Then test at: `http://localhost:3000/system-test`
