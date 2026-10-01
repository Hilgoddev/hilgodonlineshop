# Mobile & Responsiveness Audit

**Date:** 2026-10-01 · **Target:** 320px minimum width · **Scope:** whole project

## How this was measured

Public pages were loaded in real Chrome at **320 / 360 / 390px** (iPhone user-agent, touch emulation) against the dev
server, and measured in-page: document width, every element's bounding box, every interactive element's hit area, and
computed font sizes. Crucially, `overflow-x: hidden` was **neutralised during measurement**, because
`css/main.css:103` hides all horizontal overflow and would otherwise make every page look clean.

Admin and seller pages are behind a login, so they were audited from source instead of screenshots.

A dead-code pass compared all 620 CSS class selectors against every class name used in JSX.

---

## Summary

| | Result |
|---|---|
| Horizontal overflow, public pages @320px | **None.** All 24 routes measured clean |
| Pages where overflow is only *masked* | **None** — `overflow-x: hidden` is currently hiding nothing |
| Touch targets under 44px | **Widespread**, including the header on every page and "Add to Cart" |
| Inputs that trigger iOS zoom-on-focus | 3 confirmed on public pages, plus all `.form-input` fields (15.2px) |
| Safe-area handling (notch / home indicator) | **None anywhere** — zero `env(safe-area-inset-*)` |
| Dashboard tables unreachable on a phone | **None** — all 15 already have scroll wrappers |
| Dead CSS | **255 of 620 classes (41%) unused**; `css/fix.module.css` never imported |

The headline: **layout is in better shape than expected — nothing overflows.** The real weaknesses are hit areas,
input zoom, safe areas, and a handful of specific dashboard defects.

---

## A. Header action cluster — the misaligned search button

Measured on **all 20 public pages** at 320px:

| Control | Measured | Problem |
|---|---|---|
| Account icon (`a.header-action-btn`) | 19×19 | Under 44px |
| Cart icon (`a.header-action-btn`) | 22×19 | Under 44px |
| Hamburger (`button#menu-toggle`) | 32×24 | Under 44px |
| **Search (`button.mobile-search-btn`)** | **36×36** | Under 44px, and the only bordered box in the row |

Four different heights sit in one centre-aligned row, and the search button carries a hand-nudge —
`style={{ marginTop: '2px' }}` at `frontend/components/Navbar.js:404` — that pushes it off the shared centre line.
It is also the only control with a border (`frontend/css/header.css:666-679`), so it reads as a pasted-in element
rather than part of the set.

Related, same area:

- `frontend/css/header.css:750, 786, 803` — the search **submit** button's width is overridden three times
  (100px → 70px → 50px) for what is now an icon-only button that already sets its own 44px minimum inline.
- `frontend/components/Navbar.js:440` — the suggestions dropdown is `position: absolute`, but
  `.mobile-search-bar .container` is not positioned, so it anchors to the sticky header instead of the input.

**Severity: Minor (cosmetic) + Major (hit areas).** Nothing is unusable, but this is the most-seen row in the app.

---

## B. Touch targets under 44px — measured, not estimated

Worst first. Sizes are real rendered boxes at 320px.

| Control | Size | Where |
|---|---|---|
| `button.slider-dot` | **8×8** | Home hero slider dots |
| `input#terms` | **13×16** | Signup terms checkbox |
| `a.header-action-btn` (Account / Cart) | **19×19 / 22×19** | Every page |
| `button#menu-toggle` | **32×24** | Every page |
| `button.toggle-password` | **26×28** | Login, signup, reset, forgot |
| `button.btn-add-cart` | **260×33** | Product detail — the primary buy action |
| `button.product-card__wishlist` | **34×34** | Every product card |
| `button.mobile-search-btn` | **36×36** | Every page |
| `a.social-link` | **36×36** | Footer, 17 pages |
| `select.sort-select` | **163×36** | Product listing |
| `.btn` / `.btn-lg` generally | **33–42px tall** | Apply to Ride, Apply Now, Shop Laptops, etc. |
| `input.newsletter-input` / `button.newsletter-btn` | **296×43** | Footer — 1px short |

The existing 44px rule at `frontend/css/main.css:546-556` only covers `.btn-sm` and `.btn-icon`, so plain `.btn`
and every hand-styled control fall through it.

