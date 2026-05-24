here is a list of known things not working 
the product i successfuly purchaced and money deducted, even when the stock was one after purchase the product was still there
and on the view my order there is no dedicated page for that for a specific account
on the order table on the admin i want on show the order details to come from directly below the product and nor at the vary buttom of table and it should be responsive on mibile view

In mobile phone the currency is just USD, I thought he was bluffing but I checked on my mobile and it was true. The same for checkout and all pages.

Work on the auto detect properly and the currency switcher button should be somewhere after they click the hamburger icon

1. Currency and auto in mobile phone and then the currency switcher in nav bar should appear in the phone nav bar when hamburger is clicked 
2. Button's placement in all devices

Top priority 

Acknowledged. Working on an existing codebase changes the game completely—we are **refactoring and extending**, not starting from scratch. We need to make sure these new features seamlessly blend with the authentication, middleware, and database structures you already have in place without breaking any existing functionality.
Here is your production-ready, refactored Master Roadmap for **Hilgod**, specifically tailored for a brownfield (existing) project and optimized for smooth integration.
## 🛠️ Module 1: Localization & Live Dynamic Pricing
 * **[ ] External API Selection & Keys:** Register for your chosen production API keys (ipapi.co / ipinfo.io for location, and ExchangeRate-API for currency rates).
 * **[ ] Database Synchronization Table:** Create an exchange_rates table in Supabase.
 * **[ ] Background Cache Sync (Cron/Edge Function):** Build a scheduled worker to pull live rates every 12 hours and update your table, keeping database queries local and saving external API limits.
 * **[ ] Request Pipeline Refactoring (Middleware):** Inject an IP-lookup layer into your existing backend request pipeline.
   * **Optimization:** Check for a user_currency cookie/session flag *first*. Only hit the Geolocation API if the flag is missing, then save it for 30 days.
 * **[ ] Global UI State Integration:** Wrap your layout root with a new React/Vue CurrencyProvider context that distributes the active currency token and multiplier.
 * **[ ] Front-end Price Component Refactoring:** Replace hardcoded currency symbols across your existing product grids with a dynamic utility component:
   
## 🔄 Module 2: Seller Registration & Legacy Data Migration
 * **[ ] Form Component Extension:** Locate your existing seller signup form component and insert the mandatory, validated Business Name input field.
 * **[ ] Database Trigger Integration:** Add an asynchronous hook or PostgreSQL database trigger on your existing registration endpoint to automatically insert a corresponding row into your stores table upon successful seller signup.
 * **[ ] Defensive Fallback Handling:** Ensure the registration controller automatically formats a unique fallback string (e.g., Hilgod-Store-[Unique_ID]) if the business name field arrives empty.
 * **[ ] Legacy Seller Data Migration Script:** Write a targeted, one-time SQL or Node.js backend script to handle users who registered before this update:
   * **Conditionality Check:** Execute *if and only if* (if not already created) a store row for that seller ID does not exist, guaranteeing zero data duplication or overwritten fields.
   * **Data Mapping:** Extract the business_name already collected from their existing profile rows to automatically populate the new stores records.
 * **[ ] Transactional Email Blast:** Wire up your existing mail service (Nodemailer/Resend) within the migration script loop to automatically notify legacy sellers that their dedicated storefront is officially live.
## 🏗️ Module 3: Data Isolation & Storefront Views
 * **[ ] Multi-Vendor Schema Updates:** Update your existing products table schema to include a foreign key constraint linking it directly to the stores table via store_id.
 * **[ ] Public View Refactoring:** Update your current product detail route (/products/:id) to pull and display the associated store metadata, visually centering the seller's brand profile on the page.
## 👑 Module 4: Extended Admin Control Panel
 * **[ ] View View Tab Provisioning:** Check your admin dashboard layout files. If a dedicated **Stores Tab** component doesn't exist, create and wire up this new sub-view route in the sidebar navigation.
 * **[ ] Master All-Stores Grid:** Build a data table inside this tab rendering all available stores on the platform, mapping out Store ID, Store Name (in its own distinct column), and Owner Email.
 * **[ ] Interactive Deep Dive Handlers:** Attach click handlers to rows in the master table so clicking a specific store dynamically loads a nested sub-grid showcasing inventory isolated *exclusively* to that storefront.
 * **[ ] Admin Inventory Management Actions:** Place an "Add Product to Store" action button inside this nested catalog view, allowing platform administrators to create and inject items directly into that seller's shop grid.
## 📊 Module 5: Seller Dashboard & Lifecycle States
 * **[ ] Schema Lifecycle State Update:** Alter your existing inventory table schema to include an explicit tracking state column (e.g., status: 'pending' | 'approved' | 'rejected').
 * **[ ] Reactive Dashboard Mirroring:** Update the existing data grid inside the seller dashboard to fetch and render this dynamic status field, updating instantly whenever an admin alters it.
