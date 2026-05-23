---
goal: "Transform static e-commerce platform into a dynamic, server-powered architecture"
version: 1.1
date_created: 2026-05-05
last_updated: 2026-05-05
owner: "Development Team"
status: "In progress"
tags: ["feature", "upgrade", "architecture"]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

This plan outlines the steps to transform the static e-commerce platform into a dynamic, server-powered architecture using Next.js, Supabase, and Paystack.

## 1. Requirements & Constraints

- **REQ-001**: Migrate static HTML to Next.js for dynamic rendering.
- **REQ-002**: Implement Supabase for database and authentication.
- **REQ-003**: Integrate Paystack for secure payment processing.
- **REQ-004**: Build an admin dashboard for product and seller management.
- **REQ-005**: Implement automatic currency detection.
- **CON-001**: Ensure backward compatibility during migration.
- **CON-002**: Use free-tier services where possible.

## 2. Implementation Steps

### Implementation Phase 1: Architecture & Project Restructuring

- **GOAL-001**: Restructure the project for modularity.

| Task       | Description                                      | Completed | Date       |
|------------|--------------------------------------------------|-----------|------------|
| TASK-001   | Set up Next.js in `frontend/`.                   | ✅         | 2026-05-01 |
| TASK-002   | Configure Express in `backend/`.                 |           |            |
| TASK-003   | Remove old monolithic files.                     |           |            |

### Implementation Phase 2: Database & Authentication

- **GOAL-002**: Implement Supabase for database and authentication.

| Task       | Description                                      | Completed | Date       |
|------------|--------------------------------------------------|-----------|------------|
| TASK-004   | Define schema in `backend/supabase/schema.sql`.  | ✅         | 2026-05-02 |
| TASK-005   | Integrate Supabase Auth in `frontend/`.          |           |            |

### Implementation Phase 3: E-Commerce Features

- **GOAL-003**: Implement dynamic rendering and e-commerce features.

| Task       | Description                                      | Completed | Date       |
|------------|--------------------------------------------------|-----------|------------|
| TASK-006   | Replace static product grids with dynamic calls. |           |            |
| TASK-007   | Implement persistent cart and wishlist.          |           |            |

### Implementation Phase 4: Admin Dashboard

- **GOAL-004**: Build an admin dashboard for product and seller management.

| Task       | Description                                      | Completed | Date       |
|------------|--------------------------------------------------|-----------|------------|
| TASK-008   | Create admin dashboard in `frontend/pages/admin`. |           |            |

## 3. Alternatives

- **ALT-001**: Use Firebase instead of Supabase (rejected due to cost).
- **ALT-002**: Use Stripe instead of Paystack (rejected due to regional limitations).

## 4. Dependencies

- **DEP-001**: Supabase free tier.
- **DEP-002**: Paystack API.

## 5. Files

- **FILE-001**: `frontend/package.json`
- **FILE-002**: `backend/package.json`
- **FILE-003**: `backend/supabase/schema.sql`

## 6. Testing

- **TEST-001**: Verify Supabase integration with mock data.
- **TEST-002**: Test Paystack webhooks.

## 7. Risks & Assumptions

- **RISK-001**: Downtime during migration.
- **ASSUMPTION-001**: Supabase free tier will meet requirements.

## 8. Related Specifications / Further Reading

- [Supabase Documentation](https://supabase.com/docs)
- [Paystack Documentation](https://paystack.com/docs)
