/* =============================================
   HILGOD — WISHLIST.JS
   ============================================= */

const WISH_KEY = 'hilgod_wishlist';

function getWishlist() {
  try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch { return []; }
}
function saveWishlist(list) {
  localStorage.setItem(WISH_KEY, JSON.stringify(list));
  updateWishlistUI();
}
function isInWishlist(productId) {
  return getWishlist().some(id => id === productId);
}
function addToWishlist(productId) {
  const list = getWishlist();
  if (!list.includes(productId)) { list.push(productId); saveWishlist(list); }
}
function removeFromWishlist(productId) {
  saveWishlist(getWishlist().filter(id => id !== productId));
}
function clearWishlist() {
  if (confirm("Are you sure you want to clear your wishlist?")) {
    saveWishlist([]);
    if (typeof renderWishlistPage === 'function') renderWishlistPage();
    showToast('Wishlist cleared', 'info');
  }
}
function toggleWishlistItem(productId) {
  if (isInWishlist(productId)) {
    removeFromWishlist(productId);
    showToast('Removed from wishlist', 'warning');
  } else {
    addToWishlist(productId);
    showToast('Added to wishlist ❤️', 'success');
  }
  // Update all wishlist buttons for this product
  document.querySelectorAll(`[onclick*="toggleWishlistItem(${productId})"]`).forEach(btn => {
    const iTag = btn.querySelector('i');
    if (isInWishlist(productId)) {
      btn.classList.add('active');
      if (iTag) { iTag.classList.remove('far'); iTag.classList.add('fas'); }
    } else {
      btn.classList.remove('active');
      if (iTag) { iTag.classList.remove('fas'); iTag.classList.add('far'); }
    }
  });
}
function toggleWishlistByProduct(productId) {
  toggleWishlistItem(productId);
}
function updateWishlistUI() {
  const badges = document.querySelectorAll('.wishlist-badge');
  const count = getWishlist().length;
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}
function renderWishlistPage() {
  const grid = document.getElementById('wishlist-grid');
  const empty = document.getElementById('wishlist-empty');
  const countEl = document.getElementById('wishlist-count');
  if (!grid) return;
  const list = getWishlist();
  if (countEl) countEl.textContent = `${list.length} item${list.length !== 1 ? 's' : ''}`;
  if (list.length === 0) {
    if (empty) empty.style.display = 'flex';
    grid.innerHTML = ''; return;
  }
  if (empty) empty.style.display = 'none';
  const products = list.map(id => getProductById(id)).filter(Boolean);
  grid.innerHTML = products.map(p => renderProductCard(p)).join('');
}
function moveAllToCart() {
  const list = getWishlist();
  list.forEach(id => addToCart(id));
  showToast(`${list.length} items moved to cart 🛒`, 'success');
}