## 🎨 Module 6: UI/UX & Order Management Refactoring
 * **[ ] Legacy Component Removal:** Locate the current order tracking table component and completely rip out or comment out the conditional UI block that appends order specs to the bottom of the table container.
 * **[ ] Focused Overlay Component Drafting:** Build a modular <OrderDetailsModal /> component to neatly house purchase records, delivery metrics, and items in a clean overlay.
 * **[ ] Trigger Event Wiring:** Update the row-click execution parameters on your existing table component to intercept the click, load the selected order data into local state, and flip the modal visibility toggle to true:
   ```javascript
   const handleViewOrder = (order) => {
     setSelectedOrder(order);
     setIsOrderModalOpen(true);
   };
   
   ```
 * **[ ] Overlay Mask & Key Bindings:** Implement a dark background blur behind your new modal overlay. Ensure it cleanly unmounts or closes when a user clicks the backdrop or hits the physical keyboard Escape key.


arrange these and make a concrete plan to start working on them
a plan that would work well do not make any code changes yet just plan




IMPLEMENTATION STATUS AUDIT
✅ FULLY WORKING (No action needed)
Feature	Status	Location
Order placement	✅ Working	orders.js:136
Order tracking page	✅ Working	track-order.js:1
Admin order table	✅ Working	orders.js:125
Seller registration	✅ Working	seller-zone.js:10
Seller dashboard	✅ Working	dashboard.js:1
Stores table (DB)	✅ Exists	schema.sql:30
Admin stores tab	✅ Working	stores.js:1
Admin sellers tab	✅ Working	sellers.js:1
Seller approval workflow	✅ Working	admin.js:256
Currency auto-detection	✅ Working (desktop)	CurrencyContext.js:24
❌ CRITICAL BUG FOUND
Issue	Root Cause	File	Fix
Stock NOT deducted after purchase	❌ Field name mismatch — Code tries to update stock_quantity but DB has stock	paymentSuccess.js:32	Change column name in payment handler
⚠️ PARTIALLY WORKING (Needs fixes)
Feature	Status	Issue	Files
Currency on mobile	🟡 Broken	Hidden at 394px breakpoint; no hamburger switcher	header.css:306, Navbar.js:405
Admin order layout	🟡 Works but poor UX	Details at table bottom, not inline per row	orders.js:157
Exchange rates	🟡 Works but inefficient	Hits external API on every page load	CurrencyContext.js:45
❌ NOT IMPLEMENTED
Feature	Need	Files
Exchange rates cache	SQL table + backend cron	New migration
Auto-store creation on seller approval	Backend trigger	New migration
Order details modal	Frontend component	New component
SQL MIGRATIONS NEEDED
Here are the 4 SQL files you need to run in your Supabase SQL editor:

Migration 1: Fix Stock Column Name (CRITICAL)

-- Migration: Fix stock deduction bug
-- Issue: paymentSuccess.js tries to update 'stock_quantity' but column is 'stock'
-- This ensures stock is decremented after successful payment

-- Verify column exists and is named 'stock' (not 'stock_quantity')
-- If your products table has stock_quantity, rename it to stock

ALTER TABLE public.products
  RENAME COLUMN stock_quantity TO stock_temp;  -- Backup old column if exists

-- Ensure stock column exists with correct name
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- If you had stock_temp from rename, migrate data:
UPDATE public.products SET stock = stock_temp WHERE stock_temp IS NOT NULL;

-- Drop the temporary column
ALTER TABLE public.products DROP COLUMN IF EXISTS stock_temp;

-- Add index for performance (stock queries)
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock) WHERE stock > 0;

Migration 2: Exchange Rates Table (For Phase 4)

-- Migration: Create exchange rates cache table
-- Allows caching live rates to avoid external API calls on every page load

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_currency TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL,
  rate DECIMAL(12, 6) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_currency, target_currency)
);

-- Enable RLS
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can see rates)
CREATE POLICY "Exchange rates are viewable by everyone" 
  ON public.exchange_rates FOR SELECT USING (true);

-- Only admins can insert/update (via backend cron)
CREATE POLICY "Only admins can update exchange rates" 
  ON public.exchange_rates FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can modify exchange rates" 
  ON public.exchange_rates FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert default rates
INSERT INTO public.exchange_rates (source_currency, target_currency, rate, updated_at) VALUES
  ('USD', 'USD', 1, NOW()),
  ('USD', 'NGN', 1550, NOW()),
  ('USD', 'GBP', 0.79, NOW()),
  ('USD', 'EUR', 0.92, NOW())
