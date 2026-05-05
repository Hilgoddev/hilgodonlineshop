# Backend Audit Report (NMRQ)

Date: May 4, 2026
Repository: `Hilgodonlineshop`
Auditor: Codex

## Scope
Audit performed against required delivery scope:
- Dynamic server-driven ecommerce
- Auth (email/username + Google OAuth)
- Cart/wishlist/order persistence per user
- Admin operations and metrics
- Currency auto-detection behavior
- Supabase architecture and security posture
- Payment readiness (Paystack milestone integration)

## Executive Summary
The backend foundation exists but is incomplete relative to contract requirements. Core blockers are missing route coverage, frontend/backend contract mismatches, and incomplete persistence workflows (cart/wishlist/orders/admin). Supabase integration and security middleware are present, but full production readiness has not yet been achieved.

## Critical Findings (Blockers)
1. Missing backend endpoints currently required by frontend pages:
- `/api/orders`
- `/api/orders/all`
- `/api/wishlist`
- `/api/user/profile`
- `/api/user/password`
- `/api/admin/customers`
- `/api/admin/promote`
- `/api/db-test`

2. Payment endpoint mismatch:
- Frontend calls `/api/payment/initiate`
- Backend exposes `/api/payment/initialize`
- Payload mismatch (`orderId` vs `order_id`)

3. Data model mismatch:
- Frontend uses Mongo-style `_id`
- Supabase backend schema uses UUID `id`
- This breaks cart/order/product paths unless normalized/mapped

4. Secret management risk:
- Local env contains high-value credentials
- Requires rotation and clean `.env.example` policy

## High-Risk Gaps
1. Per-user cart/wishlist persistence is not backend-driven yet (localStorage-heavy frontend flow).
2. Admin dashboard backend is not implemented (routes/service layer missing).
3. Currency logic is client-side only; no trusted backend normalization for order currency snapshots.
4. Product pagination metadata uses `count` without explicit count mode.

## What Is Already Good
1. Supabase schema is defined with RLS policies and useful triggers.
2. Auth token verification middleware exists.
3. Security middleware (`helmet`, `cors`) is active.
4. Frontend rewrite to backend API is configured.
5. Paystack webhook signature verification logic is present.

## Requirement Coverage Matrix
- Dynamic rendering: Partial
- Ecommerce core: Partial
- Admin dashboard backend: Missing
- Auth (email/password + Google OAuth): Partial
- Per-user persistence: Missing/partial
- Currency auto-detection: Partial
- Supabase integration: Present
- Payment integration readiness: Partial
- Security to industry standard: Partial

## Recommended Implementation Order
1. Contract alignment:
- Normalize route names and payload keys
- Add compatibility aliases during migration
- Normalize `id` usage and DTO mapping

2. Core commerce backend:
- Orders CRUD + status flow
- Cart items CRUD
- Wishlist CRUD
- Order tracking route

3. Account/user APIs:
- Profile read/update
- Password update flow

4. Admin APIs:
- Product management CRUD with role checks
- Seller/customer role management
- Metrics and order management

5. Payment hardening:
- Paystack initialize/verify flow alignment
- Idempotent webhook handling
- Order status transitions with audit trail

6. Security and reliability:
- Request validation (Zod/Joi)
- Rate limiting + stricter CORS and headers
- Structured logs, tests, CI gate

## Immediate Phase 1 Start (In Progress)
Started now:
1. Save this audit report in repo docs.
2. Align payment endpoint compatibility (`initiate` + `initialize` support).
3. Add missing diagnostics endpoint (`/api/db-test`) for system test page.
4. Fix product listing pagination count behavior.

