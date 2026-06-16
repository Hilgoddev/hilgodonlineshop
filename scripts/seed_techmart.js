/**
 * Seed script: clean up test data and add real products + reviews to TechMart store.
 * Run from the repo root: node scripts/seed_techmart.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nmrqdzikceakkhfhflja.supabase.co',
  '***REMOVED_SUPABASE_SERVICE_ROLE_KEY***'
);

// ─── 1. Real products for TechMart ──────────────────────────────────────────

const PRODUCTS = [
  {
    name: 'Samsung Galaxy A55 5G Smartphone',
    description: `Experience next-level performance with the Samsung Galaxy A55 5G. Featuring a stunning 6.6" Super AMOLED display, a 50MP OIS main camera that captures brilliant detail in any light, and a 5,000mAh battery that lasts all day.\n\nPacked with 8GB RAM and 256GB internal storage, it handles multitasking with ease. IP67 rated — dust and water resistant up to 1 metre. 5G connectivity for fast browsing and streaming wherever you go.\n\nIncludes: phone, USB-C charging cable, SIM ejector pin.`,
    price: 285000,
    currency: 'NGN',
    category: 'Electronics',
    subcategory: 'Phones & Tablets',
    brand: 'Samsung',
    stock: 8,
    status: 'approved',
    is_active: true,
    images: [],
  },
  {
    name: 'JBL Flip 6 Portable Bluetooth Speaker',
    description: `Bring the party anywhere with the JBL Flip 6. Delivers powerful 30W stereo sound with deep, punchy bass through dual passive radiators. IP67 waterproof and dustproof — perfect for beach trips, poolside sessions, or outdoor events in any weather.\n\n12-hour battery life keeps the music going all day. Charges via USB-C. Use PartyBoost to link two or more JBL speakers for even bigger sound. Available in bold, vibrant colours.\n\nWhat's in the box: JBL Flip 6 speaker, USB-C charging cable, safety sheet.`,
    price: 62500,
    currency: 'NGN',
    category: 'Electronics',
    subcategory: 'Audio',
    brand: 'JBL',
    stock: 15,
    status: 'approved',
    is_active: true,
    images: [],
  },
  {
    name: 'Apple AirPods Pro (2nd Generation)',
    description: `The AirPods Pro 2nd Generation deliver up to 2x more Active Noise Cancellation than the previous generation, so you can focus on what matters. Adaptive Transparency lets in the sounds you want to hear while controlling unwanted noise.\n\nPersonalised Spatial Audio with dynamic head tracking places sound all around you. The H2 chip powers smarter, faster audio processing. Up to 6 hours of listening on a single charge, and up to 30 hours total with the MagSafe Charging Case.\n\nCompatible with all Apple devices. Touch control on the stem adjusts volume, skips tracks, and answers calls.\n\nIncludes: AirPods Pro, MagSafe Charging Case, ear tips (XS/S/M/L), Lightning to USB-C cable.`,
    price: 195000,
    currency: 'NGN',
    category: 'Electronics',
    subcategory: 'Audio',
    brand: 'Apple',
    stock: 7,
    status: 'approved',
    is_active: true,
    images: [],
  },
  {
    name: 'Anker PowerCore 26800mAh Portable Charger',
    description: `Never run out of power again. The Anker PowerCore 26800 is one of the highest-capacity portable chargers on the market. 26,800mAh charges an iPhone 15 more than 6 times, a Samsung Galaxy phone over 5 times, or a 10" iPad twice over.\n\nTriple USB-A output ports charge up to three devices at the same time. Dual Micro-USB input ports let you fully recharge the power bank itself in just 6 hours. Multi-protect safety system guards your devices against overcharging, overheating, and short circuits.\n\nCompact enough for your bag and airline-approved for carry-on. Backed by an 18-month warranty.\n\nIncludes: PowerCore 26800, 2 × Micro-USB charging cables, travel pouch.`,
    price: 38000,
    currency: 'NGN',
    category: 'Electronics',
    subcategory: 'Accessories',
    brand: 'Anker',
    stock: 22,
    status: 'approved',
    is_active: true,
    images: [],
  },
  {
    name: 'TP-Link Archer AX23 Wi-Fi 6 Router (AX1800)',
    description: `Upgrade your home or office internet with next-generation Wi-Fi 6 technology. The TP-Link Archer AX23 delivers combined speeds up to 1.8 Gbps — 300 Mbps on 2.4GHz and 1201 Mbps on 5GHz — for lag-free streaming, gaming, and video calls.\n\nOFDMA and MU-MIMO technology connects and serves more devices simultaneously without congestion. Four high-gain antennas provide wide coverage across your property. WPA3 encryption keeps your network secure.\n\nWorks with all major Nigerian ISPs. Set up in minutes using the TP-Link Tether app — no technical knowledge needed.\n\nIncludes: Archer AX23 router, power adapter, RJ-45 Ethernet cable.`,
    price: 52000,
    currency: 'NGN',
    category: 'Electronics',
    subcategory: 'Networking',
    brand: 'TP-Link',
    stock: 11,
    status: 'approved',
    is_active: true,
    images: [],
  },
];

// ─── 2. Reviews keyed by product index ──────────────────────────────────────

const REVIEWS = {
  0: [ // Samsung Galaxy A55
    { user_name: 'Adaeze Okonkwo', rating: 5, title: 'Excellent phone!', message: 'The camera on this phone is absolutely stunning. Takes brilliant photos even at night. Battery lasts a full day with heavy use. Very happy with my purchase from TechMart — delivery was fast too.' },
    { user_name: 'Emeka Nwosu', rating: 4, title: 'Great value for money', message: "Solid phone for the price. Performance is smooth, no lagging. Display is bright and sharp. Only reason I am giving 4 stars instead of 5 is that it took a couple of extra days to arrive, but the product itself is spot on." },
    { user_name: 'Chiamaka Obi', rating: 5, title: 'Samsung never disappoints', message: 'Third Samsung I have bought and they just keep getting better. The IP67 water resistance came in handy when I got caught in rain. Highly recommend.' },
  ],
  1: [ // JBL Flip 6
    { user_name: 'Femi Adeyemi', rating: 5, title: 'Amazing sound quality', message: "This speaker is a beast! I used it for my birthday party outdoors and everyone was asking where the music was coming from. The bass hits hard and the battery lasted the whole event. Worth every kobo." },
    { user_name: 'Chidi Obi', rating: 5, title: 'Truly waterproof — tested it!', message: 'Took this to the beach and it fell into the water. Still working perfectly. Sound is clear and loud. PartyBoost feature is fun when you link two of them together. Cannot fault it at all.' },
  ],
  2: [ // AirPods Pro
    { user_name: 'Ngozi Eze', rating: 5, title: 'Noise cancellation is on another level', message: 'I use these at work and the noise cancellation completely blocks out the open office noise. Sound quality is crisp and balanced. The fit is comfortable for long sessions. 100% genuine — came with proper Apple packaging.' },
    { user_name: 'Tunde Adebayo', rating: 4, title: 'Genuine product, fast delivery', message: "Confirmed genuine Apple AirPods Pro. The packaging was sealed and the serial number checked out on Apple's website. Battery life is as advertised. Took off one star only because the case gets fingerprints easily, but that's minor." },
  ],
  3: [ // Anker PowerCore
    { user_name: 'Aisha Mohammed', rating: 5, title: 'Lifesaver at events', message: 'I go to a lot of outdoor events and this power bank has saved me so many times. Charged my phone and a colleague\'s phone and my tablet all at the same time. Still had charge left. The quality feels premium.' },
    { user_name: 'Seun Olatunji', rating: 5, title: 'The real deal — no fake', message: "Bought two of these for myself and my mum. Both 100% genuine Anker. Charges fast, holds charge for weeks when not in use. Very compact for the capacity. Anker warranty card was included. Highly recommend TechMart." },
  ],
  4: [ // TP-Link Router
    { user_name: 'Ikechukwu Uzo', rating: 4, title: 'Solid coverage, easy setup', message: 'Replaced my old router with this and the difference is night and day. Coverage now reaches my back room and garden. Setup was simple using the app — took less than 10 minutes. Took one star off because the 5GHz range could be slightly wider, but overall great.' },
    { user_name: 'Blessing Osei', rating: 5, title: 'Handles all my devices without dropping', message: 'I have over 10 devices connected — laptops, phones, smart TV, Ring camera — and this router handles all of them without the signal dropping. Streaming is smooth on all devices simultaneously. Great product.' },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_NAME_PATTERNS = /test|sample|dummy|placeholder|product \d+$/i;
const TEST_REVIEW_PATTERNS = /^(test|test user|john doe|jane doe|user|admin|lorem|example)$/i;
const TEST_MSG_PATTERNS = /lorem ipsum|test message|this is a test/i;

async function run() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TechMart Seed Script');
  console.log('═══════════════════════════════════════════════════\n');

  // ── Find the TechMart store ──────────────────────────────────────────────
  let { data: stores, error: storesErr } = await supabase
    .from('stores')
    .select('id, owner_id, name, slug, status');
  if (storesErr) { console.error('Could not load stores:', storesErr.message); return; }

  console.log('All stores in DB:');
  (stores || []).forEach(s => console.log(`  [${s.status}] "${s.name}" — slug: ${s.slug} — id: ${s.id}`));

  const store = (stores || []).find(s =>
    s.name.toLowerCase().includes('techmart') || s.slug.toLowerCase().includes('techmart')
  );

  if (!store) {
    console.error('\n✗ Could not find a store with "techmart" in the name or slug. Check the list above.');
    return;
  }

  console.log(`\n✓ Found store: "${store.name}" (${store.slug}) — id: ${store.id}`);

  // ── Show + clean up existing products ───────────────────────────────────
  const { data: existing, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, price, status, stock')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });

  if (fetchErr) { console.error('Could not load products:', fetchErr.message); return; }

  console.log(`\nExisting products in this store (${(existing || []).length}):`);
  (existing || []).forEach(p => console.log(`  [${p.status}] "${p.name}" — ₦${p.price} — stock: ${p.stock} — id: ${p.id}`));

  const testProducts = (existing || []).filter(p => TEST_NAME_PATTERNS.test(p.name) || Number(p.price) < 500);

  if (testProducts.length) {
    console.log(`\nDeleting ${testProducts.length} test product(s)...`);
    for (const p of testProducts) {
      // Delete reviews for this product first
      await supabase.from('reviews').delete().eq('product_id', p.id);
      const { error: delErr } = await supabase.from('products').delete().eq('id', p.id);
      if (delErr) console.warn(`  ✗ Could not delete "${p.name}": ${delErr.message}`);
      else console.log(`  ✓ Deleted product: "${p.name}"`);
    }
  } else {
    console.log('\nNo obvious test products found (nothing deleted).');
  }

  // ── Clean up test reviews across all products ────────────────────────────
  const { data: allReviews } = await supabase.from('reviews').select('id, user_name, message').limit(200);
  const testReviews = (allReviews || []).filter(r =>
    TEST_REVIEW_PATTERNS.test((r.user_name || '').trim()) ||
    TEST_MSG_PATTERNS.test(r.message || '')
  );
  if (testReviews.length) {
    console.log(`\nDeleting ${testReviews.length} test review(s)...`);
    for (const r of testReviews) {
      const { error } = await supabase.from('reviews').delete().eq('id', r.id);
      if (!error) console.log(`  ✓ Deleted review by "${r.user_name}"`);
    }
  } else {
    console.log('No test reviews found.');
  }

  // ── Get categories for Electronics ──────────────────────────────────────
  const { data: cats } = await supabase
    .from('categories')
    .select('id, name, parent_id')
    .ilike('name', '%electronics%')
    .limit(5);

  const electronicsCategory = (cats || [])[0] || null;
  if (electronicsCategory) {
    console.log(`\n✓ Found category: "${electronicsCategory.name}" (${electronicsCategory.id})`);
  } else {
    console.log('\nNo Electronics category found — products will use text category only.');
  }

  // ── Insert 5 real products ───────────────────────────────────────────────
  console.log('\nInserting 5 real products...');
  const insertedIds = [];

  for (const product of PRODUCTS) {
    const payload = {
      ...product,
      seller_id: store.owner_id,
      store_id: store.id,
      ...(electronicsCategory ? { category_id: electronicsCategory.id } : {}),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('products')
      .insert([payload])
      .select('id, name')
      .single();

    if (insertErr) {
      console.warn(`  ✗ Failed to insert "${product.name}": ${insertErr.message}`);
      insertedIds.push(null);
    } else {
      console.log(`  ✓ Inserted: "${inserted.name}" (${inserted.id})`);
      insertedIds.push(inserted.id);
    }
  }

  // ── Insert reviews ───────────────────────────────────────────────────────
  console.log('\nInserting reviews...');
  let reviewCount = 0;

  for (const [idx, productId] of insertedIds.entries()) {
    if (!productId) continue;
    const productName = PRODUCTS[idx].name;
    const reviewsForProduct = REVIEWS[idx] || [];

    for (const review of reviewsForProduct) {
      const { error: revErr } = await supabase.from('reviews').insert([{
        product_id: productId,
        product_name: productName,
        user_name: review.user_name,
        user_email: `${review.user_name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        rating: review.rating,
        title: review.title,
        message: review.message,
      }]);

      if (revErr) {
        console.warn(`  ✗ Review by "${review.user_name}" failed: ${revErr.message}`);
      } else {
        console.log(`  ✓ Review by "${review.user_name}" (${review.rating}★) for "${productName}"`);
        reviewCount++;
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Done.`);
  console.log(`  Products inserted : ${insertedIds.filter(Boolean).length} / ${PRODUCTS.length}`);
  console.log(`  Reviews inserted  : ${reviewCount}`);
  console.log('═══════════════════════════════════════════════════\n');
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