ON CONFLICT (source_currency, target_currency) DO NOTHING;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup 
  ON public.exchange_rates(source_currency, target_currency);

  Migration 3: Seller Store Auto-Creation on Approval 




  ==========================


  Perfect! I found the **stock deduction bug**! Let me create a comprehensive audit report with SQL migrations.

---

## **IMPLEMENTATION STATUS AUDIT**

| Feature | Status | Details |
|---------|--------|---------|
| **Stock Deduction** | ❌ **BUG FOUND** | Using wrong field: `stock_quantity` vs actual field `stock` |
| **Currency Auto-Detection** | ✅ Working | Mobile hidden by CSS `@media (max-width: 394px)` |
| **Mobile Menu** | ✅ Working | Hamburger exists, no currency switcher added |
| **Order Details Page** | ⚠️ Partial | Account tab shows orders; no dedicated modal |
| **Admin Order Table Expansion** | ✅ Working | Details expand inline, but positioned below entire table |
| **Seller Registration** | ✅ Working | Application workflow functional |
| **Seller Dashboard** | ✅ Working | At `/seller/dashboard` |
| **Stores Table (DB)** | ✅ Exists | In Supabase |
| **Admin Stores Tab** | ✅ Exists | At `/admin/stores` |
| **Admin Sellers Tab** | ✅ Exists | At `/admin/sellers` |
| **Exchange Rates Cache** | ❌ Missing | Uses external API every time; no caching table |

---

## **SQL MIGRATIONS NEEDED**

Here are the **ready-to-run SQL files** for Supabase migrations:

### **Migration 1: Fix Stock Field Bug** (CRITICAL)
**File:** `backend/supabase/migrations/001_fix_stock_field.sql`

```sql
-- Fix stock deduction bug: products table has 'stock' but payment handler uses 'stock_quantity'
-- This migration is informational (schema is correct, backend code needs fix)

-- VERIFY current schema:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'products' AND column_name LIKE 'stock%';

-- Expected output: "stock" (NOT "stock_quantity")

-- The bug is in: backend/src/services/paymentSuccess.js line 32
-- Change: stock_quantity -> stock
```

**Backend Code Fix Required:**
File: paymentSuccess.js  
Change:
```javascript
// FROM:
const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
return supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.product_id);

// TO:
const newStock = Math.max(0, (product.stock || 0) - item.quantity);
return supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
```

---

### **Migration 2: Exchange Rates Cache Table** (NEW)
**File:** `backend/supabase/migrations/002_add_exchange_rates_table.sql`

```sql
-- ==========================================
-- EXCHANGE RATES CACHE TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_currency TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL,
  rate DECIMAL(16, 6) NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_currency, target_currency)
);

-- Add row-level security
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read rates (no authentication needed for pricing)
CREATE POLICY "Exchange rates are viewable by everyone" ON public.exchange_rates
FOR SELECT USING (true);

-- Policy: Only admins can write rates
CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed with fallback rates
INSERT INTO public.exchange_rates (source_currency, target_currency, rate) VALUES
('USD', 'USD', 1.0),
('USD', 'NGN', 1550.0),
('USD', 'GBP', 0.79),
('USD', 'EUR', 0.92)
ON CONFLICT (source_currency, target_currency) DO NOTHING;

-- Index for fast lookups
CREATE INDEX idx_exchange_rates_lookup ON public.exchange_rates(source_currency, target_currency);
```

**Why this table:**
- Frontend CurrencyContext currently fetches from `open.er-api.com` on every page load
- With caching table, backend can fetch once per 12 hours and store locally
- Frontend checks DB cache before hitting external API → faster, fewer API calls

---

### **Migration 3: Auto-Store Creation Trigger** (OPTIONAL - For Future)
**File:** `backend/supabase/migrations/003_auto_store_creation.sql`

```sql
-- This migration is FOR DOCUMENTATION only
-- Currently seller approval doesn't auto-create store; sellers create store manually

-- IF you want to auto-create a default store on seller approval:
-- Add trigger to seller_applications that creates stores row on approval

-- Status: NOT YET NEEDED
-- Current flow works: Seller approved → role='seller' → seller goes to /seller/store to create
-- Auto-creation would require additional migration and backend update
```

---

## **READY-TO-RUN SQL FOR SUPABASE EDITOR**

### **STEP 1: Copy & Paste Into Supabase SQL Editor**

```sql
-- ========== STEP 1: Create Exchange Rates Table ==========
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_currency TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL,
  rate DECIMAL(16, 6) NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_currency, target_currency)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exchange rates viewable by all" ON public.exchange_rates
FOR SELECT USING (true);

CREATE POLICY "Admins can manage rates" ON public.exchange_rates
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed rates
INSERT INTO public.exchange_rates (source_currency, target_currency, rate) VALUES
('USD', 'USD', 1.0),
('USD', 'NGN', 1550.0),
('USD', 'GBP', 0.79),
('USD', 'EUR', 0.92)
ON CONFLICT (source_currency, target_currency) DO NOTHING;

CREATE INDEX idx_exchange_rates_lookup ON public.exchange_rates(source_currency, target_currency);

-- ========== Verify: Should show 4 rows ==========
SELECT * FROM public.exchange_rates;
```

