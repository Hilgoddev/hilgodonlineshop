# Goal Description

The objective is to deliver a fully functional, dynamic e-commerce web platform by transforming the existing static website into a server-powered architecture. The platform will feature robust e-commerce capabilities, an admin dashboard, user authentication, automatic currency detection, and secure payment processing. 

We will cleanly separate the frontend and backend architectures, utilizing **Supabase** for the database and authentication, and **Paystack** for payments.

## User Review Required

> [!WARNING]
> **Dynamic Rendering Framework**
> The scope of work requires "converting all hardcoded static pages to server-driven, dynamically loaded content." Since you currently have a mix of static HTML and some Next.js pages, I propose we migrate the frontend fully to **Next.js**. This perfectly aligns with the requirement for dynamic, server-driven rendering. The backend will be a separate **Node.js (Express)** service. 

> [!IMPORTANT]
> **Currency Detection Implementation**
> Automatic currency detection based on the user's region will require a geolocation service (e.g., using a free IP geolocation API or relying on Cloudflare/Vercel headers if deployed there) and a currency conversion API (like ExchangeRate-API) to fetch live rates.

## Open Questions

> [!CAUTION]
> 1. **CI/CD & Hosting Preference**: For the CI/CD pipeline and server setup, do you have a preferred hosting provider (e.g., Vercel for Frontend, Render/Heroku for Backend)?
> 2. **Currency Conversion Rates**: Should we fetch live conversion rates dynamically, or do you want to define static base exchange rates in the admin panel?

## Proposed Changes

---

### Phase 1: Architecture & Project Restructuring

We will restructure the project to strictly separate frontend and backend, setting up the foundation for CI/CD.

#### [NEW] `frontend/` (Next.js)
Migrate the existing static HTML/CSS to Next.js pages/components for full dynamic rendering.
- `src/pages/` or `src/app/` (Dynamic product pages, cart, checkout, seller zone).
- Implement server-side rendering (SSR) for SEO and dynamic data fetching.
- **Currency Context**: A global state that detects user location via IP API on initial load, setting the store currency (USD, EUR, local) accordingly.

#### [NEW] `backend/` (Node.js & Express)
Create a standalone API server to handle business logic, payments, and admin operations.
- `src/routes/` (Auth, Products, Orders, Admin, Webhooks).
- CI/CD Configuration: Add GitHub Actions workflows for automated testing and deployment.

#### [DELETE] Old Monolithic Files
- Remove old MongoDB connections (`lib/mongodb.js`), Mongoose `models/`, and mixed Next.js API routes.

---

### Phase 2: Database & Authentication (Supabase)

We will use the Supabase free tier for the database and authentication provider.

#### Backend Database Schema (`backend/supabase/schema.sql`)
- **Users**: Profile data, preferences.
- **Products**: Detailed listings.
- **Orders & Order_Items**: Order history tracking.
- **Cart & Wishlist**: Persistent per-user data.
- **Sellers**: Store details, verification status.

#### Authentication
- Implement Supabase Auth for **Email/Password** and **Google OAuth**.
- Secure session handling via HttpOnly cookies or secure JWT storage.

---

### Phase 3: E-Commerce Features & Dynamic Rendering

#### Frontend Dynamic Integration
- Connect Next.js frontend to the Express backend APIs.
- Replace all static product grids with dynamic database calls.
- Implement persistent cart and wishlist tied to the authenticated user's Supabase ID.

#### Checkout & Payment Integration
- Implement the checkout flow collecting shipping details.
- **Paystack Webhooks**: Build secure endpoints in the backend to receive Paystack payment confirmations (using credentials to be provided later).
- Update order tracking statuses dynamically based on webhook events.

---

### Phase 4: Admin Dashboard & Seller Management

#### Admin Panel Interface
- Build an authenticated dashboard restricted to `admin` roles.
- Features:
  - **Product Management**: Add, edit, and delete products dynamically.
  - **Seller Onboarding**: Manage, approve, and onboard third-party sellers.
  - **Business Metrics**: View sales analytics, order volumes, and platform metrics.

---

## Verification Plan

### Automated Tests
- Build test suites for the Express endpoints to verify data consistency with Supabase.
- Test the automatic currency detection logic using mocked IP addresses.
- Verify role-based access control (RBAC) to ensure standard users cannot access the Admin Dashboard.

### CI/CD Pipeline
- Configure a staging environment. The pipeline will automatically deploy to staging when code is pushed, allowing you to review the dynamic rendering, currency switching, and admin features before moving to production.
