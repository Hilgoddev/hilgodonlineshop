# Hilgod Online Store — Platform Features Report

**Prepared by:** Walter Akhigbe — Full-Stack Developer
**Email:** akhigbeabdulwahab354@gmail.com
**GitHub:** github.com/walter-sdq
**Date:** 15 June 2026

---

## Overview

**Hilgod Online Store** is a fully functional, live multi-vendor e-commerce platform built for the Nigerian market. It is accessible at **[https://www.hilgod.com](https://www.hilgod.com)**.

The platform serves three types of users — **customers** who shop, **sellers** who list and sell products, and **admins** who manage the entire platform. Each has a dedicated, purpose-built experience. This report describes every feature currently live on the platform and how it works.

---

## 1. Customer Experience

### 1.1 Browsing & Discovery

Customers land on the homepage and can immediately begin browsing. The homepage shows active campaign banners (flash sales, Black Friday, Easter) alongside a curated product feed. Products load dynamically and are updated in real time.

**Search & Filtering** — Customers can search for products by keyword. Results can be filtered by category, subcategory, price range, availability (in stock only), and sale status. Filters can be combined freely.

**Categories** — The full category tree is accessible from the navigation and from a dedicated `/categories` page. Each category page shows all relevant products with the same filtering options.

**Deals Hub** — The `/deals` page automatically aggregates every discounted product across all sellers and campaigns into one place, so customers never have to hunt for deals.

**Flash Sales & Campaigns** — Time-limited sales appear as homepage banners and in the deals hub. Each campaign (flash sale, Black Friday, Easter) has its own themed section with a visual countdown.

**Product Pages** — Each product has a dedicated page with photos, description, pricing, available variants (size and colour), the seller's details, customer reviews, and a star rating. Colour options are shown as readable names rather than colour swatches or hex codes, which is clearer for mobile shoppers.

---

### 1.2 Account & Authentication

Customers create an account using their email address and a password, or they can sign in instantly with their **Google account** — no password required.

Once signed in, a customer's cart, wishlist, and order history are tied to their account and available from any device.

**Password Reset** — Customers who forget their password can request a reset link via email from the login page.

---

### 1.3 Shopping Cart & Wishlist

**Cart** — Adding a product to the cart saves it to the customer's account. If they close the browser or come back the next day, their cart is still there. When a product has variants (size or colour), the customer selects their choice before adding to cart, and the selected option is shown clearly in the cart.

**Wishlist** — Products can be saved to a wishlist for later. The wishlist is accessible from the account dashboard and persists across sessions.

---

### 1.4 Checkout

The checkout is a guided three-step process:

1. **Delivery Address** — The customer enters their delivery address. Country and state dropdowns are pre-populated with a comprehensive list (covering all 37 Nigerian states). For states not in the list, a free-text field appears automatically.

2. **Payment Method** — The customer chooses how to pay. The available options are:
   - **Paystack** — Card payment and bank transfer processed through Paystack's secure payment page. This is the primary option for Nigerian customers.
   - **Stripe** — International card payments for customers paying in currencies other than NGN.
   - **Pay on Delivery (POD)** — The customer pays in cash when their order arrives. No card or transfer required to place the order.
   - **Bank Transfer** — Direct transfer to the business's bank account (can be enabled via a simple configuration switch).

3. **Order Review** — A full summary of items, quantities, prices, delivery fee, and total before confirming.

**Delivery Fee** — Automatically calculated. Orders above ₦50,000 qualify for free delivery; a flat fee applies below that threshold.

**After Payment** — For Paystack, the customer is redirected to Paystack's hosted payment page and returned to the store after completion. For Stripe, the card form appears inline within the checkout. For pay on delivery, the order is confirmed immediately.

---

### 1.5 Order Tracking

After placing an order, customers can track its progress from their **Account Dashboard** under "My Orders". Every order shows a visual status timeline:

- **Pending → Processing → Shipped → Delivered**

Pay-on-delivery orders show a modified timeline that skips the payment step, since payment happens at the door.

When the admin or seller updates an order status, the customer receives an **automated email notification** with the new status and any message the admin has added.

---

### 1.6 Returns

Customers can submit a return or refund request from the **Return Request** page (`/return-request`). The form collects the order ID, email address, reason for return, and optional additional details. Requests must be submitted within 7 days of delivery.

Submitting the form triggers an immediate email to the Hilgod support team. The customer also receives a confirmation email. A login is required to submit a return, which links the request securely to the customer's account and order history.

---

### 1.7 Reviews & Ratings

Customers can leave a star rating and a written review on any product they have purchased. Reviews are visible to all shoppers on the product page and contribute to the product's overall rating displayed in listings.

---

### 1.8 Contact with Sellers

On every product page, there is a **WhatsApp** button that opens a direct conversation with the seller. Customers can ask product questions, request custom orders, or follow up on a purchase — without leaving the site.

---

## 2. Seller Experience

### 2.1 Becoming a Seller

Anyone can apply to become a seller by visiting `/seller-zone` and filling in the seller application form. The admin reviews the application and either approves or rejects it. The applicant receives an email with the decision. Once approved, the seller gains access to the full seller dashboard.

---

### 2.2 Seller Dashboard

The dashboard is the seller's home base. It shows live statistics at a glance:

- **Total products** listed
- **Units sold** across all time
- **Gross revenue** (the total paid by customers for the seller's products)
- **Net earnings** (gross revenue after the platform's commission is deducted)
- **Available balance** (net earnings minus any withdrawals already made)

All figures are drawn from real paid orders only. Pay-on-delivery orders are excluded from earnings until the order is marked as delivered.

---

### 2.3 Product Management

Sellers manage their products from the dashboard. For each product they can:

- Add a title, description, category and subcategory, and price
- Upload one or more photos directly from their device (the platform validates the file type and rejects images over 5 MB)
- Set stock quantity
- Add product variants — size options (e.g. S, M, L, XL) and colour options (entered as colour names, shown as names on the product page)
- Mark a product as on sale and set a sale price
- Toggle a product as active or inactive

New products are submitted for admin review before going live. If the admin has enabled **auto-approve**, products from approved sellers go live immediately without waiting for review.

---

### 2.4 Order Management

Sellers can see all customer orders that contain their products. For each order item, they can update the **fulfilment status**:

- **Packed** — the item has been prepared for dispatch
- **Shipped** — the item is on its way
- **Delivered** — the item has reached the customer
- **Cancelled** — the item has been cancelled (stock is automatically restored)

Each status update is visible to the customer in their order tracking view.

---

### 2.5 Payouts

When a seller wants to withdraw their available balance, they submit a **payout request** from the Payouts section of their dashboard. The request form asks for the amount and their bank account details (bank name, account name, and account number). The platform saves these details so they are pre-filled automatically on future requests.

The admin reviews payout requests, checks the bank details, and marks them as approved or paid. The seller receives an email update at each stage.

---

### 2.6 Public Storefront

Every approved seller gets a public-facing store page at `/stores/[seller-slug]`. The page shows the seller's profile, all their active products, and a WhatsApp contact button so customers can reach them directly.

---

## 3. Admin Experience

The admin panel is accessible at `/admin` and is restricted to admin-role accounts only.

### 3.1 Platform Dashboard

The admin dashboard shows live platform metrics:

- **Total revenue** (all paid orders, excluding POD orders not yet delivered)
- **Total orders** placed
- **Units sold**
- **Active sellers** and total registered users
- **Live products** on the platform
- **Pending approvals** (products, sellers, stores) requiring action

A **revenue trend chart** shows performance over recent periods, and a **commission breakdown** shows how much of total revenue has been retained as platform income. **Low-stock alerts** flag products that are running low and may need attention.

---

### 3.2 Order Management

Admins have full visibility of all orders across all sellers. From the orders list they can:

- View complete order details (items, quantities, prices, delivery address, payment method)
- Update the order status
- Compose and send a **custom email** to the customer directly from the order view — useful for delays, queries, or personalised updates
- Automated status-change emails are sent to customers whenever the order status changes

---

### 3.3 Product Approvals

When a seller submits a new product (or auto-approve is off), it appears in the admin's **Product Approvals** queue. The admin can view the full product detail inline — photos, description, pricing, variants — and approve or reject it with a single click. Rejected products are returned to the seller with a notification.

---

### 3.4 Seller & Store Approvals

Seller applications and store listing requests appear in their own approval queues. The admin reviews the details and approves or rejects with a single action. The applicant is emailed with the outcome immediately.

---

### 3.5 User Management

The admin can view a list of all registered users on the platform. For any user, the admin can switch their role between **Customer**, **Seller**, and **Admin** with a single click — no manual database changes required.

---

### 3.6 Category Management

The admin controls the full category tree. Categories and subcategories can be created, edited, or removed. Changes are reflected immediately across the entire storefront — in navigation, filter panels, and product pages.

---

### 3.7 Campaign Manager

The platform supports three campaign types: **Flash Sale**, **Black Friday**, and **Easter Sale**. The admin manages all campaigns from a single screen.

For each campaign the admin sets:
- The campaign name and type
- Start and end dates
- Which products are included (or a discount percentage applied platform-wide)

Active campaigns appear automatically on the homepage as themed hero banners and populate the Deals Hub.

---

### 3.8 Payout Management

All seller payout requests are listed in the **Payouts** section with full details: the seller's name, the requested amount, their bank name, account name, and account number. The admin can approve or reject each request and mark approved ones as paid once the transfer has been made. Sellers receive email notifications at each stage.

---

### 3.9 Rider Applications

Delivery partners apply through the platform's `/delivery` page. The admin reviews rider applications — which include the applicant's details and vehicle information — and approves or rejects them. Approved riders are onboarded as delivery partners.

---

### 3.10 Platform Settings

A centralised settings panel gives the admin control over platform-wide configuration, including:

- **Auto-approve toggle** — when enabled, products uploaded by approved sellers go live without manual review
- Commission rate and delivery fee are defined in the codebase as a single source of truth, ensuring consistency across all calculations

---

## 4. Payment System

The platform supports four payment methods, designed to cover the full range of Nigerian shoppers:

| Method | How It Works |
|---|---|
| **Paystack** | Customer is redirected to Paystack's hosted payment page. On success, the customer is returned to the store and the order is confirmed automatically via a webhook. |
| **Stripe** | Card details are entered inline within the checkout page. No redirect is required. Supports 3D Secure for extra security. |
| **Bank Transfer** | Customer sees the business bank account details after placing the order and transfers the amount manually. Admin confirms receipt and updates the order. |
| **Pay on Delivery** | Customer pays in cash at the door. The order is created immediately; no upfront payment is required. Earnings are only counted once the order is marked delivered. |

All payments are verified server-side before any order is confirmed. The amount is always read from the database — not from the customer's browser — so the final price cannot be altered by the customer.

---

## 5. Email Notifications

The platform sends automated emails at every meaningful point in a customer or seller's journey:

| Event | Who Receives It |
|---|---|
| Order placed | Customer |
| Order status updated | Customer |
| Custom message from admin | Customer |
| Return request submitted | Customer + Admin |
| Seller application approved / rejected | Applicant |
| New product approved / rejected | Seller |
| Payout request received | Admin |
| Payout request approved or paid | Seller |
| Career application submitted | Applicant + Admin |

All emails are sent from branded Hilgod addresses using Resend, a professional email delivery service.

---

## 6. Future Development Opportunities

The following features are scoped and partially prepared — they represent natural next phases of the platform and can be engaged as direct contractor work or future development requests.

---

### 6.1 Admin — Return Requests Management

**Current state:** Customers can submit return requests, the platform stores them, and admin is notified by email. Stock is automatically restored when a return is approved via the API.

**Next phase:** An admin returns page listing all submissions with status filters (pending / approved / rejected / refunded) and one-click approve, reject, and refund actions. The backend for this is fully built and ready — only the admin UI page is needed.

---

### 6.2 Admin — Career Applications Management

**Current state:** Job seekers can apply via `/careers`, applications are saved to the database, and admin receives an email for each submission.

**Next phase:** An admin interface for reviewing applications — filtering by status, reading cover notes and CV links, and updating applicants through the hiring pipeline (new → reviewing → shortlisted → rejected → hired).

---

### 6.3 Bank Transfer — Live Activation

**Current state:** The bank transfer payment flow is fully built on both the customer checkout and the backend. It is currently hidden behind a feature switch.

**Next phase:** No development required — simply flip the `NEXT_PUBLIC_BANK_TRANSFER_ENABLED` configuration switch to activate it for customers.

---

### 6.4 OPay Payment Integration

**Current state:** OPay is not yet integrated.

**Next phase:** Full OPay payment flow — API integration, webhook verification, and a checkout option for customers. Popular with Nigerian shoppers and a strong addition to the payment suite.

---

### 6.5 Dynamic Blog

**Current state:** A blog section exists with static articles and is currently showing a "Coming Soon" page. It can be activated with a configuration switch to show the existing content.

**Next phase:** Integration with a content management system (CMS) so Hilgod staff can write, publish, and manage blog posts without developer involvement — shopping tips, seller spotlights, delivery updates, and more.

---

### 6.6 Product Reviews Page

**Current state:** Individual product reviews and ratings are live. A platform-wide reviews page (`/reviews`) also exists in the codebase.

**Next phase:** Link the reviews page from the footer. All code for it is already written — this is a one-line configuration change, plus a decision on whether to launch it as-is.

---

### 6.7 Womenswear as a Dedicated Subcategory

**Current state:** The "Ladies" category currently maps to Womenswear as a compatibility alias.

**Next phase:** Migrate Womenswear into a proper subcategory under the Fashion or Clothing parent, with its own dedicated URL, filter behaviour, and listing page.

---

### 6.8 Mobile Application

**Current state:** App Store and Google Play buttons are visible in the footer as placeholders.

**Next phase:** A native mobile application (iOS and Android) for customers to shop on the go. The platform's existing backend API is designed for multi-client use and would power the mobile app without changes.

---

*Report prepared by Walter Akhigbe — Full-Stack Developer*
*akhigbeabdulwahab354@gmail.com · github.com/walter-sdq*
*15 June 2026*