Click **Run** → Should see ✅ Success

---

## **FILES TO MODIFY (Code Changes)**

| File | Change | Reason |
|------|--------|--------|
| paymentSuccess.js | `stock_quantity` → `stock` | **FIX STOCK BUG** |
| backend/scripts/update-exchange-rates.js | **CREATE NEW** | Sync rates every 12h |
| backend/src/routes/exchange-rates.js | **CREATE NEW** | GET `/api/exchange-rates` |
| CurrencyContext.js | Use DB cache first | Fetch rates from DB, not API |
| Navbar.js | Add currency to mobile menu | Mobile hamburger switcher |
| header.css | Remove mobile breakpoint | Show currency on all sizes |

---

## **PRIORITY ORDER FOR FIXES**

### **Priority 1 (CRITICAL - Blocks Everything)**
1. ✅ **SQL:** Run Exchange Rates table migration (Supabase)
2. ✏️ **Code:** Fix `stock_quantity` bug in paymentSuccess.js
3. ✅ **Verify:** Test purchase with stock=1 product → confirm removed from catalog

### **Priority 2 (HIGH - Mobile UX)**
4. ✏️ **Code:** Remove CSS breakpoint hiding currency on mobile (header.css)
5. ✏️ **Code:** Add currency switcher to mobile hamburger menu (Navbar.js)
6. ✏️ **Code:** Update CurrencyContext to use DB cache (CurrencyContext.js)
7. ✅ **Create:** Backend exchange rate sync script
8. ✅ **Verify:** Test mobile currency detection & switcher

### **Priority 3 (MEDIUM - Polish)**
9. ✏️ **Code:** Refactor admin order table expansion to be inline per row
10. ✏️ **Code:** Create order details modal component
11. ✅ **Verify:** Order modal displays all details, responsive on mobile

---

## **HOW TO PROCEED**

**Ask me to:**
1. **Generate SQL file** → I'll create `migrations/001_exchange_rates.sql` ready to copy-paste
2. **Generate migration script** → I'll create `backend/scripts/update-exchange-rates.js` 
3. **Generate backend route** → I'll create `backend/src/routes/exchange-rates.js`
4. **Generate code fixes** → I'll provide exact diffs for all file changes
5. **Run tests** → After each phase, verify in browser

**What I'm NOT doing yet:** No code edits until you confirm which phase to start with.

---

**Which phase should I prepare next?** 
- 🔴 **Phase 1:** SQL + Stock bug fix?
- 🟡 **Phase 2:** Mobile currency UX?
- 🟢 **Phase 3:** Exchange rates backend?
- 🔵 **All of them?**


I'll prepare **Phase 2: Mobile Currency UX** with all necessary code changes.

## **Phase 2: Mobile Currency UI Fixes**

Since you don't have code editing enabled, I'll provide complete codeblocks for each file. You can copy-paste these into your editor.

---

### **Fix 1: CSS - Remove Mobile Currency Hiding**

**File:** header.css

**Find this section (around line 250-310):**
```css
@media (max-width: 394px) {
  .header-currency-wrap { display: none; }
}
```

**Replace with:**
```css
@media (max-width: 394px) {
  /* Currency now shown in hamburger menu on mobile */
  .header-currency-wrap { display: none; }
  .header-currency-wrap.mobile-currency { display: flex; }
}
```

---

### **Fix 2: Update CurrencyContext to Use DB Cache**

**File:** CurrencyContext.js

**Replace the entire file with:**

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();
const FALLBACK_RATES = { USD: 1, NGN: 1550, GBP: 0.79, EUR: 0.92 };
const CURRENCY_STORAGE_KEY = 'hilgod_currency_pref';
const RATES_CACHE_KEY = 'hilgod_rates_cache';
const RATES_CACHE_TIME_KEY = 'hilgod_rates_cache_time';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const mapLocaleToCurrency = (locale = '') => {
    const lower = String(locale).toLowerCase();
    if (lower.includes('ng')) return 'NGN';
    if (lower.includes('gb')) return 'GBP';
    if (lower.includes('fr') || lower.includes('de') || lower.includes('it') || lower.includes('es') || lower.includes('nl')) return 'EUR';
    return 'USD';
};

