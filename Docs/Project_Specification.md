# Project Specification Document

## 1) Security & Compliance

### 1.1 PCI-DSS Requirements for PayStack Integration
- Payment card data must never be stored, logged, or transmitted through application servers; checkout uses PayStack hosted flows or tokenized references only.
- Backend may store only non-sensitive payment metadata: `transaction_reference`, `status`, `amount`, `currency`, and timestamps.
- All payment callbacks must be verified by:
  - PayStack signature validation (`x-paystack-signature`)
  - Transaction reference lookup against locally initiated payment records
  - Idempotency check (same callback cannot create duplicate order state changes)
- PCI scope must be reduced to SAQ-A eligibility criteria by keeping card entry outside application UI.
- Compliance evidence required before production launch:
  - Secrets scan report showing no card data patterns in logs
  - Webhook signature verification test evidence
  - Security review sign-off by technical lead and client representative

### 1.2 Data Encryption Standards
- **In transit**
  - Enforce TLS 1.2+ for all external and internal HTTPS traffic.
  - Enable HSTS (`max-age >= 31536000`, include subdomains) in production.
  - Reject insecure HTTP except explicit redirect endpoints.
- **At rest**
  - Supabase/Postgres disk encryption enabled (platform-managed).
  - Backups encrypted at rest.
  - Any application-level sensitive fields (if introduced later) must use AES-256-GCM with key versioning metadata.
- **Key management**
  - Secrets stored only in environment variable manager (not source control).
  - Key rotation every 90 days for JWT and third-party API secrets.
  - Emergency key revocation runbook maintained and tested in staging once per quarter.

### 1.3 GDPR and Privacy Compliance
- Lawful basis and consent:
  - Explicit consent required for analytics/marketing cookies (opt-in, default off for EEA users).
  - Privacy notice must describe data categories, purpose, retention, and third-party processors.
- Data subject rights:
  - Export request fulfillment within 7 calendar days.
  - Account/data deletion request fulfillment within 30 calendar days.
  - Identity verification required before export/deletion.
- Retention policy:
  - Inactive account PII reviewed after 24 months.
  - Operational logs retained 90 days.
  - Payment/order records retained per finance/legal policy (minimum 7 years where required).
- Cross-border controls:
  - Use approved processor terms and transfer safeguards for EEA user data.

### 1.4 PayStack Credentials Release Process (Milestone-Gated)
- Credentials are released progressively and never shared in plain text chat/email.
- **Milestone A (Dev test key release) conditions**
  - Auth, cart, and order creation pass QA test suite in staging.
  - Order total tampering test fails as expected (server-side recalculation enforced).
  - Security checklist (no hardcoded secrets, CORS whitelist, baseline rate limit) signed by backend lead.
- **Milestone B (Staging live-test key release) conditions**
  - Callback verification and idempotency tests pass.
  - End-to-end checkout test pass rate = 100% for 10 consecutive runs.
  - Pen test critical/high findings count = 0.
- **Milestone C (Production key release) conditions**
  - UAT sign-off by client product owner.
  - Deployment rollback drill completed in prior 14 days.
  - Monitoring/alerting dashboards and on-call schedule active.
  - Formal go-live approval recorded by client stakeholder and contractor lead.

### 1.5 Rate Limiting Specifications
- Authentication endpoints (`/auth/login`, `/auth/signup`, `/auth/refresh`):
  - 5 requests per 15 minutes per IP
  - lockout response `429` with `Retry-After` header
- Payment initiation endpoints:
  - 10 requests per hour per authenticated user
- Public catalog/search endpoints:
  - 120 requests per minute per IP
- General authenticated API:
  - 300 requests per minute per user token
- Admin endpoints:
  - 60 requests per minute per admin user
- Enforcement requirements:
  - Sliding window or token bucket algorithm
  - Structured security logs for limit breaches
  - Alert if 429 rate exceeds 5% over 5-minute window

### 1.6 DDoS Protection Strategy
- Use managed WAF/CDN (Cloudflare or equivalent) in front of frontend and API origin.
- Enable:
  - Bot mitigation
  - Geographic/IP reputation filtering
  - Layer-7 rate limiting at edge
