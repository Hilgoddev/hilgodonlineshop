# Deployment Instructions

## Recent Changes Summary

### 1. Button Responsiveness Fixes ✅
- Fixed all button alignment and overflow issues
- Added responsive CSS rules for mobile devices
- Files updated: `main.css`, `checkout.js`, `return-request.js`, `products/[id].js`, `seller/products.js`, `account/index.js`, `admin/index.js`, `admin/flash-sales.js`

### 2. Database Schema Migration ✅
- Created comprehensive migration to fix order_items → profiles relationship
- Adds missing columns: `phone`, `store_name`, `full_name`, `role` to profiles table
- Adds `seller_id` column and foreign key to order_items table
- Adds `seller_id` foreign key to products table
- Creates performance indexes

### 3. Order Seller Integration ✅
- Orders now include seller details from products
- `seller_id` is stored in `order_items` when orders are created
- Works for both seller-uploaded and admin-uploaded products

---

## 🚨 CRITICAL: Apply Database Migration

**You MUST apply the database migration before the application will work correctly.**

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Open the file: `backend/migrations/002_fix_profiles_and_order_items_schema.sql`
4. Copy ALL the content
5. Paste into the SQL Editor
6. Click **Run** button
7. Wait for success message

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to project root
cd "c:\Users\HSEF 2026\Downloads\Hilgodonlineshop"

# Apply migration
supabase db push
```

### Option 3: Direct psql

```bash
psql -h db.[your-project-id].supabase.co -U postgres -d postgres -f backend/migrations/002_fix_profiles_and_order_items_schema.sql
```

---

## 📤 Automatic Deployment

Once the migration is applied, the changes will automatically deploy:

### Frontend (Vercel)
- Vercel will detect the GitHub push and automatically deploy
- Check deployment status at: https://vercel.com/dashboard
- Frontend changes are live immediately after build

### Backend (Render)
- Render will detect the GitHub push and automatically deploy
- Check deployment status at: https://dashboard.render.com
- Backend changes are live after the build completes (~2-3 minutes)

---

## ✅ Verification Steps

After deployment:

1. **Test Button Responsiveness**
   - Open the site on mobile device or use browser dev tools
   - Test buttons on: checkout, account, admin pages
   - Verify no button overflow or displacement

2. **Test Order Creation**
   - Create a test order
   - Check that `seller_id` is stored in `order_items`
   - Verify order details include seller information

3. **Test Order Retrieval**
   - View order details
   - Confirm seller info is displayed correctly
   - Check that seller phone, store name, etc. are accessible

4. **Database Check**
   - In Supabase dashboard, verify:
     - `profiles` table has: `phone`, `store_name`, `full_name`, `role` columns
     - `order_items` table has: `seller_id` column
     - `products` table has: `seller_id` column with foreign key

---

## 🆘 Troubleshooting

### Error: "Could not find a relationship between 'order_items' and 'profiles'"
**Solution:** Apply the database migration (see above)

### Error: "profiles_2.phone does not exist"
**Solution:** Apply the database migration (see above)

### Orders not showing seller details
**Solution:** 
1. Verify migration was applied successfully
2. Check that products have `seller_id` set
3. Restart the backend service on Render

### Buttons still have issues
**Solution:**
1. Clear browser cache
2. Force refresh (Ctrl+F5 or Cmd+Shift+R)
3. Check Vercel deployment completed successfully

---

## 📞 Support

If you encounter any issues:
1. Check the deployment logs on Vercel/Render
2. Review Supabase logs for database errors
3. Verify all migration steps were completed

---

**Last Updated:** May 25, 2026
**Commits:** 
- `d9dac15` - Button responsiveness fixes
- `34e111c` - Database schema migration
- `0739f8d` - Order seller integration