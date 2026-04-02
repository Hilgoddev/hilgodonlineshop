/* =============================================
   HILGOD — UI.JS
   Toasts, Modals, Dropdowns, Mobile Menu, Quick View
   ============================================= */

// ---- TOAST ----
let toastContainer;
function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info} toast__icon"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fadeout');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ---- QUICK VIEW MODAL ----
function quickView(productId) {
  const product = getProductById(productId);
  if (!product) return;
  const discount = getDiscount(product.price, product.originalPrice);
  let modal = document.getElementById('quick-view-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quick-view-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal" style="max-width:750px"><div class="modal__header"><span class="modal__title">Quick View</span><button class="modal__close" onclick="closeModal('quick-view-modal')"><i class="fas fa-xmark"></i></button></div><div class="modal__body" id="qv-body"></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal('quick-view-modal'); });
  }
  document.getElementById('qv-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div style="background:var(--gray-6);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;height:280px;padding:20px">
        <img src="${product.image}" alt="${product.name}" style="max-height:100%;max-width:100%;object-fit:contain" onerror="this.src='assets/images/no-image.jpg'">
      </div>
      <div>
        <div style="font-size:.75rem;color:var(--primary);font-weight:700;text-transform:uppercase;margin-bottom:4px">${product.brand}</div>
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:8px;line-height:1.3">${product.name}</h3>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          ${renderStars(product.rating)}
          <span style="font-size:.8rem;color:var(--gray-1)">(${product.reviews.toLocaleString()} reviews)</span>
        </div>
        <div style="margin-bottom:14px">
          <span style="font-size:1.5rem;font-weight:800;color:var(--primary)">${formatPrice(product.price)}</span>
          ${product.originalPrice > product.price ? `<span style="font-size:.9rem;color:var(--gray-2);text-decoration:line-through;margin-left:8px">${formatPrice(product.originalPrice)}</span>
          <span style="font-size:.85rem;color:var(--success);font-weight:700;margin-left:4px">-${discount}%</span>` : ''}
        </div>
        <p style="font-size:.88rem;color:var(--gray-1);line-height:1.6;margin-bottom:16px">${product.description}</p>
        <div style="display:flex;gap:10px">
          <button class="btn btn-primary btn-full" onclick="addToCartAndUpdate(${product.id}, this); closeModal('quick-view-modal')"><i class="fas fa-cart-plus"></i> Add to Cart</button>
          <a href="product-detail.html?id=${product.id}" class="btn btn-outline" style="white-space:nowrap"><i class="fas fa-eye"></i> View</a>
        </div>
      </div>
    </div>`;
  openModal('quick-view-modal');
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

// ---- MOBILE MENU ----
function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const menu   = document.getElementById('mobile-menu');
  const overlay= document.getElementById('mobile-menu-overlay');
  const closeBtn = document.getElementById('mobile-menu-close');
  if (!toggle || !menu) return;
  const open  = () => { menu.classList.add('open'); overlay && overlay.classList.add('open'); toggle.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = () => { menu.classList.remove('open'); overlay && overlay.classList.remove('open'); toggle.classList.remove('open'); document.body.style.overflow = ''; };
  toggle.addEventListener('click', () => menu.classList.contains('open') ? close() : open());
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (overlay)  overlay.addEventListener('click', close);
}

// ---- ACCOUNT DROPDOWN ----
function initAccountDropdown() {
  const wrap = document.querySelector('.account-dropdown-wrap');
  if (!wrap) return;
  const btn = wrap.querySelector('.header-action-btn');
  const dd  = wrap.querySelector('.account-dropdown');
  if (!btn || !dd) return;
  btn.addEventListener('click', e => { e.stopPropagation(); dd.classList.toggle('open'); });
  document.addEventListener('click', () => dd.classList.remove('open'));
}

// ---- SEARCH BAR ----
function initSearchBar() {
  const input = document.getElementById('search-input');
  const suggestions = document.getElementById('search-suggestions');
  const form = document.getElementById('search-form');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q || q.length < 2) { if (suggestions) suggestions.classList.remove('open'); return; }
    const results = searchProducts(q).slice(0, 7);
    if (!suggestions) return;
    if (results.length === 0) { suggestions.classList.remove('open'); return; }
    suggestions.innerHTML = results.map(p => `
      <div class="suggestion-item" onclick="window.location.href='product-detail.html?id=${p.id}'">
        <i class="fas fa-search"></i>
        <span>${p.name}</span>
        <span style="margin-left:auto;font-size:.8rem;color:var(--primary);font-weight:700">${formatPrice(p.price)}</span>
      </div>`).join('') + `<div class="suggestion-item" style="background:var(--primary-xlight)" onclick="doSearch('${q}')">
        <i class="fas fa-search" style="color:var(--primary)"></i>
        <span style="color:var(--primary);font-weight:600">See all results for "${q}"</span>
      </div>`;
    suggestions.classList.add('open');
  });

  document.addEventListener('click', e => {
    if (!input.closest('.header-search-wrap')?.contains(e.target)) {
      if (suggestions) suggestions.classList.remove('open');
    }
  });

  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    doSearch(input.value.trim());
  });
}

function doSearch(q) {
  if (!q) return;
  window.location.href = `products.html?search=${encodeURIComponent(q)}`;
}

// ---- CATEGORY NAV MEGA MENU ----
function initMegaMenu() {
  const allCatsBtn = document.querySelector('.all-cats-wrap');
  const allCatsMenu = document.getElementById('all-cats-menu');
  if (allCatsBtn && allCatsMenu) {
    allCatsBtn.addEventListener('mouseenter', () => allCatsMenu.classList.add('open'));
    allCatsBtn.addEventListener('mouseleave', () => allCatsMenu.classList.remove('open'));
  }
}

// ---- BACK TO TOP ----
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ---- ACCOUNT PAGE TABS ----
function initAccountTabs() {
  const navItems = document.querySelectorAll('.account-nav-item');
  const panels   = document.querySelectorAll('.account-panel');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      const target = document.getElementById(item.dataset.panel);
      if (target) target.classList.add('active');
    });
  });
}

// ---- CHECKOUT STEPS ----
function goToCheckoutStep(stepNum) {
  document.querySelectorAll('.checkout-step-panel').forEach((p, i) => {
    p.style.display = i + 1 === stepNum ? 'block' : 'none';
  });
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.toggle('active', i + 1 === stepNum);
    s.classList.toggle('completed', i + 1 < stepNum);
  });
}

// ---- PRODUCT DETAIL TABS ----
function initDetailTabs() {
  const heads = document.querySelectorAll('.tab-head');
  const bodies = document.querySelectorAll('.tab-body');
  heads.forEach(h => {
    h.addEventListener('click', () => {
      heads.forEach(x => x.classList.remove('active'));
      bodies.forEach(x => x.classList.remove('active'));
      h.classList.add('active');
      const target = document.getElementById(h.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

// ---- GALLERY THUMBNAILS ----
function initGallery() {
  const thumbs = document.querySelectorAll('.thumb');
  const mainImg = document.getElementById('gallery-main-img');
  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      thumbs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      if (mainImg) mainImg.src = t.dataset.src;
    });
  });
}

// ---- TRACK ORDER ----
function trackOrder() {
  const input = document.getElementById('track-input');
  const result = document.getElementById('track-result');
  if (!input || !result) return;
  const orderId = input.value.trim();
  if (!orderId) { showToast('Please enter your order ID', 'warning'); return; }
  // Simulate tracking
  result.classList.add('show');
  const orderIdDisplay = document.getElementById('tracked-order-id');
  if (orderIdDisplay) orderIdDisplay.textContent = orderId.toUpperCase();
  showToast(`Tracking order #${orderId.toUpperCase()}`, 'info');
}

// ---- LAZY LOAD IMAGES ----
function initLazyLoad() {
  const imgs = document.querySelectorAll('img[data-src]');
  if (!imgs.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.src = e.target.dataset.src;
        observer.unobserve(e.target);
      }
    });
  }, { rootMargin: '200px' });
  imgs.forEach(img => observer.observe(img));
}

// ---- SMOOTH SCROLL NAV ----
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
}