- Auto-mitigation requirements:
  - Challenge mode enabled after anomaly threshold breach
  - Temporary block rules for top offending IP ranges
- Resilience requirements:
  - API and static assets served behind caching and edge distribution
  - Run DDoS simulation test in staging once per release cycle

### 1.7 Backup and Disaster Recovery SLAs
- **Database backups**
  - Point-in-time recovery enabled
  - Daily full snapshot and 15-minute WAL/archive equivalent coverage
- **RPO target:** <= 15 minutes
- **RTO target:** <= 2 hours for critical commerce functions (browse, cart, checkout)
- DR testing:
  - Restore drill monthly in staging
  - Full failover simulation quarterly
- Success criteria:
  - Restored data passes integrity checks
  - API health checks green within RTO window

## 2) Technical Architecture

### 2.1 Supabase Auth Methods (Explicit Scope)
- Supported methods for MVP:
  - Email/password (required)
  - Google OAuth (required)
  - Magic link/passwordless (required for account recovery and optional login)
- Not in MVP:
  - Phone OTP
  - Enterprise SSO (SAML/OIDC custom providers)
- Session rules:
  - Access token TTL: 60 minutes
  - Refresh token rotation enabled
  - Server endpoints verify JWT and enforce role-based authorization

### 2.2 Currency Detection and Fallback Logic
- Primary signal order:
  1. User saved preference (if authenticated)
  2. Billing/shipping country (during checkout)
  3. IP geolocation from backend provider (single provider with cached response)
  4. Browser locale (`Accept-Language`) fallback
  5. Default currency = USD
- Implementation requirements:
  - Geolocation lookups executed server-side, not directly from client.
  - Exchange rates sourced by backend endpoint with 24-hour cache TTL.
  - If rates provider fails, use last-known-good rates up to 72 hours; then fallback to static emergency rates.
- Display behavior:
  - Currency can be manually changed by user and persisted to profile/local storage.

### 2.3 API Documentation Standard
- All backend endpoints must be documented in OpenAPI 3.1 format.
- Swagger UI must be available in non-production environments.
- Documentation includes:
  - Request/response schema
  - Auth requirements
  - Error codes
  - Example payloads
- Approval workflow:
  - Backend lead reviews schema correctness.
  - QA lead verifies examples against running staging API.
  - Product owner signs off on public contract changes before release.

### 2.4 Error Handling, Logging, and Monitoring Stack
- API error response contract:
  - `{ code, message, details?, requestId, timestamp }`
