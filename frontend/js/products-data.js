/* =============================================
   HILGOD — PRODUCTS DATA
   All sample products used across the site
   ============================================= */

const HILGOD_PRODUCTS = [
  // ---- PHONES ----
  { id: 1, name: "Samsung Galaxy S24 Ultra 5G", brand: "Samsung", category: "phones", subcategory: "Android", price: 540000, originalPrice: 620000, image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80&auto=format", rating: 4.8, reviews: 1240, badge: "hot", inStock: true, description: "Latest Samsung flagship with 200MP camera and AI features.", specs: { Display: '6.8" QHD+ AMOLED', Processor: 'Snapdragon 8 Gen 3', RAM: '12GB', Storage: '256GB / 512GB', Battery: '5000mAh', OS: 'Android 14' } },
  { id: 2, name: "iPhone 15 Pro Max 256GB", brand: "Apple", category: "phones", subcategory: "iOS", price: 780000, originalPrice: 850000, image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80&auto=format", rating: 4.9, reviews: 2100, badge: "toprated", inStock: true, description: "Apple's most powerful iPhone with titanium design.", specs: { Display: '6.7" Super Retina XDR', Processor: 'A17 Pro chip', RAM: '8GB', Storage: '256GB', Battery: '4422mAh', OS: 'iOS 17' } },
  { id: 3, name: "Tecno Spark 20 Pro+ 256GB", brand: "Tecno", category: "phones", subcategory: "Android", price: 98000, originalPrice: 115000, image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80&auto=format", rating: 4.3, reviews: 670, badge: "sale", inStock: true, description: "Affordable flagship with stunning camera.", specs: { Display: '6.78" FHD+', Processor: 'Helio G100', RAM: '8GB', Storage: '256GB', Battery: '5000mAh', OS: 'Android 13' } },
  { id: 4, name: "Infinix Hot 40 Pro 128GB", brand: "Infinix", category: "phones", subcategory: "Android", price: 65000, originalPrice: 79000, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80&auto=format", rating: 4.2, reviews: 430, badge: null, inStock: true, description: "Gaming phone with smooth performance.", specs: { Display: '6.78" FHD+', Processor: 'Helio G99', RAM: '8GB', Storage: '128GB', Battery: '5000mAh', OS: 'Android 13' } },
  { id: 5, name: "Xiaomi Redmi Note 13 Pro", brand: "Xiaomi", category: "phones", subcategory: "Android", price: 175000, originalPrice: 200000, image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&q=80&auto=format", rating: 4.6, reviews: 890, badge: "new", inStock: true, description: "Pro-grade camera at mid-range price.", specs: { Display: '6.67" AMOLED', Processor: 'Snapdragon 7s Gen 2', RAM: '8GB', Storage: '256GB', Battery: '5100mAh', OS: 'Android 13' } },
  { id: 6, name: "Google Pixel 8 Pro", brand: "Google", category: "phones", subcategory: "Android", price: 420000, originalPrice: 480000, image: "https://images.unsplash.com/photo-1598965402089-897ce52e8355?w=400&q=80&auto=format", rating: 4.7, reviews: 560, badge: "hot", inStock: true, description: "Google AI magic in your pocket.", specs: { Display: '6.7" LTPO OLED', Processor: 'Google Tensor G3', RAM: '12GB', Storage: '128GB', Battery: '5050mAh', OS: 'Android 14' } },

  // ---- LAPTOPS ----
  { id: 7, name: "HP Pavilion 15 Core i7 512GB", brand: "HP", category: "laptops", subcategory: "Windows", price: 350000, originalPrice: 410000, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80&auto=format", rating: 4.5, reviews: 780, badge: "hot", inStock: true, description: "Powerful everyday laptop for work and play.", specs: { Processor: 'Intel Core i7-1255U', RAM: '16GB DDR4', Storage: '512GB SSD', Display: '15.6" FHD IPS', Graphics: 'Intel Iris Xe', OS: 'Windows 11' } },
  { id: 8, name: "MacBook Air M2 256GB", brand: "Apple", category: "laptops", subcategory: "macOS", price: 680000, originalPrice: 750000, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80&auto=format", rating: 4.9, reviews: 1540, badge: "toprated", inStock: true, description: "Thin, light and incredibly powerful.", specs: { Processor: 'Apple M2 chip', RAM: '8GB Unified', Storage: '256GB SSD', Display: '13.6" Liquid Retina', Battery: '18-hour life', OS: 'macOS Sonoma' } },
  { id: 9, name: "Dell XPS 15 Core i9 1TB", brand: "Dell", category: "laptops", subcategory: "Windows", price: 820000, originalPrice: 950000, image: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400&q=80&auto=format", rating: 4.7, reviews: 430, badge: "sale", inStock: true, description: "Premium creator laptop with OLED display.", specs: { Processor: 'Intel Core i9-13900H', RAM: '32GB DDR5', Storage: '1TB SSD', Display: '15.6" OLED 3.5K', Graphics: 'NVIDIA RTX 4060', OS: 'Windows 11 Pro' } },
  { id: 10, name: "Lenovo IdeaPad Slim 5i", brand: "Lenovo", category: "laptops", subcategory: "Windows", price: 280000, originalPrice: 330000, image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&q=80&auto=format", rating: 4.4, reviews: 620, badge: null, inStock: true, description: "Sleek and fast for everyday computing.", specs: { Processor: 'Intel Core i5-1235U', RAM: '8GB', Storage: '512GB SSD', Display: '15.6" FHD IPS', Graphics: 'Intel Iris Xe', OS: 'Windows 11' } },

  // ---- TVs ----
  { id: 11, name: "Samsung 55\" 4K Smart TV QLED", brand: "Samsung", category: "tvs", subcategory: "QLED", price: 280000, originalPrice: 340000, image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80&auto=format", rating: 4.7, reviews: 920, badge: "hot", inStock: true, description: "Quantum dot technology for brilliant colors.", specs: { Screen: '55" QLED 4K', Resolution: '3840 x 2160', OS: 'Tizen', Connectivity: 'WiFi, Bluetooth, 4x HDMI', RefreshRate: '100Hz', Audio: '20W Dolby Atmos' } },
  { id: 12, name: "LG OLED C3 65\" 4K", brand: "LG", category: "tvs", subcategory: "OLED", price: 520000, originalPrice: 620000, image: "https://images.unsplash.com/photo-1461151304267-38535e780c79?w=400&q=80&auto=format", rating: 4.9, reviews: 670, badge: "toprated", inStock: true, description: "Perfect black levels with self-lit OLED pixels.", specs: { Screen: '65" OLED 4K', Resolution: '3840 x 2160', OS: 'webOS 23', Connectivity: 'WiFi 6, BT 5.0, 4x HDMI 2.1', RefreshRate: '120Hz', Audio: '60W Dolby Atmos' } },
  { id: 13, name: "Hisense 43\" FHD Smart TV", brand: "Hisense", category: "tvs", subcategory: "LED", price: 85000, originalPrice: 105000, image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&q=80&auto=format", rating: 4.2, reviews: 340, badge: "sale", inStock: true, description: "Affordable smart TV packed with features.", specs: { Screen: '43" LED FHD', Resolution: '1920 x 1080', OS: 'VIDAA U', Connectivity: 'WiFi, 3x HDMI, 2x USB', RefreshRate: '60Hz', Audio: '16W' } },

  // ---- APPLIANCES ----
  { id: 14, name: "LG 10kg Front Load Washing Machine", brand: "LG", category: "appliances", subcategory: "Washing Machines", price: 220000, originalPrice: 265000, image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&q=80&auto=format", rating: 4.6, reviews: 510, badge: "hot", inStock: true, description: "AI powered direct drive washing machine.", specs: { Capacity: '10kg', Type: 'Front Load', SpinSpeed: '1400 RPM', Programs: '14 Wash Programs', Motor: 'Inverter Direct Drive', Rating: 'A+++ Energy' } },
  { id: 15, name: "Samsung 400L Double Door Fridge", brand: "Samsung", category: "appliances", subcategory: "Refrigerators", price: 180000, originalPrice: 220000, image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&q=80&auto=format", rating: 4.5, reviews: 380, badge: null, inStock: true, description: "No-frost double door refrigerator.", specs: { Capacity: '400 Litres', Type: 'Double Door', Defrost: 'Frost Free', Cooling: 'Twin Cooling Plus', Rating: 'A+ Energy', 'Annual Power': '250 kWh' } },
  { id: 16, name: "Bruhm 2HP Split Air Conditioner", brand: "Bruhm", category: "appliances", subcategory: "Air Conditioners", price: 145000, originalPrice: 175000, image: "https://images.unsplash.com/photo-1585338107529-13afc25806f9?w=400&q=80&auto=format", rating: 4.3, reviews: 220, badge: "sale", inStock: true, description: "Inverter split AC with fast cooling.", specs: { Capacity: '2HP / 18000 BTU', Type: 'Split Inverter', Operation: 'Cooling & Heating', Noise: '19dB (Indoor)', SEER: '5.3', Refrigerant: 'R410A' } },
  { id: 17, name: "Binatone 4-Slice Toaster", brand: "Binatone", category: "appliances", subcategory: "Kitchen", price: 12000, originalPrice: 18000, image: "https://images.unsplash.com/photo-1585237017125-24baf7bbd4b2?w=400&q=80&auto=format", rating: 4.1, reviews: 150, badge: null, inStock: true, description: "Stainless steel toaster with wider slots.", specs: { Capacity: '4 Slices', Power: '1400W', Settings: '7 Browning Levels', Tray: 'Removable Crumb Tray', 'Extra Lift': 'Yes', Auto: 'Auto Centering' } },

  // ---- GADGETS ----
  { id: 18, name: "Apple AirPods Pro 2nd Gen", brand: "Apple", category: "gadgets", subcategory: "Earphones", price: 145000, originalPrice: 170000, image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&q=80&auto=format", rating: 4.8, reviews: 1860, badge: "hot", inStock: true, description: "Industry-leading noise cancellation.", specs: { Type: 'In-ear TWS', ANC: 'Active Noise Cancellation', Battery: '6+30 hrs (Case)', Resistance: 'IPX4', Chip: 'H2', Connectivity: 'Bluetooth 5.3' } },
  { id: 19, name: "Samsung Galaxy Watch 6 Classic", brand: "Samsung", category: "gadgets", subcategory: "Smartwatches", price: 135000, originalPrice: 160000, image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&q=80&auto=format", rating: 4.6, reviews: 720, badge: "new", inStock: true, description: "Classic rotating bezel smartwatch.", specs: { Display: '47mm Super AMOLED', OS: 'Wear OS + One UI Watch', Battery: 'Up to 40 hours', Sensors: 'BioActive + ECG', Resistance: '5ATM + IP68', GPS: 'Yes' } },
  { id: 20, name: "Anker 65W GaN Charger", brand: "Anker", category: "gadgets", subcategory: "Accessories", price: 18500, originalPrice: 25000, image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&q=80&auto=format", rating: 4.7, reviews: 2400, badge: "toprated", inStock: true, description: "Ultimate fast-charging GaN charger.", specs: { Output: '65W Max', Ports: '2x USB-C + 1x USB-A', Protocol: 'USB-PD 3.0, PPS', Compatibility: 'Universal', Safety: 'Multiple protections', Size: 'Compact fold-plug' } },
  { id: 21, name: "JBL Xtreme 3 Bluetooth Speaker", brand: "JBL", category: "gadgets", subcategory: "Speakers", price: 75000, originalPrice: 92000, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80&auto=format", rating: 4.7, reviews: 540, badge: "sale", inStock: true, description: "Massive sound, waterproof outdoor speaker.", specs: { Output: '100W RMS', Battery: '15 hours', Resistance: 'IP67', Connectivity: 'Bluetooth 5.1', Features: 'PartyBoost, USB Charge Out', Weight: '2.05 kg' } },

  // ---- FASHION ----
  { id: 22, name: "Men's Classic Polo T-Shirt", brand: "HilgodFashion", category: "fashion", subcategory: "Men", price: 7500, originalPrice: 12000, image: "https://images.unsplash.com/photo-1625910513413-5fc42e712484?w=400&q=80&auto=format", rating: 4.3, reviews: 120, badge: "sale", inStock: true, description: "Premium cotton polo for everyday style.", specs: { Material: '100% Cotton Pique', Fit: 'Regular', Care: 'Machine Washable', Available: 'S, M, L, XL, XXL', Collar: 'Ribbed Polo', Origin: 'Made in Nigeria' } },
  { id: 23, name: "Women's Off-Shoulder Midi Dress", brand: "HilgodFashion", category: "fashion", subcategory: "Women", price: 15000, originalPrice: 22000, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80&auto=format", rating: 4.5, reviews: 290, badge: "new", inStock: true, description: "Elegant evening and casual dress.", specs: { Material: '95% Polyester, 5% Spandex', Fit: 'Bodycon', Length: 'Midi', Care: 'Dry Clean Only', Available: 'XS, S, M, L, XL', Style: 'Off-Shoulder' } },
  { id: 24, name: "Adidas Ultraboost 22 Sneakers", brand: "Adidas", category: "fashion", subcategory: "Footwear", price: 55000, originalPrice: 72000, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80&auto=format", rating: 4.8, reviews: 850, badge: "hot", inStock: true, description: "Responsive running shoe with Boost midsole.", specs: { Upper: 'Primeknit+', Midsole: 'Boost + TORSION SYSTEM', Outsole: 'Continental Rubber', Drop: '10mm', Available: '39-47', Gender: 'Unisex' } },

  // ---- GAMING ----
  { id: 25, name: "PlayStation 5 Console (Disc)", brand: "Sony", category: "gaming", subcategory: "Consoles", price: 380000, originalPrice: 420000, image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&q=80&auto=format", rating: 4.9, reviews: 3200, badge: "hot", inStock: true, description: "Next-gen gaming experience.", specs: { CPU: 'AMD Zen 2 8-core', GPU: 'AMD RDNA 2 10.28 TFLOPS', Storage: '825GB SSD', Resolution: '4K/120fps, 8K', Ray: 'Hardware Ray Tracing', Audio: 'Tempest 3D AudioTech' } },
  { id: 26, name: "Xbox Series X 1TB", brand: "Microsoft", category: "gaming", subcategory: "Consoles", price: 350000, originalPrice: 390000, image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&q=80&auto=format", rating: 4.8, reviews: 1890, badge: "toprated", inStock: true, description: "World's most powerful console.", specs: { CPU: 'AMD Zen 2 8-core', GPU: '12 TFLOPS RDNA 2', Storage: '1TB NVMe SSD', Resolution: '4K/120fps, 8K', Ray: 'Hardware Ray Tracing', Backward: '4 Generations' } },
  { id: 27, name: "Logitech G502 Hero Gaming Mouse", brand: "Logitech", category: "gaming", subcategory: "Peripherals", price: 22000, originalPrice: 30000, image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&q=80&auto=format", rating: 4.7, reviews: 4100, badge: "sale", inStock: true, description: "World's most accurate gaming sensor.", specs: { Sensor: 'HERO 25K', DPI: '100-25,600', Buttons: '11 Programmable', Weight: 'Adjustable (121-135g)', Lighting: 'LIGHTSYNC RGB', Cable: 'Braided 2.1m' } },

  // ---- HOME & OFFICE ----
  { id: 28, name: "Segun Adjustable Office Chair", brand: "ErgoDesk", category: "home", subcategory: "Office Furniture", price: 45000, originalPrice: 65000, image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&q=80&auto=format", rating: 4.4, reviews: 340, badge: null, inStock: true, description: "Ergonomic mesh office chair.", specs: { Material: 'Mesh + PU Leather base', Adjustment: 'Height, Armrest, Tilt', MaxLoad: '150kg', Warranty: '2 Years', Assembly: 'Easy self-assembly', Color: 'Black/Gray' } },
  { id: 29, name: "Philips LED Desk Lamp", brand: "Philips", category: "home", subcategory: "Lighting", price: 12500, originalPrice: 18000, image: "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400&q=80&auto=format", rating: 4.5, reviews: 620, badge: "new", inStock: true, description: "Smart eye-care desk lamp with USB port.", specs: { Power: '9W', Lumens: '700lm', ColorTemp: '2700K-6500K', Modes: '5 Color Modes + Dimming', USB: 'USB-A Charging Port', Features: 'Memory function' } },
  { id: 30, name: "Nasco Microwave Oven 25L", brand: "Nasco", category: "appliances", subcategory: "Kitchen", price: 28000, originalPrice: 38000, image: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=400&q=80&auto=format", rating: 4.3, reviews: 245, badge: "sale", inStock: true, description: "25L digital microwave with grill function.", specs: { Capacity: '25 Litres', Power: '900W', Grill: 'Yes, 1100W', Programs: '8 Auto Menus', Timer: '35 min timer', Color: 'Silver/Black' } },

  // ---- CAMERAS ----
  { id: 31, name: "Canon EOS R50 Mirrorless Camera", brand: "Canon", category: "cameras", subcategory: "Mirrorless", price: 310000, originalPrice: 370000, image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80&auto=format", rating: 4.7, reviews: 480, badge: "hot", inStock: true, description: "Compact mirrorless for content creators.", specs: { Sensor: '24.2MP APS-C CMOS', ISO: '100-32000', Video: '4K 30fps, 1080p 120fps', AF: 'Dual Pixel CMOS AF II', Screen: '3" Vari-angle Touch LCD', Connectivity: 'WiFi 6, Bluetooth 5.0' } },
  { id: 32, name: "DJI Mini 4 Pro Drone", brand: "DJI", category: "cameras", subcategory: "Drones", price: 420000, originalPrice: 490000, image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&q=80&auto=format", rating: 4.8, reviews: 310, badge: "new", inStock: true, description: "Professional-grade mini drone.", specs: { Camera: '4K/60fps 1/1.3" CMOS', MaxFlight: '34 min', MaxRange: '20km', Obstacle: '4-way Omnidirectional', Wind: 'Level 7 Wind Resistance', Weight: '249g' } }
];

// ---- CATEGORIES ----
const HILGOD_CATEGORIES = [
  { id: "phones", name: "Phones & Tablets", icon: "fa-mobile-screen-button", count: 1240 },
  { id: "laptops", name: "Laptops & Computers", icon: "fa-laptop", count: 870 },
  { id: "tvs", name: "TVs & Displays", icon: "fa-tv", count: 540 },
  { id: "appliances", name: "Home Appliances", icon: "fa-blender", count: 2100 },
  { id: "gadgets", name: "Tech Gadgets", icon: "fa-headphones", count: 1850 },
  { id: "fashion", name: "Fashion", icon: "fa-shirt", count: 5400 },
  { id: "gaming", name: "Gaming", icon: "fa-gamepad", count: 730 },
  { id: "home", name: "Home & Office", icon: "fa-couch", count: 1340 },
  { id: "cameras", name: "Cameras & Drones", icon: "fa-camera", count: 620 },
  { id: "beauty", name: "Beauty & Health", icon: "fa-spa", count: 3200 },
  { id: "sports", name: "Sports & Outdoors", icon: "fa-dumbbell", count: 980 },
  { id: "baby", name: "Baby & Kids", icon: "fa-baby", count: 1450 },
  { id: "food", name: "Food & Grocery", icon: "fa-bowl-food", count: 2870 },
  { id: "books", name: "Books & Stationery", icon: "fa-book", count: 440 },
  { id: "auto", name: "Automobile", icon: "fa-car", count: 520 },
  { id: "garden", name: "Garden & Tools", icon: "fa-screwdriver-wrench", count: 390 },
];

// ---- HELPER: Get products by category ----
function getProductsByCategory(cat, limit = null) {
  let results = cat ? HILGOD_PRODUCTS.filter(p => p.category === cat) : [...HILGOD_PRODUCTS];
  return limit ? results.slice(0, limit) : results;
}

// ---- HELPER: Get product by ID ----
function getProductById(id) {
  return HILGOD_PRODUCTS.find(p => p.id === parseInt(id));
}

// ---- HELPER: Search products ----
function searchProducts(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return HILGOD_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.subcategory.toLowerCase().includes(q)
  );
}

// ---- FORMAT PRICE ----
function formatPrice(num) {
  return '₦' + num.toLocaleString('en-NG');
}

// ---- DISCOUNT % ----
function getDiscount(price, originalPrice) {
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

// ---- RENDER STARS ----
function renderStars(rating) {
  let html = '<div class="stars">';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) html += '<i class="fas fa-star"></i>';
    else if (i - 0.5 <= rating) html += '<i class="fas fa-star-half-stroke"></i>';
    else html += '<i class="far fa-star empty"></i>';
  }
  return html + '</div>';
}

// ---- RENDER PRODUCT CARD ----
function renderProductCard(product) {
  const discount = getDiscount(product.price, product.originalPrice);
  const badge = product.badge ? `<span class="product-card__badge badge-${product.badge}">${product.badge.toUpperCase()}</span>` : '';

  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-card__badges">${badge}</div>
      <button class="product-card__wishlist ${isInWishlist(product.id) ? 'active' : ''}" onclick="toggleWishlistItem(${product.id})" aria-label="Wishlist">
        <i class="${isInWishlist(product.id) ? 'fas' : 'far'} fa-heart"></i>
      </button>
      <div class="product-card__img-wrapper">
        <a href="product-detail.html?id=${product.id}">
          <img src="${product.image}" alt="${product.name}" loading="lazy" style="object-fit:cover" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&auto=format'">
        </a>
        <div class="product-card__quick-view" onclick="quickView(${product.id})"><i class="fas fa-eye"></i> Quick View</div>
      </div>
      <div class="product-card__body">
        <div class="product-card__brand">${product.brand}</div>
        <a href="product-detail.html?id=${product.id}" class="product-card__name">${product.name}</a>
        <div class="product-card__rating">
          ${renderStars(product.rating)}
          <span class="rating-count">(${product.reviews.toLocaleString()})</span>
        </div>
        <div class="product-card__pricing">
          <span class="product-card__price">${formatPrice(product.price)}</span>
          ${product.originalPrice > product.price ? `
            <span class="product-card__original">${formatPrice(product.originalPrice)}</span>
            <span class="product-card__discount">-${discount}%</span>`
      : ''}
        </div>
        <div class="product-card__actions">
          <button class="btn-add-cart" id="cart-btn-${product.id}" onclick="addToCartAndUpdate(${product.id}, this)">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>`;
}
