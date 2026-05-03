/* =============================================
   HILGOD — SLIDER.JS (Hero Carousel)
   ============================================= */

function initSlider(sliderId, options = {}) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;
  const slides = slider.querySelectorAll('.hero-slide');
  const dotsWrap = slider.querySelector('.slider-dots');
  const prevBtn  = slider.querySelector('.slider-prev');
  const nextBtn  = slider.querySelector('.slider-next');
  let current = 0;
  let timer = null;
  const delay = options.delay || 5000;

  // Build dots
  if (dotsWrap) {
    slides.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
  }

  function goTo(index) {
    slides[current].classList.remove('active');
    if (dotsWrap) dotsWrap.querySelectorAll('.slider-dot')[current]?.classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    if (dotsWrap) dotsWrap.querySelectorAll('.slider-dot')[current]?.classList.add('active');
  }
  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }
  function startAuto() { timer = setInterval(next, delay); }
  function stopAuto()  { clearInterval(timer); }

  if (prevBtn) prevBtn.addEventListener('click', () => { stopAuto(); prev(); startAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { stopAuto(); next(); startAuto(); });
  // Touch support
  let startX = 0;
  slider.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchend',   e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { stopAuto(); diff > 0 ? next() : prev(); startAuto(); }
  });

  // Pause on hover
  slider.addEventListener('mouseenter', stopAuto);
  slider.addEventListener('mouseleave', startAuto);

  goTo(0);
  startAuto();
}

/* =============================================
   HILGOD — COUNTDOWN.JS (Flash Sale Timer)
   ============================================= */

function initCountdown(endTimeStr, hoursId, minsId, secsId) {
  function update() {
    const now  = new Date();
    const end  = new Date(endTimeStr);
    let diff   = Math.max(0, Math.floor((end - now) / 1000));
    const h    = Math.floor(diff / 3600);
    diff      -= h * 3600;
    const m    = Math.floor(diff / 60);
    const s    = diff % 60;
    const set  = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val).padStart(2, '0'); };
    set(hoursId, h); set(minsId, m); set(secsId, s);
    if (diff === 0 && h === 0) clearInterval(interval);
  }
  update();
  const interval = setInterval(update, 1000);
}

function startFlashSale() {
  // End time: 8 hours from now
  const end = new Date(Date.now() + 8 * 60 * 60 * 1000);
  initCountdown(end.toISOString(), 'cd-hours', 'cd-mins', 'cd-secs');
}

/* =============================================
   HILGOD — SEARCH.JS (Product Search/Filter)
   ============================================= */

function initProductsPage() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  const searchQ = params.get('search') || '';
  const catQ    = params.get('category') || '';

  const searchInput = document.getElementById('page-search');
  if (searchInput && searchQ) searchInput.value = searchQ;

  let products = [...HILGOD_PRODUCTS];
  if (searchQ) products = searchProducts(searchQ);
  if (catQ)    products = products.filter(p => p.category === catQ);

  renderProductGrid(products, grid);
  updateProductCount(products.length);

  // Attach sort
  const sortSel = document.getElementById('sort-select');
  if (sortSel) sortSel.addEventListener('change', () => renderSorted(products, grid, sortSel.value));

  // Filter checkboxes
  document.querySelectorAll('.filter-check input').forEach(cb => {
    cb.addEventListener('change', () => applyFilters(grid));
  });

  // View toggle
  const gridBtn = document.getElementById('view-grid');
  const listBtn = document.getElementById('view-list');
  if (gridBtn) gridBtn.addEventListener('click', () => { grid.classList.remove('list-view'); gridBtn.classList.add('active'); listBtn.classList.remove('active'); });
  if (listBtn) listBtn.addEventListener('click', () => { grid.classList.add('list-view'); listBtn.classList.add('active'); gridBtn.classList.remove('active'); });

  // Update page title for search
  const titleEl = document.getElementById('products-page-title');
  if (titleEl) {
    if (searchQ) titleEl.textContent = `Results for "${searchQ}"`;
    else if (catQ) titleEl.textContent = HILGOD_CATEGORIES.find(c => c.id === catQ)?.name || 'All Products';
    else           titleEl.textContent = 'All Products';
  }

  // Category heading breadcrumb
  const catBread = document.getElementById('cat-breadcrumb');
  if (catBread && catQ) {
    const cat = HILGOD_CATEGORIES.find(c => c.id === catQ);
    if (cat) catBread.textContent = cat.name;
  }
}

function applyFilters(grid) {
  const checkedCats = [...document.querySelectorAll('.filter-cat:checked')].map(cb => cb.value);
  const checkedBrands = [...document.querySelectorAll('.filter-brand:checked')].map(cb => cb.value);
  let result = [...HILGOD_PRODUCTS];
  if (checkedCats.length)   result = result.filter(p => checkedCats.includes(p.category));
  if (checkedBrands.length) result = result.filter(p => checkedBrands.includes(p.brand.toLowerCase()));
  renderProductGrid(result, grid);
  updateProductCount(result.length);
}

function renderSorted(products, grid, sortVal) {
  let sorted = [...products];
  if (sortVal === 'price-asc')  sorted.sort((a,b) => a.price - b.price);
  if (sortVal === 'price-desc') sorted.sort((a,b) => b.price - a.price);
  if (sortVal === 'rating')     sorted.sort((a,b) => b.rating - a.rating);
  if (sortVal === 'new')        sorted.sort((a,b) => b.id - a.id);
  renderProductGrid(sorted, grid);
}

function renderProductGrid(products, grid) {
  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-box-open"></i><h3>No products found</h3><p>Try a different search or category</p><a href="products.html" class="btn btn-primary">Browse All Products</a></div>`;
    return;
  }
  grid.innerHTML = products.map(p => renderProductCard(p)).join('');
}

function updateProductCount(count) {
  const el = document.getElementById('product-count');
  if (el) el.textContent = count;
}