- Standard error codes:
  - `AUTH_INVALID_CREDENTIALS`, `AUTH_FORBIDDEN`, `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `RATE_LIMITED`, `PAYMENT_FAILED`, `INTERNAL_ERROR`
- Logging requirements:
  - Structured JSON logs with `level`, `service`, `route`, `userId?`, `requestId`, `errorCode`.
  - No secrets or cardholder data in logs.
- Monitoring tool:
  - Datadog (preferred) or equivalent APM/log platform.
  - Alert routing to on-call channel and email escalation.

### 2.5 Monitoring and Alerting Metrics
- Metrics tracked:
  - API p95 latency
  - API error rate (4xx/5xx split)
  - Checkout success rate
  - Payment callback failure rate
  - Database CPU, connection saturation, slow query count
  - Frontend Core Web Vitals (LCP, INP, CLS)
  - Uptime/health check status
- Alert thresholds:
  - API p95 latency > 800ms for 10 minutes
  - 5xx rate > 2% for 5 minutes
  - Checkout success rate < 98% over 15 minutes
  - Uptime probe failure for 3 consecutive checks (1-minute intervals)

### 2.6 Guest Checkout Requirements
- Guest checkout is supported and required.
- Guest users can:
  - Add/remove cart items
  - Checkout using email + shipping details
  - Receive order confirmation and tracking links
- Guest order must be linkable to a future account by verified email claim process.
- Optional account creation offered post-purchase without blocking checkout completion.

### 2.7 Order Tracking Scope
- Order states (minimum):
  - `pending_payment`, `paid`, `processing`, `shipped`, `out_for_delivery`, `delivered`, `cancelled`, `refunded`
- State transitions must be timestamped and auditable.
- Real-time updates:
  - Authenticated users receive updates via polling (<=60s interval) or realtime subscriptions.
- Notifications:
  - Email notifications required for `paid`, `shipped`, `delivered`, `cancelled`, `refunded`.

## 3) Feature Requirements

### 3.1 Admin Dashboard (10 Required Operations)
1. View total users, sellers, products, orders, revenue summary.
2. Approve/reject seller applications with audit notes.
3. Create/edit/archive products.
4. Bulk update inventory levels and low-stock thresholds.
5. Manage order lifecycle updates and refunds.
6. View customer accounts and suspend/reactivate users.
7. Moderate product reviews (hide/restore/delete by policy).
8. Configure promo banners/featured products.
9. Export sales, product, and customer reports (CSV).
10. View system alerts (payment failures, high error rates, stock issues).

Acceptance criteria: each operation must have role-restricted API, UI action, audit trail event, and QA test case.

### 3.2 Authentication Flows and Edge Cases
- Required user flows:
  - Sign up with email/password
  - Login with email/password
  - Login with Google OAuth
  - Magic-link login
  - Logout (single session)
  - Password reset (email token flow)
- Edge cases:
  - Duplicate email attempts return deterministic validation error
  - Unverified email handling defined (restricted actions)
  - Expired/invalid token handling with safe redirect
  - Simultaneous sessions behavior defined (allowed, revokable)
  - Account lock behavior after repeated failed logins

### 3.3 Search and Filtering
- Search capabilities:
  - Free-text query on product name, description, brand, SKU
- Filters:
  - Category/subcategory
  - Brand
  - Price range (min/max)
  - Rating (minimum star threshold)
  - Availability (`in_stock`, `out_of_stock`)
  - Seller/store
  - Discounted items only
- Sorting options:
  - Relevance
  - Price (low-high, high-low)
  - Newest
  - Best rated
  - Most popular
- Acceptance criteria:
  - Filter state reflected in URL query parameters.
  - Combined filters return consistent paginated results.

### 3.4 Cart Requirements
- Max items:
  - 100 distinct items per cart
  - max quantity 20 per line item
- Session behavior:
  - Guest cart expires after 30 days inactivity
  - Authenticated cart persists until checkout or manual clear
- Recovery behavior:
  - Guest cart merges into account cart on login with duplicate SKU quantity resolution rule.
- Validation:
  - Quantity cannot exceed available stock at checkout.

### 3.5 Wishlist Requirements
- Users can add/remove items and maintain up to 500 wishlist entries.
- Sharing:
  - Public shareable wishlist link optional in MVP (enabled by account setting).
- Notifications:
  - Price drop alert email when item drops by >=10% since last saved price (daily digest max).
  - Back-in-stock notification for out-of-stock wishlist items.

### 3.6 Product Catalog Requirements
- Pagination:
  - Default page size 24, max page size 60
- Sorting:
  - See section 3.3 sorting list (must be supported in catalog APIs)
- Images:
  - Store optimized variants (thumbnail, medium, zoom)
  - Preferred formats: WebP/AVIF with JPEG fallback
  - Lazy-load non-critical images
  - Main product image target size <= 250KB after optimization
- Product data minimum fields:
  - name, slug, SKU, category, price, stock, brand, description, image set, seller_id

## 4) Non-Functional Requirements

### 4.1 Performance SLAs
- Home page Largest Contentful Paint (LCP): <= 2.0s on 4G mid-tier mobile.
- Product listing page interactive load: <= 2.5s.
- Product detail page interactive load: <= 3.0s.
- Checkout page interactive load: <= 3.0s.

### 4.2 API Performance Targets
- Search endpoint p95 response time: <= 500ms.
- Product detail endpoint p95 response time: <= 300ms.
- Cart mutation endpoints p95 response time: <= 400ms.
- Order creation endpoint p95 response time: <= 700ms (excluding external payment redirect roundtrip).

### 4.3 Reliability and Availability
- Monthly uptime target: >= 99.9% for production web and API.
- Planned maintenance windows must be announced >= 48 hours in advance.
- Failed deploy rollback initiation: <= 15 minutes from incident declaration.

### 4.4 Capacity Targets
- Support 1,500 concurrent active users at MVP launch without SLA breach.
- Support flash-sale bursts of 5x normal traffic for 15-minute windows.
- Database connection saturation must remain below 80% sustained utilization.

### 4.5 Database Query Performance
- No critical endpoint query should exceed 200ms p95 at baseline load.
- Slow query threshold logging at >150ms.
- Index review required for any query exceeding threshold for 3 consecutive days.

### 4.6 Mobile Responsiveness and Performance
- Required responsive breakpoints:
  - 360px (small phones)
  - 768px (tablets)
  - 1024px (small laptops)
  - 1280px+ (desktop)
- CLS <= 0.1 and INP <= 200ms on mobile for primary commerce pages.

## 5) Project Timeline

Assumed project start date: **12 May 2026**.

### Milestone 1 - Security Baseline Complete (Target: 26 May 2026)
- Deliverables:
  - RLS enabled and tested for all exposed tables
  - Order total server-side validation
  - CORS whitelist and secret management in place
  - Rate limiting baseline configured
- PayStack release condition:
  - Dev test credentials released only after passing security checklist and tampering tests
- Testing required:
  - Security regression suite + auth brute-force test + order tampering test
- Definition of complete:
  - All Phase 1 acceptance tests pass; stakeholder security sign-off recorded

### Milestone 2 - Core Commerce Backend Stable (Target: 9 Jun 2026)
- Deliverables:
  - Auth flows, cart, wishlist, products, orders, guest checkout APIs complete
  - OpenAPI spec for all core endpoints
- PayStack release condition:
  - No live credentials yet; sandbox integration must pass 100% of contract tests
- Testing required:
  - Unit + integration test pass rate 100% in CI
- Definition of complete:
  - API feature parity achieved and QA verified in staging

### Milestone 3 - Seller and Admin Operations (Target: 23 Jun 2026)
- Deliverables:
  - Seller application/approval workflow
  - Admin dashboard operations (all 10 required capabilities)
  - Admin stats endpoint and optimized queries
- PayStack release condition:
  - Staging live-test credential release only after callback verification + idempotency tests pass
- Testing required:
  - Role/permission tests and admin workflow e2e suite
- Definition of complete:
  - Product owner approval on admin/seller workflows

### Milestone 4 - Payments and Checkout Hardening (Target: 7 Jul 2026)
- Deliverables:
  - PayStack integration end-to-end
  - Webhook validation, retry, and reconciliation jobs
  - Payment observability dashboards
- PayStack release condition:
  - Production credential release gate checklist prepared (not released until milestone 6 gate)
- Testing required:
  - 10 consecutive successful e2e payment runs in staging
- Definition of complete:
  - Checkout + payment acceptance criteria satisfied

### Milestone 5 - Performance, Monitoring, and DR Readiness (Target: 21 Jul 2026)
- Deliverables:
  - SLA monitoring dashboards and alerts
  - Load test reports against target concurrency
  - Backup/restore and DR drill evidence
- PayStack release condition:
  - Production key release allowed only if performance and DR criteria pass
- Testing required:
  - Load, stress, and failover simulation tests
- Definition of complete:
  - Non-functional targets met or approved with documented exceptions

### Milestone 6 - UAT and Production Go-Live (Target: 4 Aug 2026)
- Deliverables:
  - UAT fixes closed
  - CI/CD pipeline with rollback capability active
  - Production runbooks and on-call schedule active
- PayStack release condition:
  - Production credentials released at go-live gate after formal dual sign-off
- Testing required:
  - UAT completion certificate + release readiness checklist
- Definition of complete:
  - Stakeholder sign-off and production deployment successful

Approval gate requirement for every milestone:
- Engineering lead approval
- QA lead approval
- Product owner/client stakeholder sign-off
- No open critical severity defects

## 6) Quality Assurance

### 6.1 Unit Testing
- Coverage targets:
  - >= 80% for business logic modules
  - >= 70% overall backend line coverage
- Mandatory coverage areas:
  - Pricing calculations
  - Auth/session utilities
  - Role/permission helpers
  - Currency conversion utilities

### 6.2 Integration and End-to-End Testing
- Required e2e flows:
  - Signup/login/logout (email/password + Google OAuth + magic link)
  - Product browse/search/filter + pagination
  - Cart add/update/remove + merge on login
  - Guest checkout and authenticated checkout
  - Payment callback processing and idempotency
  - Seller apply -> admin approve -> seller actions
  - Order tracking state transitions and notifications

### 6.3 Performance Testing
- Load testing tool: k6 (or equivalent) in CI/nightly pipeline.
- Baseline load scenario:
  - 500 virtual users sustained for 30 minutes
- Peak scenario:
  - 1,500 concurrent users with burst traffic for 15 minutes
- Pass criteria:
  - API latency/error targets from section 4 maintained

### 6.4 Security Testing
- Automated:
  - Dependency vulnerability scans on every PR
  - SAST on backend/frontend code
- Manual:
  - Quarterly penetration test covering auth, payment flows, RLS bypass attempts, and privilege escalation
- Release gate:
  - No open critical or high vulnerabilities without documented accepted risk signed by client

### 6.5 UAT Requirements
- UAT participants:
  - Client product owner
  - Operations representative
  - At least 2 designated business users
- Approval criteria:
  - 100% pass of critical business scenarios
  - <= 3 minor defects, with approved remediation plan
  - Formal sign-off document stored in project records

### 6.6 Staging Environment Standards
- Staging must mirror production architecture, env vars (with non-production secrets), and feature flags.
- Data refresh strategy:
  - Weekly masked production-like data refresh
  - On-demand refresh before UAT cycles
- Access controls:
  - Restricted to project team and client UAT users only.

## 7) Deployment & Operations

### 7.1 CI/CD Pipeline Stages
- Trigger:
  - Pull request: lint, tests, security scans, build
  - Merge to main: full test suite + deploy to staging
  - Tagged release: production deployment workflow
- Required stages:
  1. Install and dependency integrity checks
  2. Lint and type checks
  3. Unit + integration tests
  4. Security scanning
  5. Build artifacts
  6. Deploy
  7. Post-deploy smoke tests

### 7.2 Deployment Approval Process
- Staging deployment approval: engineering lead or delegated senior engineer.
- Production deployment approvals (two-person rule):
  - Engineering lead
  - Product owner/client approver
- Change record required for every production release.

### 7.3 Rollback Procedure
- Rollback conditions:
  - 5xx error rate > 5% for 5 minutes post-deploy
  - Critical checkout/auth failures
  - Data integrity issue detected
- Rollback steps:
  1. Trigger previous stable release deployment
  2. Run DB compatibility check
  3. Run smoke tests
  4. Declare incident status and communicate update

### 7.4 Zero-Downtime Deployment Strategy
- Use rolling or blue-green deployment strategy.
- Database migrations must be backward compatible before app switch-over.
- Session and cache strategy must avoid user logout during standard deploys.

### 7.5 Database Migration Strategy
- Each migration must include:
  - Forward SQL
  - Rollback SQL (or compensating script)
  - Impact note
- Migration validation:
  - Apply on staging snapshot before production
  - Verify indexes and RLS policies after migration

### 7.6 Dashboards, On-Call, and Incident Response
- Dashboards required:
  - API latency/error
  - Checkout/payment funnel
  - DB health and slow queries
  - Frontend performance and uptime
- On-call:
  - Weekly rota with primary/secondary responders
  - Response SLA: acknowledge critical alert within 10 minutes
- Incident response:
  - Severity model (SEV1-SEV4)
  - SEV1 postmortem required within 72 hours
  - Corrective actions tracked to closure

## 8) Completion Checklist (Sign-Off Gate)

- [x] All ambiguous terms replaced with measurable criteria.
- [x] Security and compliance requirements are defined and testable.
- [x] All major features include explicit acceptance criteria.
- [x] Timeline includes specific dates, gates, and completion definitions.
- [x] Non-functional requirements contain measurable SLAs/targets.
- [x] Testing, deployment, and operations procedures are fully specified.
- [x] No open requirement questions remain for development kickoff.

## Final Sign-Off Statement

This specification is approved as the baseline requirements document for implementation, testing, deployment, and go-live governance of the e-commerce platform, subject only to formal change-control updates.