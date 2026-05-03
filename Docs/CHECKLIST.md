# 📋 Hilgod Online Shop - Setup Checklist

Use this checklist to get your backend up and running!

---

## ✅ Phase 1: Backend Installation (Do This First)

### Step 1: Install Node.js Dependencies
- [ ] Open terminal in project folder
- [ ] Run: `npm install`
- [ ] Wait for installation to complete
- [ ] Verify no errors in terminal

### Step 2: Create Environment File
- [ ] Copy `.env.example` to `.env.local`
  ```bash
  copy .env.example .env.local
  ```
- [ ] Open `.env.local` in text editor
- [ ] Keep file ready for credentials

---

## 🔑 Phase 2: Get Your Credentials

### Google OAuth Credentials

**Option A: If you already have Google Cloud Console access:**
- [ ] Go to https://console.cloud.google.com/
- [ ] Select or create your project
- [ ] Navigate to: APIs & Services → Credentials
- [ ] Find your OAuth 2.0 Client ID
- [ ] Copy **Client ID** → Paste into `.env.local`
- [ ] Copy **Client Secret** → Paste into `.env.local`

**Option B: If you need to create new credentials:**
- [ ] Go to https://console.cloud.google.com/
- [ ] Click "Select Project" → "New Project"
- [ ] Name it "Hilgod Shop" (or your choice)
- [ ] Click "Create"
- [ ] Go to "APIs & Services" → "Library"
- [ ] Search for "Google+ API" → Enable it
- [ ] Go to "Credentials" → "Create Credentials" → "OAuth Client ID"
- [ ] Application type: "Web application"
- [ ] Name: "Hilgod Shop Auth"
- [ ] Add authorized redirect URI:
  ```
  http://localhost:3000/api/auth/callback/google
  ```
- [ ] Click "Create"
- [ ] Copy the **Client ID** and **Client Secret**
- [ ] Paste them into `.env.local`

### MongoDB Connection String

**Option A: If you already have MongoDB Atlas:**
- [ ] Log in to https://www.mongodb.com/cloud/atlas
- [ ] Select your cluster
- [ ] Click "Connect" → "Connect your application"
- [ ] Copy the connection string
- [ ] Replace `<password>` with your database password
- [ ] Paste into `.env.local` as `MONGODB_URI`

**Option B: If you need to create MongoDB Atlas account:**
- [ ] Go to https://www.mongodb.com/cloud/atlas/register
- [ ] Sign up for free account
- [ ] Create new cluster (choose FREE tier M0)
- [ ] Choose cloud provider and region (closest to you)
- [ ] Click "Create Cluster" (takes 3-5 minutes)
- [ ] While waiting, set up database access:
  - [ ] Click "Database Access" in left menu
  - [ ] Click "Add New Database User"
  - [ ] Username: `hilgodadmin` (or your choice)
  - [ ] Password: Generate secure password
  - [ ] Save password somewhere safe!
  - [ ] Click "Add User"
- [ ] Set up network access:
  - [ ] Click "Network Access" in left menu
  - [ ] Click "Add IP Address"
  - [ ] Click "Allow Access from Anywhere" (0.0.0.0/0)
  - [ ] Click "Confirm"
- [ ] After cluster is ready:
  - [ ] Click "Connect" on your cluster
  - [ ] Choose "Connect your application"
  - [ ] Driver: Node.js, Version: latest
  - [ ] Copy the connection string
  - [ ] Replace `<password>` with your database user password
  - [ ] Replace `<dbname>` with `hilgodshop`
  - [ ] Paste into `.env.local`

### Generate Secret Keys

- [ ] Open terminal
- [ ] Run this command for NEXTAUTH_SECRET:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Copy the output
- [ ] Paste into `.env.local` after `NEXTAUTH_SECRET=`

- [ ] Run this command for JWT_SECRET:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Copy the output
- [ ] Paste into `.env.local` after `JWT_SECRET=`

---

## ✍️ Phase 3: Configure Environment Variables

Your `.env.local` should look like this (with YOUR values):

```env
MONGODB_URI=mongodb+srv://hilgodadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/hilgodshop?retryWrites=true&w=majority

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=long-random-string-you-generated

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

JWT_SECRET=another-long-random-string-you-generated

NODE_ENV=development
PORT=3000
```

- [ ] Double-check all values are filled in
- [ ] No placeholder text remains
- [ ] Passwords don't have spaces
- [ ] Save the file

---

## 🚀 Phase 4: Start and Test

### Start the Server
- [ ] Open terminal in project folder
- [ ] Run: `npm run dev`
- [ ] Wait for server to start
- [ ] Look for message: "✅ MongoDB connected successfully"
- [ ] Look for message: "ready started server on 0.0.0.0:3000"

