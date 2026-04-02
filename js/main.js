/* =============================================
   HILGOD — MAIN.JS
   App initialization entry point
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ---- Auth & Header ----
  updateHeaderAuth();
  updateCartUI();
  updateWishlistUI();

  // ---- UI Init ----
  initMobileMenu();
  initAccountDropdown();
  initSearchBar();
  initMegaMenu();
  initBackToTop();
  initLazyLoad();
  initSmoothScroll();

  // ---- Page-specific inits ----
  const page = window.location.pathname.split('/').pop() || 'index.html';

  // HOMEPAGE
  if (page === 'index.html' || page === '') {
    initSlider('hero-slider');
    startFlashSale();
    renderHomepageProducts();
  }

  // PRODUCTS PAGE
  if (page === 'products.html') {
    initProductsPage();
  }

  // CART PAGE
  if (page === 'cart.html') {
    renderCartPage();
  }

  // WISHLIST PAGE
  if (page === 'wishlist.html') {
    renderWishlistPage();
  }

  // PRODUCT DETAIL
  if (page === 'product-detail.html') {
    renderProductDetail();
    initDetailTabs();
    initGallery();
  }

  // LOGIN
  if (page === 'login.html') {
    handleLoginForm();
    if (isLoggedIn()) window.location.href = 'account.html';
  }

  // SIGNUP
  if (page === 'signup.html') {
    handleSignupForm();
    if (isLoggedIn()) window.location.href = 'account.html';
  }

  // ACCOUNT
  if (page === 'account.html') {
    if (!isLoggedIn()) { window.location.href = 'login.html'; return; }
    initAccountTabs();
    renderAccountPage();
  }

  // CHECKOUT
  if (page === 'checkout.html') {
    renderCheckoutSummary();
    goToCheckoutStep(1);
  }

  // CATEGORIES
  if (page === 'categories.html') {
    renderAllCategories();
  }
});

// ---- HOMEPAGE PRODUCT RENDERING ----
function renderHomepageProducts() {
  const grids = {
    'flash-products': () => HILGOD_PRODUCTS.filter(p => p.badge === 'sale' || p.badge === 'hot').slice(0, 5),
    'bestsellers-grid': () => HILGOD_PRODUCTS.filter(p => p.reviews > 500).slice(0, 5),
    'new-arrivals-grid': () => HILGOD_PRODUCTS.filter(p => p.badge === 'new').slice(0, 8),
    'phones-grid': () => getProductsByCategory('phones', 5),
    'laptops-grid': () => getProductsByCategory('laptops', 5),
    'gadgets-grid': () => getProductsByCategory('gadgets', 5),
    'fashion-grid': () => getProductsByCategory('fashion', 5),
    'appliances-grid': () => getProductsByCategory('appliances', 5),
  };
  for (const [id, fn] of Object.entries(grids)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = fn().map(p => renderProductCard(p)).join('');
  }

  // Render category cards
  const catGrid = document.getElementById('categories-grid');
  if (catGrid) {
    catGrid.innerHTML = HILGOD_CATEGORIES.slice(0, 16).map(c => `
      <a href="products.html?category=${c.id}" class="cat-card">
        <div class="cat-icon"><i class="fas ${c.icon}"></i></div>
        <span class="cat-name">${c.name}</span>
      </a>`).join('');
  }
}

// ---- PRODUCT DETAIL PAGE ----
function renderProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  const product = getProductById(id);
  if (!product) {
    document.getElementById('pdp-container')?.insertAdjacentHTML('beforeend', `<div class="empty-state"><i class="fas fa-box-open"></i><h3>Product not found</h3><a href="products.html" class="btn btn-primary">Browse Products</a></div>`);
    return;
  }
  const discount = getDiscount(product.price, product.originalPrice);
  document.title = `${product.name} — Hilgod Online Store`;

  const container = document.getElementById('pdp-container');
  if (!container) return;
  container.innerHTML = `
    <div class="pdp-layout">
      <div class="pdp-gallery">
        <div class="gallery-main">
          <img id="gallery-main-img" src="${product.image}" alt="${product.name}" loading="lazy" style="object-fit:cover" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'">
        </div>
        <div class="gallery-thumbnails">
          ${[product.image, product.image, product.image].map((img, i) => `
            <div class="thumb ${i === 0 ? 'active' : ''}" data-src="${img}"><img src="${img}" alt="View ${i + 1}"></div>`).join('')}
        </div>
      </div>
      <div class="pdp-info">
        <div class="pdp-brand">${product.brand}</div>
        <h1 class="pdp-title">${product.name}</h1>
        <div class="pdp-rating">
          ${renderStars(product.rating)}
          <span class="rating-count">${product.rating}</span>
          <span class="review-link">(${product.reviews.toLocaleString()} reviews)</span>
        </div>
        <span class="${product.inStock ? 'in-stock' : 'out-stock'}">
          <i class="fas ${product.inStock ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
          ${product.inStock ? 'In Stock' : 'Out of Stock'}
        </span>
        <div class="pdp-pricing">
          <span class="pdp-price">${formatPrice(product.price)}</span>
          ${product.originalPrice > product.price ? `
            <span class="pdp-original">${formatPrice(product.originalPrice)}</span>
            <span class="pdp-discount">-${discount}% OFF</span>` : ''}
          <div class="pdp-installment">Pay ₦${Math.round(product.price / 6).toLocaleString()}/month x 6 months (0% interest)</div>
        </div>
        <div class="qty-wrap">
          <span style="font-size:.88rem;font-weight:700">Quantity:</span>
          <div class="qty-control">
            <button class="qty-btn" onclick="changeQty(-1)" id="qty-minus"><i class="fas fa-minus"></i></button>
            <input type="number" class="qty-input" id="pdp-qty" value="1" min="1" max="99">
            <button class="qty-btn" onclick="changeQty(1)"  id="qty-plus"><i class="fas fa-plus"></i></button>
          </div>
        </div>
        <div class="pdp-actions">
          <button class="btn btn-primary btn-lg" onclick="pdpAddToCart(${product.id})"><i class="fas fa-cart-plus"></i> Add to Cart</button>
          <button class="btn btn-buy-now btn-lg" onclick="pdpBuyNow(${product.id})"><i class="fas fa-bolt"></i> Buy Now</button>
          <button class="product-card__wishlist ${isInWishlist(product.id) ? 'active' : ''}" onclick="toggleWishlistItem(${product.id})" style="position:relative;top:auto;right:auto;width:46px;height:46px">
            <i class="${isInWishlist(product.id) ? 'fas' : 'far'} fa-heart"></i>
          </button>
        </div>
        <div class="pdp-meta">
          <div class="pdp-meta-item"><i class="fas fa-truck"></i> <span><strong>Free Delivery</strong> on orders over ₦50,000</span></div>
          <div class="pdp-meta-item"><i class="fas fa-rotate-left"></i> <span><strong>7-Day Returns</strong> Hassle-free return policy</span></div>
          <div class="pdp-meta-item"><i class="fas fa-shield-halved"></i> <span><strong>Genuine Product</strong> 100% authentic guarantee</span></div>
          <div class="pdp-meta-item"><i class="fas fa-tag"></i> <span>Category: <strong><a href="products.html?category=${product.category}" style="color:var(--primary)">${product.category}</a></strong></span></div>
        </div>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs-wrap">
      <div class="tab-heads">
        <div class="tab-head active" data-tab="tab-desc">Description</div>
        <div class="tab-head" data-tab="tab-specs">Specifications</div>
        <div class="tab-head" data-tab="tab-reviews">Reviews (${product.reviews.toLocaleString()})</div>
        <div class="tab-head" data-tab="tab-delivery">Delivery & Returns</div>
      </div>
      <div class="tab-body active" id="tab-desc"><p style="line-height:1.8;color:var(--gray-1)">${product.description}</p></div>
      <div class="tab-body" id="tab-specs">
        <table class="spec-table">
          ${Object.entries(product.specs).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
        </table>
      </div>
      <div class="tab-body" id="tab-reviews">
        ${generateFakeReviews(product)}
      </div>
      <div class="tab-body" id="tab-delivery">
        <div class="pdp-meta" style="gap:14px">
          <div class="pdp-meta-item"><i class="fas fa-truck"></i><div><strong>Standard Delivery (3-5 days)</strong><br><span style="color:var(--gray-1);font-size:.85rem">Free on orders over ₦50,000, otherwise ₦2,500</span></div></div>
          <div class="pdp-meta-item"><i class="fas fa-bolt"></i><div><strong>Express Delivery (1-2 days)</strong><br><span style="color:var(--gray-1);font-size:.85rem">₦5,000 flat fee across Nigeria</span></div></div>
          <div class="pdp-meta-item"><i class="fas fa-rotate-left"></i><div><strong>7-Day Return Policy</strong><br><span style="color:var(--gray-1);font-size:.85rem">Return any item in original condition within 7 days.</span></div></div>
          <div class="pdp-meta-item"><i class="fas fa-shield-halved"></i><div><strong>Warranty</strong><br><span style="color:var(--gray-1);font-size:.85rem">Manufacturer warranty applies. Check product specs for duration.</span></div></div>
        </div>
      </div>
    </div>

    <!-- RELATED PRODUCTS -->
    <div class="products-section" style="margin-top:var(--space-6)">
      <div class="section-header" style="text-align:center"><h2 class="section-title"><span class="bar"></span>You May Also Like</h2></div>
      <div class="related-grid" id="related-products"></div>
    </div>`;

  // Render related
  const related = HILGOD_PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 6);
  const relGrid = document.getElementById('related-products');
  if (relGrid) relGrid.innerHTML = related.map(p => renderProductCard(p)).join('');

  initDetailTabs();
  initGallery();
}

function generateFakeReviews(product) {
  const names = ['Chukwuemeka O.', 'Amina B.', 'Tunde F.', 'Grace I.', 'Babatunde M.', 'Yetunde A.', 'Samuel N.', 'Fatima D.'];
  const texts = [
    'Absolutely love this product! Exactly as described. Fast delivery too.',
    'Great quality for the price. Hilgod delivery was super fast. Recommended!',
    'Works perfectly. I was skeptical at first but this exceeded my expectations.',
    "Solid product. Been using it for 3 weeks now and no issues. Genuine product.",
    'Packaging was excellent, product works great. Will order again!',
  ];
  return `<div style="margin-bottom:16px;display:flex;align-items:center;gap:16px">
    <div>${renderStars(product.rating)}</div>
    <span style="font-size:1.1rem;font-weight:700">${product.rating}/5</span>
    <span style="color:var(--gray-1);font-size:.85rem">Based on ${product.reviews.toLocaleString()} reviews</span>
  </div>` +
    Array.from({ length: 4 }, (_, i) => `
    <div class="review-card">
      <div class="review-header">
        <div>
          <span class="reviewer-name">${names[i % names.length]}</span>
          <span class="review-date" style="margin-left:10px">${i === 0 ? '2 days ago' : i === 1 ? '1 week ago' : i + ' weeks ago'}</span>
        </div>
        ${renderStars(Math.min(5, product.rating - (i * 0.1)))}
      </div>
      <div class="verified-badge"><i class="fas fa-circle-check"></i>Verified Purchase</div>
      <div class="review-body">${texts[i % texts.length]}</div>
    </div>`).join('');
}

function changeQty(delta) {
  const input = document.getElementById('pdp-qty');
  if (!input) return;
  input.value = Math.max(1, Math.min(99, parseInt(input.value || 1) + delta));
}

function pdpAddToCart(productId) {
  const qty = parseInt(document.getElementById('pdp-qty')?.value || 1);
  addToCart(productId, qty);
  showToast('Added to cart! 🛒', 'success');
}

function pdpBuyNow(productId) {
  const qty = parseInt(document.getElementById('pdp-qty')?.value || 1);
  addToCart(productId, qty);
  window.location.href = 'checkout.html';
}

// ---- ACCOUNT PAGE ----
function renderAccountPage() {
  const user = getCurrentUser();
  if (!user) return;
  const nameEls = document.querySelectorAll('.account-user-name');
  const emailEls = document.querySelectorAll('.account-user-email');
  nameEls.forEach(el => el.textContent = user.name);
  emailEls.forEach(el => el.textContent = user.email);

  // Sample orders
  const orderGrid = document.getElementById('orders-list');
  if (orderGrid) {
    orderGrid.innerHTML = `
      <div class="order-card">
        <div class="order-card-header"><span class="order-id">#HGD-20248821</span><span class="order-status status-delivered">Delivered</span><span style="font-size:.82rem;color:var(--gray-1)">Mar 28, 2026</span></div>
        <div class="order-card-body"><div class="order-product"><img src="https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80&auto=format" loading="lazy" style="object-fit:cover" alt="Samsung Galaxy S24 Ultra"><span>Samsung Galaxy S24 Ultra</span><span style="margin-left:auto;font-weight:700;color:var(--primary)">₦540,000</span></div><a href="#" style="font-size:.82rem;color:var(--primary)">View Details · Write a Review · Buy Again</a></div>
      </div>
      <div class="order-card">
        <div class="order-card-header"><span class="order-id">#HGD-20247703</span><span class="order-status status-processing">Processing</span><span style="font-size:.82rem;color:var(--gray-1)">Apr 1, 2026</span></div>
        <div class="order-card-body"><div class="order-product"><img src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80&auto=format" loading="lazy" style="object-fit:cover" alt="HP Pavilion 15 Core i7"><span>HP Pavilion 15 Core i7</span><span style="margin-left:auto;font-weight:700;color:var(--primary)">₦350,000</span></div><a href="#" style="font-size:.82rem;color:var(--primary)">View Details · Track Order</a></div>
      </div>`;
  }
}

// ---- CHECKOUT SUMMARY ----
function renderCheckoutSummary() {
  const cart = getCart();
  const listEl = document.getElementById('checkout-items');
  if (listEl) {
    listEl.innerHTML = cart.map(item => `
      <div class="order-summary-item">
        <img class="order-summary-img" src="${item.image}" alt="${item.name}" loading="lazy" style="object-fit:cover" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'">
        <div class="order-summary-details">
          <div class="order-summary-name">${item.name}</div>
          <div class="order-summary-qty">Qty: ${item.qty}</div>
        </div>
        <span class="order-summary-price">${formatPrice(item.price * item.qty)}</span>
      </div>`).join('') || '<p style="color:var(--gray-1)">Your cart is empty</p>';
  }
  updateSummary();
}

// ---- CATEGORIES PAGE ----
function renderAllCategories() {
  const grid = document.getElementById('all-categories-grid');
  if (!grid) return;
  grid.innerHTML = HILGOD_CATEGORIES.map(c => `
    <a href="products.html?category=${c.id}" class="category-block">
      <div class="cat-block-icon"><i class="fas ${c.icon}"></i></div>
      <div class="cat-block-name">${c.name}</div>
      <div class="cat-block-count">${c.count.toLocaleString()} products</div>
    </a>`).join('');
}
