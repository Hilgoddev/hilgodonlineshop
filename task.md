# Frontend Refactoring Tasks

## Phase 1: Mobile-First CSS Foundation & Critical Overflows

- `[x]` **Global CSS Updates (`main.css`)**
  - `[x]` Implement fluid typography using `clamp()`
  - `[x]` Create button layout system (`.btn-mobile-full`, `.btn-group`, `.btn-sm` min-height 44px)
  - `[x]` Harmonize button heights with transparent borders
- `[x]` **Products CSS (`products.css`)**
  - `[x]` Fix Mobile List-View shatter (remove 200px hardcoded width)
  - `[x]` Convert filter sidebar to bottom-sheet slide-up drawer on `< lg`
  - `[x]` Update product catalog grids to step up uniformly from 2 columns
  - `[x]` Add text-overflow ellipsis to product descriptions
- `[x]` **Admin Overflows (`admin/index.js`, `admin/riders.js`)**
  - `[x]` Fix Recent Orders Table horizontal overflow
  - `[x]` Fix Revenue Stat Card clipping
  - `[x]` Fix 8-column Riders table overflow (`col-hide-sm`/`md` + scroll)
- `[x]` **Pages CSS (`pages.css`)**
  - `[x]` Fix Mobile Cart Item Row layout (grid spans)
  - `[x]` Fix Checkout Step Indicator
  - `[x]` Make Auth cards full-width on phones
- `[x]` **Header & Navbar (`Navbar.js`, `header.css`)**
  - `[x]` Fix Mobile Search Toggle Icon vertical misalignment
  - `[x]` Apply correct `.btn-sm` classes for mobile search submit button
  - `[x]` Un-hide `#search-suggestions` on mobile

## Phase 2: Home Page & Component Consistency
- `[x]` **Home Page (`index.js`, `home.css`)**
  - `[x]` Implement Hero Carousel (infinite scroll, auto-scroll, slide indicators)
  - `[x]` Update Flash Sales & Featured Grids for mobile responsiveness
- `[x]` **About Page & Buttons (`about.js`)**
  - `[x]` Fix button layouts/displacements on the About page
- `[x]` **Components**
  - `[x]` Verify Modals fit on mobile screens

## Phase 3: Seller Integration & Tracking
- `[ ]` Pending...

## Phase 4: Order Experience Modernization
- `[ ]` Pending...
