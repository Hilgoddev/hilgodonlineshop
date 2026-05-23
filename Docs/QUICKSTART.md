# Quick Start Guide

## 🚀 Get Your Backend Running in 5 Minutes

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Create Environment File
```bash
# Windows PowerShell
copy .env.example .env.local

# Or manually copy .env.example to .env.local
```

### 3️⃣ Fill in Your Credentials

Open `.env.local` and add:

**Required from Google:**
- `GOOGLE_CLIENT_ID=` (Get from Google Cloud Console)
- `GOOGLE_CLIENT_SECRET=` (Get from Google Cloud Console)

**Required from MongoDB:**
- `MONGODB_URI=` (Get from MongoDB Atlas)

**Generate Secret Keys:**
```bash
# Run these commands and paste the output into .env.local
node -e "console.log('NEXTAUTH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 4️⃣ Start the Server
```bash
npm run dev
```

### 5️⃣ Test It Works
Open your browser: `http://localhost:3000/api-test.html`

You should see: ✅ API Server is Running!

---

## 📝 Getting Your Credentials

### Google OAuth Setup
1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable Google+ API
4. Create OAuth Client ID
5. Set redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret

### MongoDB Atlas Setup
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free cluster
3. Click Connect → Connect your application
4. Copy connection string
5. Replace `<password>` with your password

---

## ✅ What's Ready

- ✅ Next.js API server
- ✅ MongoDB connection
- ✅ Google authentication
- ✅ Products API (CRUD, search, filter)
- ✅ Cart API (add, remove, view)
- ✅ Wishlist API (add, remove, view)
- ✅ Orders API (create, track)
- ✅ User registration & profile
- ✅ Protected routes with authentication

## 🔗 API Base URL
`http://localhost:3000/api`

## 📚 Full Documentation
See `BACKEND_SETUP.md` for complete API documentation and examples.
