/* =============================================
   HILGOD — CART.JS
   Real-time cart management with localStorage
   ============================================= */

const CART_KEY = 'hilgod_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartUI();
}

function addToCart(productId, qty = 1, variant = null) {
  const product = getProductById(productId);
  if (!product) return false;
  const cart = getCart();
  const key = `${productId}-${variant || 'default'}`;
  const existing = cart.find(item => item.key === key);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, 99);
  } else {
    cart.push({
      key, productId, qty,
      variant: variant || null,
      name: product.name,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      category: product.category
    });
  }
  saveCart(cart);
  return true;
}

function removeFromCart(key) {
  const cart = getCart().filter(item => item.key !== key);
  saveCart(cart);
}

function updateQty(key, newQty) {
  const cart = getCart();
  const item = cart.find(item => item.key === key);
  if (item) {
    item.qty = Math.max(1, Math.min(newQty, 99));
    saveCart(cart);
  }
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartUI();
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function getCartSubtotal() {
  return getCart().reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function getCartDelivery() {
  const sub = getCartSubtotal();
  if (sub === 0) return 0;
  return sub >= 50000 ? 0 : 2500;
}

function getCartTotal() {
  return getCartSubtotal() + getCartDelivery();
}

function updateCartUI() {
  // Update badge count
  const badges = document.querySelectorAll('.cart-badge');
  const count = getCartCount();
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
  // Update cart page if exists
  if (document.getElementById('cart-table-body')) renderCartPage();
}

// ---- Called from product cards ----
function addToCartAndUpdate(productId, btn) {
  const success = addToCart(productId);
  if (success && btn) {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Added!';
    btn.classList.add('added');
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('added');
    }, 1600);
  }
  showToast('Item added to cart! 🛒', 'success');
}

// ---- RENDER CART PAGE ----
function renderCartPage() {
  const tbody = document.getElementById('cart-table-body');
  const emptyState = document.getElementById('cart-empty');
  const cartContent = document.getElementById('cart-content');
  if (!tbody) return;
  const cart = getCart();
  if (cart.length === 0) {
    if (emptyState)  emptyState.style.display = 'flex';
    if (cartContent) cartContent.style.display = 'none';
    updateSummary(); return;
  }
  if (emptyState)  emptyState.style.display = 'none';
  if (cartContent) cartContent.style.display = 'grid';

  tbody.innerHTML = cart.map(item => `
    <div class="cart-table-row" id="row-${CSS.escape(item.key)}">
      <input type="checkbox" class="cart-item-check" checked>
      <div style="display:flex;align-items:center;gap:12px">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='assets/images/no-image.jpg'">
        <div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-brand">${item.brand}</div>
          ${item.variant ? `<div class="cart-item-variant">Variant: ${item.variant}</div>` : ''}
          <span class="cart-save-later" onclick="saveForLater('${item.key}')">Save for later</span>
        </div>
      </div>
      <span class="cart-item-price">${formatPrice(item.price)}</span>
      <div class="cart-qty-control">
        <button class="cart-qty-btn" onclick="cartQtyChange('${item.key}', -1)"><i class="fas fa-minus"></i></button>
        <span class="cart-qty-num" id="qty-${CSS.escape(item.key)}">${item.qty}</span>
        <button class="cart-qty-btn" onclick="cartQtyChange('${item.key}', 1)"><i class="fas fa-plus"></i></button>
      </div>
      <span class="cart-item-sub" id="sub-${CSS.escape(item.key)}">${formatPrice(item.price * item.qty)}</span>
      <button class="cart-remove" onclick="removeFromCartAndUpdate('${item.key}')" aria-label="Remove"><i class="fas fa-trash-alt"></i></button>
    </div>`).join('');
  updateSummary();
}

function cartQtyChange(key, delta) {
  const cart = getCart();
  const item = cart.find(i => i.key === key);
  if (!item) return;
  item.qty = Math.max(1, Math.min(item.qty + delta, 99));
  saveCart(cart);
  // Live-update DOM without full re-render
  const qtyEl = document.getElementById('qty-' + CSS.escape(key));
  const subEl = document.getElementById('sub-' + CSS.escape(key));
  if (qtyEl) qtyEl.textContent = item.qty;
  if (subEl) subEl.textContent = formatPrice(item.price * item.qty);
  updateSummary();
}

function removeFromCartAndUpdate(key) {
  removeFromCart(key);
  renderCartPage();
  showToast('Item removed from cart', 'warning');
}

function saveForLater(key) {
  const cart = getCart();
  const item = cart.find(i => i.key === key);
  if (item) toggleWishlistByProduct(item.productId);
  removeFromCartAndUpdate(key);
  showToast('Moved to wishlist ❤️', 'success');
}

function updateSummary() {
  const sub = getCartSubtotal();
  const del = getCartDelivery();
  const tot = sub + del;
  const original = getCart().reduce((s,i) => s + (i.originalPrice * i.qty), 0);
  const savings = original - sub;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('summary-subtotal', formatPrice(sub));
  set('summary-delivery', del === 0 ? 'FREE' : formatPrice(del));
  set('summary-savings', formatPrice(savings));
  set('summary-total', formatPrice(tot));
  set('summary-count', getCartCount());
  if (del === 0 && sub > 0) {
    const tag = document.getElementById('free-delivery-tag');
    if (tag) tag.style.display = 'flex';
  }
}

// Promo codes
const PROMO_CODES = { 'HILGOD10': 0.10, 'WELCOME20': 0.20, 'FLASH30': 0.30 };
let activePromo = null;
function applyPromo() {
  const inp = document.getElementById('promo-input');
  if (!inp) return;
  const code = inp.value.trim().toUpperCase();
  const disc = PROMO_CODES[code];
  if (disc) {
    activePromo = disc;
    showToast(`Promo applied! ${disc * 100}% off 🎉`, 'success');
    const msg = document.getElementById('promo-success');
    if (msg) { msg.style.display = 'block'; msg.textContent = `✓ Code applied: ${disc*100}% discount`; }
    updateSummary();
  } else {
    showToast('Invalid promo code', 'error');
  }
}