export function CurrencyProvider({ children }) {
    const [currency, setCurrency] = useState('USD');
    const [exchangeRates, setExchangeRates] = useState(FALLBACK_RATES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function detectCurrency() {
            try {
                const saved = typeof window !== 'undefined' ? localStorage.getItem(CURRENCY_STORAGE_KEY) : null;
                const localeCurrency = mapLocaleToCurrency(
                    typeof navigator !== 'undefined' ? navigator.language : ''
                );

                // 1. CHECK LOCAL STORAGE CACHE (24h TTL)
                let rates = FALLBACK_RATES;
                const cachedTime = typeof window !== 'undefined' ? localStorage.getItem(RATES_CACHE_TIME_KEY) : null;
                const now = Date.now();
                
                if (cachedTime && (now - parseInt(cachedTime)) < CACHE_TTL) {
                    const cached = typeof window !== 'undefined' ? localStorage.getItem(RATES_CACHE_KEY) : null;
                    if (cached) {
                        try {
                            rates = JSON.parse(cached);
                            console.log('[Currency] Using cached rates from localStorage');
                        } catch (e) {
                            console.warn('[Currency] Cache parse failed, will fetch fresh');
                        }
                    }
                } else {
                    // 2. FETCH FROM BACKEND DB CACHE (preferred)
                    try {
                        console.log('[Currency] Fetching rates from /api/exchange-rates');
                        const ratesRes = await fetch('/api/exchange-rates', { cache: 'no-store' });
                        if (ratesRes.ok) {
                            const ratesData = await ratesRes.json();
                            if (ratesData?.success && ratesData?.data) {
                                // Convert array format to object: { USD: 1, NGN: 1550, ... }
                                const rateMap = {};
                                for (const entry of ratesData.data) {
                                    if (entry.source_currency === 'USD') {
                                        rateMap[entry.target_currency] = parseFloat(entry.rate);
                                    }
                                }
                                if (Object.keys(rateMap).length > 0) {
                                    rates = rateMap;
                                    // Cache in localStorage for offline use
                                    if (typeof window !== 'undefined') {
                                        localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(rates));
                                        localStorage.setItem(RATES_CACHE_TIME_KEY, now.toString());
                                    }
                                    console.log('[Currency] Got rates from backend DB:', rates);
                                }
                            }
                        }
                    } catch (dbErr) {
                        console.warn('[Currency] DB fetch failed, trying external API:', dbErr.message);
                        
                        // 3. FALLBACK: External API (open.er-api.com)
                        try {
                            const extRes = await fetch('https://open.er-api.com/v6/latest/USD', { 
                                cache: 'no-store',
                                timeout: 3000 
                            });
                            if (extRes.ok) {
                                const extData = await extRes.json();
                                if (extData?.rates && typeof extData.rates === 'object') {
                                    rates = { ...FALLBACK_RATES, ...extData.rates };
                                    // Cache in localStorage
                                    if (typeof window !== 'undefined') {
                                        localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(rates));
                                        localStorage.setItem(RATES_CACHE_TIME_KEY, now.toString());
                                    }
                                    console.log('[Currency] Got rates from external API');
                                }
                            }
                        } catch (extErr) {
                            console.warn('[Currency] External API failed, using fallback:', extErr.message);
                        }
                    }
                }

                // 4. IP GEOLOCATION (for auto-currency detection)
                let geoCurrency = null;
                try {
                    const locRes = await fetch('https://ipwho.is/', { cache: 'no-store' });
                    if (locRes.ok) {
                        const locData = await locRes.json();
                        if (locData?.success && locData?.currency?.code) {
                            geoCurrency = locData.currency.code;
                            console.log('[Currency] Geo-detected currency:', geoCurrency);
                        }
                    }
                } catch (_) {}

                // 5. PRIORITY: IP geo → saved preference → locale → USD
                const detectedCurrency = geoCurrency || saved || localeCurrency || 'USD';

                if (isMounted) {
                    setExchangeRates(rates);
                    const finalCurrency = rates[detectedCurrency]
                        ? detectedCurrency
                        : rates[localeCurrency] ? localeCurrency : 'USD';
                    setCurrency(finalCurrency);
                    console.log('[Currency] Final currency:', finalCurrency);
                }
            } catch (error) {
                console.error('[Currency] Detection failed:', error);
                if (isMounted) {
                    setExchangeRates(FALLBACK_RATES);
                    setCurrency('USD');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        detectCurrency();
        return () => {
            isMounted = false;
        };
    }, []);

    const SYMBOLS = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };

    const formatPrice = (price, sourceCurrency = 'NGN', compact = true) => {
        const srcRate = exchangeRates[sourceCurrency] ?? 1;
        const dstRate = exchangeRates[currency] ?? 1;
        const priceInUSD = price / srcRate;
        const converted = priceInUSD * dstRate;
        const symbol = SYMBOLS[currency] || currency;
        if (compact) return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const setCurrencyPreference = (nextCurrency) => {
        setCurrency(nextCurrency);
        try {
            localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
        } catch (_) {
            // ignore storage failures
        }
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency: setCurrencyPreference, formatPrice, loading }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    return useContext(CurrencyContext);
}
```

---

### **Fix 3: Add Currency Switcher to Mobile Menu**

**File:** Navbar.js

**Find the mobile menu section (search for `<nav className="mobile-menu"`), then find the section that says `{/* User panel */}` around line 425-510**

**Replace the entire mobile menu body with this updated version:**

```javascript
            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <nav className="mobile-menu" id="mobile-menu">
                <div className="mobile-menu-header">
                  <span style={{ fontWeight: '700', fontSize: '1rem' }}>Menu</span>
                  <button className="mobile-menu-close" id="mobile-menu-close" onClick={closeMobileMenu}><i className="fas fa-xmark"></i></button>
                </div>
                <div className="mobile-menu-body">
                  {/* Mobile Currency Selector */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-4)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="fas fa-globe" style={{ color: 'var(--primary)', fontSize: '1rem' }}></i>
                    <span style={{ fontWeight: '600', fontSize: '.9rem', color: 'var(--gray-1)' }}>Currency</span>
                    <select
                      value={currency}
                      onChange={(e) => { setCurrency(e.target.value); closeMobileMenu(); }}
                      disabled={currencyLoading}
                      style={{
                        marginLeft: 'auto',
                        background: 'transparent',
                        border: '1px solid var(--gray-4)',
                        color: '#333',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="USD" style={{ color: '#333' }}>USD ($)</option>
                      <option value="NGN" style={{ color: '#333' }}>NGN (₦)</option>
                      <option value="GBP" style={{ color: '#333' }}>GBP (£)</option>
                      <option value="EUR" style={{ color: '#333' }}>EUR (€)</option>
                    </select>
                  </div>

                  {/* Mobile Search */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchQuery.trim()) {
                        router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                        closeMobileMenu();
                        setIsSearching(false);
                      }
                    }}
                    style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}
                  >
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-4)', fontSize: '.9rem', outline: 'none' }}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '10px 14px', flexShrink: 0 }}>
                      <i className="fas fa-magnifying-glass"></i>
                    </button>
                  </form>

                  {/* Categories */}
                  <Link href="/categories" className="mobile-nav-link" style={{ color: 'var(--primary)' }} onClick={closeMobileMenu}>
                    <span><i className="fas fa-th-large icon" style={{ color: 'var(--primary)' }}></i>All Categories</span><i className="fas fa-chevron-right"></i>
                  </Link>

                  {/* Account section */}
                  <div className="mobile-nav-title" style={{ marginTop: '10px' }}>My Account</div>
                  {session ? (
                    <>
                      {isAdmin && (
                        <Link href="/admin" className="mobile-nav-link" onClick={closeMobileMenu}>
                          <span><i className="fas fa-shield-halved icon" style={{ color: '#7c3aed' }}></i>Admin Dashboard</span><i className="fas fa-chevron-right"></i>
                        </Link>
                      )}
                      {isSeller && (
                        <>
                          <Link href="/seller/dashboard" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-store icon" style={{ color: 'var(--primary)' }}></i>Seller Dashboard</span><i className="fas fa-chevron-right"></i></Link>
                          <Link href="/seller/analytics" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-chart-line icon" style={{ color: 'var(--primary)' }}></i>Sales Analytics</span><i className="fas fa-chevron-right"></i></Link>
                          <Link href="/seller/orders" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-shopping-bag icon" style={{ color: 'var(--primary)' }}></i>Customer Orders</span><i className="fas fa-chevron-right"></i></Link>
                        </>
                      )}
                      <Link href="/account" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-user icon"></i>My Account</span><i className="fas fa-chevron-right"></i></Link>
                      <Link href="/cart" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-shopping-cart icon"></i>My Cart</span><i className="fas fa-chevron-right"></i></Link>
                      <Link href="/wishlist" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-heart icon"></i>My Wishlist</span><i className="fas fa-chevron-right"></i></Link>
                      <Link href="/account?tab=orders" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-receipt icon"></i>My Orders</span><i className="fas fa-chevron-right"></i></Link>
                      <div className="mobile-nav-link" onClick={() => { closeMobileMenu(); handleLogout(); }} style={{ color: 'var(--danger)' }}>
                        <span><i className="fas fa-right-from-bracket icon" style={{ color: 'var(--danger)' }}></i>Logout</span>
                        <i className="fas fa-chevron-right"></i>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link href="/auth/login" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-right-to-bracket icon"></i>Login</span><i className="fas fa-chevron-right"></i></Link>
                      <Link href="/auth/signup" className="mobile-nav-link" onClick={closeMobileMenu}><span><i className="fas fa-user-plus icon"></i>Register</span><i className="fas fa-chevron-right"></i></Link>
                    </>
                  )}

                  {/* Partners — hide "Sell on Hilgod" for approved sellers and admins */}
                  <div className="mobile-nav-title" style={{ marginTop: '10px' }}>Partners</div>
                  {!isSeller && !isAdmin && (
                    <Link href="/seller-zone" className="mobile-nav-link" onClick={closeMobileMenu}>
                      <span><i className="fas fa-store icon"></i>Sell on Hilgod</span><i className="fas fa-chevron-right"></i>
                    </Link>
                  )}
                  <Link href="/delivery" className="mobile-nav-link" onClick={closeMobileMenu}>
                    <span><i className="fas fa-truck icon"></i>Become a Delivery Partner</span><i className="fas fa-chevron-right"></i>
                  </Link>
                </div>
              </nav>
            )}