**Severity: Major** for Add to Cart, the header cluster and the password toggles; **Minor** for the rest.

---

## C. iOS zoom-on-focus

Safari zooms the page when a focused input's font is under 16px. Confirmed under-size inputs:

| Input | Size |
|---|---|
| `input.newsletter-input` (footer, 17 pages) | 14.72px |
| `select.sort-select` (product listing) | 13.92px |
| `input#terms` (signup) | 13.33px |
| `.form-input` / `.form-select` / `.form-textarea` (`css/main.css:1240`) — all checkout, auth, account forms | 15.2px |

Every form in the app is 0.8px under the threshold, so **checkout zooms on every field focus**.

**Severity: Major** on checkout. **Fixing this changes text size visibly**, so it is listed as future work, not in
the fix batch.

---

## D. Safe areas (notch and home indicator)

There is **no `env(safe-area-inset-*)` anywhere**, and `_document.js` does not set `viewport-fit=cover`. Fixed
elements that land in the unsafe zone on notched iPhones:

| Element | Position |
|---|---|
| Filters bottom sheet | `frontend/css/products.css:7-21`, `bottom: 0` |
| Toast container | `frontend/css/main.css:1059-1062`, `bottom: 24px` |
| Back-to-top button | `frontend/css/footer.css:158`, `bottom: 90px` |
| Mobile drawer | `frontend/css/header.css:545-554`, `height: 100vh` |

`100vh` is also used without `dvh`/`svh` fallback in three places, so mobile browser chrome causes a jump.

**Severity: Major** for the filters sheet (its last row sits under the home indicator).

---

## E. Admin & seller dashboards (audited from source)

**Better than expected:** all 15 tables already sit in `overflowX: 'auto'` wrappers — nothing is unreachable — and
`components/admin/AdminLayout.js` is a complete mobile shell (drawer, scrim, hamburger, header de-cluttering ≤600px).

Real defects:

| Issue | Location |
|---|---|
| Button row overflows its card (~365px of content in a 288px box) | `pages/admin/flash-sales.js:372` |
| Page header does not wrap; search input **clipped** at 320px by `.card { overflow: hidden }` | `pages/admin/sellers.js:111`, `pages/admin/stores.js:108` |
| Currency labels `whiteSpace: nowrap` overlap over 42px chart columns | `pages/admin/analytics.js:165-173` |
| Form rows hardcoded `gridTemplateColumns: '1fr 1fr'`, can never collapse (~138px per field) | `admin/products.js:274,286,329` · `admin/flash-sales.js:526,540,561,602` · `admin/settings.js:205` |
| Row status `<select>` ~25–26px tall | `admin/orders.js:222`, `seller/orders.js:235` |
| Hamburger 40×40; modal close buttons ~28px | `AdminLayout.js:273`, `OrderDetailsModal.js:62` |
| `minWidth: '720px'` fights the column-hiding that already drops 4 columns | `admin/riders.js:168` |

`pages/seller/products.js:235` already solves the form problem correctly with `.seller-product-form-grid` — the
admin twin just doesn't use it.

Also noted, not defects: **no pagination anywhere** (every table renders the full result set), and the global
`.card table { min-width: 480px }` (`css/pages.css:1374`) forces even a 3-column table to scroll.

---

## F. Hygiene — no user impact today

- **255 of 620 CSS classes (41%) are never referenced in any JSX.** Verified against dynamically built class names,
  which are only used for icons and state modifiers. Dead examples include `.featured-layout` (a `260px 1fr` grid at
  mobile), `.categories-grid`, `.brands-grid`, `.product-row`, `.auth-card`, `.account-layout`, `.back-to-top`.
  Several of these *look* like serious mobile bugs in the stylesheet but render nowhere.
- `frontend/css/fix.module.css` is **never imported** — including a `.btn-primary { width: 0 !important }` rule.
- **Two breakpoint systems collide**: a mobile-first `min-width` ladder (`main.css`, `home.css`, `products.css`) and a
  desktop-first `max-width` ladder (`pages.css`, `header.css`, `footer.css`), both matching at exactly 768px. There
  are 11 distinct breakpoints below 768px (320, 359, 360, 425, 480, 540, 550, 576, 600, 640, 700).
