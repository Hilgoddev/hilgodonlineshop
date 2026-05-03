# 🚀 Quick Start Guide - Hilgod Online Shop

## ⚡ Get Started in 5 Minutes

### **1. Start Development Server**
```bash
npm run dev
```
Visit: http://localhost:3000

---

### **2. Test User Account**

#### Create Account:
1. Go to http://localhost:3000/auth/signup
2. Fill in details or use Google Sign-In
3. You'll be redirected to `/account`

#### What Works:
✅ Profile management  
✅ Order history  
✅ Wishlist  
✅ Password change  
✅ Cart with user-specific storage  

---

### **3. Test Shopping Flow**

1. Browse products at `/products`
2. Click "Add to Cart" on any product
3. View cart at `/cart`
4. Proceed to checkout at `/checkout`
5. Complete order
6. View order in `/account?tab=orders`

---

### **4. Admin Access**

Login with these emails to access admin dashboard:
- `hilgoddev@gmail.com`
- `linuxrate@gmail.com`

After login, click your name → "Admin Dashboard"

---

## 📁 Project Structure

```
hilgodonlineshop/
├── pages/              # All routes
│   ├── account/        # User account page
│   ├── admin/          # Admin dashboard
│   ├── api/            # API endpoints
│   └── auth/           # Login & signup
├── components/         # React components
│   ├── Layout.js       # Main layout wrapper
│   ├── Navbar.js       # Navigation bar
│   └── ShopProvider.js # Cart & wishlist state
├── models/             # MongoDB schemas
│   ├── User.js         # User model
│   ├── Order.js        # Order model
│   └── Product.js      # Product model
├── lib/                # Utilities
│   └── mongodb.js      # Database connection
└── css/                # Stylesheets
```

---

## 🔧 Common Tasks

### **Add New Product (via API)**
```javascript
POST /api/products
{
  "name": "Product Name",
  "price": 5000,
  "description": "...",
  "category": "Electronics",
  "stock": 100
}
```

### **Check Database Health**
Visit: http://localhost:3000/api/health

### **View System Status**
Visit: http://localhost:3000/system-test

---

## 🐛 Troubleshooting

### **Console Errors?**
Clear browser localStorage:
```javascript
localStorage.clear()
location.reload()
```

### **Database Not Connecting?**
Check `.env.local` has correct `MONGODB_URI`

### **Google Login Failing?**
Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`

### **Cart Not Working?**
The cart now uses user-specific keys. Logout and login again to reset.

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `BUILD_SUCCESS.md` | Build status & deployment guide |
| `PRODUCTION_READY.md` | Pre-launch checklist |
| `USER_DATA_ISOLATION_COMPLETE.md` | How user data works |
| `ACCOUNT_PAGE_ENHANCED.md` | Account page features |
| `FIXED_404_ERRORS.md` | Authentication fixes |

---

## 🎯 Next Steps

1. ✅ Test all features locally
2. ✅ Fix any issues you find
3. ✅ Update `.env.local` for production
4. ✅ Deploy to Vercel/Netlify
5. ✅ Launch! 🚀

---

**Need help?** Check the detailed documentation files above or review the code comments.

**Your store is ready!** Start testing and prepare for launch! 🛍️