### Test Health Check
- [ ] Open browser
- [ ] Go to: `http://localhost:3000/api/health`
- [ ] You should see JSON response with `"success": true`

### Test API Test Page
- [ ] Go to: `http://localhost:3000/api-test.html`
- [ ] You should see: "✅ API Server is Running!"
- [ ] Click "Test" button next to /api/health
- [ ] Check response shows in black box below

### Seed Database (Optional but Recommended)
- [ ] Stop server (Ctrl+C in terminal)
- [ ] Run: `npm run seed`
- [ ] Wait for seeding to complete
- [ ] You should see: "🎉 Database seeded successfully!"
- [ ] See list of 5 sample products added
- [ ] Restart server: `npm run dev`

### Test Products API
- [ ] Go back to api-test.html
- [ ] Click "Test" next to /api/products
- [ ] You should see array of products in response
- [ ] If you seeded, you'll see 5 products

---

## 🧪 Phase 5: Test Authentication

### Test User Registration
- [ ] On api-test.html, click "Test" next to Register User
- [ ] Check response shows new user created
- [ ] Note the user ID returned

### Test Google Login (Manual Test)
- [ ] In browser, go to: `http://localhost:3000/api/auth/signin`
- [ ] You should see NextAuth sign-in page
- [ ] Click "Sign in with Google"
- [ ] Choose your Google account
- [ ] Authorize the application
- [ ] You should be redirected back
- [ ] Check browser console for session data

---

## ✅ Phase 6: Verification Checklist

### Backend Verification
- [ ] Server starts without errors
- [ ] MongoDB connects successfully
- [ ] Health check returns success
- [ ] Products API returns data
- [ ] User registration works
- [ ] Google login redirects properly

### Files Verification
- [ ] `.env.local` exists and has all values
- [ ] `node_modules/` folder exists
- [ ] All API route files exist in `pages/api/`
- [ ] All model files exist in `models/`
- [ ] Documentation files are readable

### Security Verification
- [ ] `.env.local` is in `.gitignore`
- [ ] No secrets committed to git
- [ ] MongoDB password is strong
- [ ] Secret keys are long and random

---

## 🎯 Phase 7: Ready for Integration

Once all above boxes are checked:

- [ ] Backend is fully operational
- [ ] Database has sample data
- [ ] Authentication is working
- [ ] API endpoints respond correctly

**You're ready to:**
1. Connect your frontend HTML pages to the API
2. Add Google Sign-In button to login page
3. Implement cart functionality
4. Build checkout flow
5. Deploy to production

---

## 🆘 Troubleshooting

### Problem: "MongoDB connection failed"
**Solutions:**
- [ ] Check MongoDB URI is correct in `.env.local`
- [ ] Verify password doesn't have special characters (or URL encode them)
- [ ] Check Network Access allows your IP (0.0.0.0/0 for testing)
- [ ] Ensure database user was created correctly
- [ ] Try connecting with MongoDB Compass to test

### Problem: "Google OAuth error"
**Solutions:**
- [ ] Verify redirect URI exactly matches: `http://localhost:3000/api/auth/callback/google`
- [ ] Check Client ID and Secret are copied correctly (no extra spaces)
- [ ] Ensure Google+ API is enabled in Google Cloud Console
- [ ] Try creating new OAuth credentials

### Problem: "Port 3000 already in use"
**Solutions:**
- [ ] Kill existing process: `taskkill /F /IM node.exe` (Windows)
- [ ] Or use different port: `set PORT=3001 && npm run dev`

### Problem: "Module not found" errors
**Solutions:**
- [ ] Delete `node_modules` folder
- [ ] Delete `package-lock.json`
- [ ] Run `npm install` again
- [ ] Restart terminal

### Problem: ".env.local not loading"
**Solutions:**
- [ ] Ensure file is named exactly `.env.local` (not `.env.local.txt`)
- [ ] Restart the dev server after creating/editing `.env.local`
- [ ] Check file is in project root (same folder as package.json)

---

## 📞 When You're Ready

**Come back to me with:**
1. ✅ Confirmation that server is running
2. ✅ Any error messages you encountered
3. ✅ Questions about next steps

**Then I'll help you:**
- Fix any issues
- Connect your frontend pages
- Add Google login button
- Implement shopping cart
- Build complete checkout flow

---

## 🎉 Success Indicators

You know everything is working when:

✅ Terminal shows: "✅ MongoDB connected successfully"  
✅ Terminal shows: "ready started server on 0.0.0.0:3000"  
✅ Browser shows health check JSON at `/api/health`  
✅ API test page shows green success message  
✅ Product test returns array of products  
✅ Registration creates new user  

---

**Take your time, check each box, and let me know when you're done!** 🚀