- **Four different sticky offsets** for the same header: `144px`, `6rem`, `80px`, `144px`.
- Scrollbars are hidden globally (`css/main.css:1361-1373`), so horizontal scroll strips have no visual affordance
  that more content exists sideways.
- `body { overflow-x: hidden }` (`css/main.css:103`) currently hides nothing — but it will hide the next real
  overflow bug too.

---

## G. What is already right

Worth stating, because it limits how much should change:

- **Nothing overflows** at 320px on any public page.
- The product listing filter drawer is a proper mobile bottom sheet; the cart table **restructures** into stacked
  rows rather than scrolling; the PDP, account, checkout and footer all have real breakpoint coverage.
- `css/home.css` is written mobile-first and scales *up*.
- `components/HomeTestimonials.js` measures its container in JS; `components/HomeCampaignSection.js` has the best
  countdown handling in the codebase.
- Ellipsis discipline (`minWidth: 0` + `textOverflow`) is used correctly in the navbar, admin tables and modals.

---

## What was fixed in this pass

All verified in Chrome at 320/360/390px. Visible design is unchanged except where a defect was corrected.

| Fix | Evidence |
|---|---|
| **Mobile drawer search button was sliced by the panel edge** — the field used `flex: 1` without `min-width: 0`, so it kept its intrinsic ~20-character width and pushed the button 9px outside the drawer at 390px. The button also needed `width: auto` to escape the global `.btn-primary { width: 100% }` below 768px. | Before: button right edge 309 vs panel 300. After: input 216×44, button 44×44, both ending at 284 — inside the panel at both 320 and 390. |
| **Header search button sat 1px low** and was the only control with a hand-nudge (`marginTop: '2px'`). | All four header controls now share centre line 34 (search was 35). Pixel diff shows changes confined to the search button. |
| **Header hit areas** — account 19×19, cart 22×19, hamburger 32×24, search 36×36. | Now 26×45, 29×45, 45×43, 43×43 via transparent overlays. Visible sizes unchanged; hit-tested for neighbour overlap. |
| **Search suggestions dropdown** anchored to the sticky header instead of the input. | `.mobile-search-bar .container` is now `position: relative`. |
| **Other sub-44px controls** — product card wishlist, add to cart, pagination, social links, modal close, hero slider dots, password toggle. | Overlays: wishlist 43×43, add-to-cart 45 tall, slider dot 31×43, password toggle 41×43. Nothing visible moved. |
| **Admin headers clipped at 320px** (`.card { overflow: hidden }` cut the search input) and the **flash-sales mode-tab row overflowed its card**. | Both rows now wrap. |

Deliberately left alone, with reasons:

- **Quantity steppers** (`.qty-control`, `.cart-qty-control`, 32–40px) — they clip children with `overflow: hidden`, so an
  invisible overlay gets cut off. Fixing them means making the buttons visibly taller.
- **Safe-area insets** — needs `viewport-fit=cover`, which changes how content sits under the notch. That cannot be
  verified without a real notched device, so it is left as a recommendation rather than shipped blind.
- **Account/cart hit width** is 26–29px, limited by the 16px gap between the icons. Full 44px width needs the icons
  spaced further apart — a visible change.

## Recommended fix order

Fixes that correct defects **without changing the design**:

1. **Header action cluster** — remove the `marginTop` nudge, give the four controls one shared hit area and centre
   line, position the suggestions dropdown against its container, drop the three dead width overrides.
2. **Touch targets on primary actions** — Add to Cart, password toggles, slider dots, wishlist button, newsletter
   (43px → 44px), admin row selects.
3. **Safe areas** — `viewport-fit=cover` plus `env(safe-area-inset-bottom)` on the filters sheet, toasts and
   back-to-top.
4. **Dashboard defects** — wrap the flash-sales button row and the sellers/stores headers; reuse
   `.seller-product-form-grid` for the eight admin form rows; stop the analytics labels overlapping.

Deliberately **excluded** (visible or structural changes, needing a separate decision):

- Raising inputs to 16px to stop iOS zoom (changes text size on every form).
- Deleting the 255 dead classes.
- Unifying the breakpoint systems and sticky offsets.
- Pagination for dashboard tables.