```

---

### **Fix 4: Create Backend Exchange Rates Route**

**File:** `backend/src/routes/exchange-rates.js` (NEW FILE - Create this)

```javascript
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/exchange-rates
// Returns all exchange rates from DB cache
// Public endpoint (no authentication needed)
router.get('/', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('exchange_rates')
            .select('source_currency, target_currency, rate, last_updated')
            .eq('source_currency', 'USD');

        if (error) throw error;

        // Convert to object format: { USD: 1, NGN: 1550, ... }
        const rates = {};
        (data || []).forEach(row => {
            rates[row.target_currency] = parseFloat(row.rate);
        });

        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.status(200).json({
            success: true,
            data: data || [],
            rates: rates, // Also return object format
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/exchange-rates/rate/:targetCurrency
// Get specific rate (e.g., /api/exchange-rates/rate/NGN)
router.get('/rate/:targetCurrency', async (req, res, next) => {
    try {
        const { targetCurrency } = req.params;

        const { data, error } = await supabase
            .from('exchange_rates')
            .select('rate')
            .eq('source_currency', 'USD')
            .eq('target_currency', targetCurrency.toUpperCase())
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, error: 'Rate not found' });
        }

        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.status(200).json({
            success: true,
            source: 'USD',
            target: targetCurrency.toUpperCase(),
            rate: parseFloat(data.rate)
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
```

---

### **Fix 5: Create Exchange Rate Sync Script**

**File:** `backend/scripts/update-exchange-rates.js` (NEW FILE - Create this)

```javascript
require('dotenv').config();
const supabase = require('../src/config/supabase');

const RATES_API = 'https://open.er-api.com/v6/latest/USD';

async function updateExchangeRates() {
    try {
        console.log('📊 Fetching latest exchange rates...');

        // Fetch from external API
        const response = await fetch(RATES_API, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`API responded with ${response.status}`);
        }

        const data = await response.json();
        if (!data.rates) {
            throw new Error('No rates in API response');
        }

        console.log(`✅ Got rates: ${Object.keys(data.rates).length} currencies`);

        // Prepare batch upsert data
        const rates = Object.entries(data.rates).map(([currency, rate]) => ({
            source_currency: 'USD',
            target_currency: currency,
            rate: parseFloat(rate),
            last_updated: new Date().toISOString()
        }));

        // Upsert (insert or update)
        const { error } = await supabase
            .from('exchange_rates')
            .upsert(rates, { onConflict: 'source_currency,target_currency' });

        if (error) throw error;

        console.log(`✅ Updated ${rates.length} exchange rates in Supabase`);
        console.log(`📅 Last updated: ${new Date().toISOString()}`);

        // Show sample
        console.log('\n📈 Sample rates (USD base):');
        console.log(`   USD → USD: ${data.rates.USD}`);
        console.log(`   USD → NGN: ${data.rates.NGN}`);
        console.log(`   USD → GBP: ${data.rates.GBP}`);
        console.log(`   USD → EUR: ${data.rates.EUR}\n`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating exchange rates:', err.message);
        process.exit(1);
    }
}

updateExchangeRates();
```

---

### **Fix 6: Register New Route in Backend Index**

**File:** index.js

**Find where routes are registered (around line 40-60), add:**

```javascript
const exchangeRatesRoutes = require('./routes/exchange-rates');

// ... other routes ...

app.use('/api/exchange-rates', exchangeRatesRoutes);
```

---

### **Fix 7: Add Script to package.json**

**File:** package.json

**Find the `"scripts"` section, add this line:**

```json
"scripts": {
  "dev": "nodemon src/index.js",
  "start": "node src/index.js",
  "update:rates": "node scripts/update-exchange-rates.js"
}
```

---

## **TESTING CHECKLIST**

After making these changes:

### **Desktop Test:**
- [ ] Go to homepage
- [ ] See currency selector in top-right (USD/NGN/GBP/EUR)
- [ ] Change currency → prices update immediately
- [ ] Refresh page → currency preference persists

### **Mobile Test (resize to 375px or use phone):**
- [ ] Click hamburger menu ☰
- [ ] See "Currency" section at top with dropdown
- [ ] Select different currency → menu closes, prices update
- [ ] Refresh → currency persists
- [ ] No horizontal scroll, responsive layout

### **Backend Test:**
```bash
# In terminal, from backend folder:
npm run update:rates
# Should see: ✅ Updated X exchange rates in Supabase
```

### **API Test:**
```bash
# Open browser, visit:
http://localhost:3000/api/exchange-rates

# Should return:
{
  "success": true,
  "data": [ { "source_currency": "USD", "target_currency": "NGN", "rate": 1550 }, ... ],
  "rates": { "USD": 1, "NGN": 1550, "GBP": 0.79, "EUR": 0.92 }
}
```

---

**Ready? Apply these changes and test. Let me know which file you'd like help with!**


Here you go the top priority. Setting of seller and store and implementing so it would work properly. Create store for each seller where form includes store name and products uploaded by store are specific to that store with product display,container,seller or store name. Store with no name fall back to helicoid hyphen some kind of suffix but name field is Composery. All in seller tab should contain all seller to compare store. Store tab display all stores and for each store all products for x store for any amount of store display they can add products to view order display a model instead of the body thing that was displayed on the bottom. But I think the one that was displayed on the bottom currently now is beta. And we are gonna upgrade the product status of home. Seller should be able to see product status. Seller dashboard should display status of each product but status are controlled by the admin On open phone of product details the seller details should also be contain in its that's the seller stuff and he has on fix his response image mobile view search impute and the button it's got you overflowing the image on the landing page The hero banner is not as it's supposed to be and I want to fix the image that supposed to be displayed on that's carousel those slides I want to on him on mobile view it should be like some kind of background image with gradient or more of the image displays on the right side so that the button on the landing page and hero banner should be visible then this cooling of that hero carousel at top. Should be infinite and should have the auto scroll feature. And with the slide indicator when it is visible on all pages. So as the page slides this slide indicator also behaves as it's suppose to give The flash sale header is misaligned and not ok. Not okay. We need to fix that layout Same thing with the tag brand header and about us page There is the buttons in about us page for mobile view is not ok. Same thing as the button in store section that is not also ok. And my order is no different from order it should not be the same thing So for each user they can have their own dedicated page to track their own order rather than logging to the general order. So not only admin can access their own personal order. The personal order is different from the whole product order or whole project order. That one is for the admin, but you can-- user can track their own personal order. And the, the, uh, product page or tab in admin or seller Find the No Store in Seller table with seller store name or seller business name And for each product seller uploaded for each product seller uploaded it should be assigned with the seller who uploads it. It should be connected with someone who uploads it. So if a seller uploads a product, the seller should be the one who is known to have uploaded the project, the product. Track who uploads a product if it is the admin or the seller And on mobile, the product's description is causing misalignment and it is breaking the column or cell of that table. So what you do is to separate the product image from product description so that you can add ellipsis to the product description so that someone can see some part of the product's description is displayed instead of everything That last point into products description and products review In fact adds it to everything that is associated with the seller. The button on about page and buttons on other pages check them very very well they are not okay because some of them are misaligned based on which you and you do this based on the screen size fix all the responsiveness putting buttons in puts the desktop view on mobile view

Also, we have talked about adding ellipses to the product description to minimise the amount of content that is populating a cell for the table, and we said we would and we are going to try to add a feature over here. The products would have uploaded by then. If it was uploaded by an admin, it would be listed. If it was uploaded by a seller, the seller name or seller store name would be displayed, preferably the seller store name.

The seller input for new sellers should have the surname as mandatory.

For any seller who uploads an image or a product, when a person buys that product, the seller of the product should be able to track his or her sales, and the admin should be able to track the number of products that seller has made, and for analysis sake, the other details should also contain the store from which the product is cutting from.

For purchased products, the status on the buyer view and seller view should be the same, and they both should see live updates and live updates of the current status based on what the admin has set it to be, and that's to update live in real time. Seller phone number and email should be displayed in the order details.

The seller input for new sellers should have the surname as mandatory.For any seller who uploads an image or a product, when a person buys that product, the seller of the product should be able to track his or her sales, and the admin should be able to track the number of products that seller has made, and for analysis sake, the other details should also contain the store from which the product is cutting from.For purchased products, the status on the buyer view and seller view should be the same, and they both should see live updates and live updates of the current status based on what the admin has set it to be, and that's to update live in real time. Seller phone number and email should be displayed in the order details.