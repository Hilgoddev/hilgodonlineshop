// Unlimited product images, multi-colour products and per-colour cart/order
// lines, against the in-memory fake DB — never the real database.
jest.mock('../src/config/supabase', () => require('./helpers/fakeSupabase').supabase);
jest.mock('../src/routes/auth', () => ({
  router: require('express').Router(),
  verifyToken: (req, res, next) => {
    req.user = { id: req.headers['x-test-user'] || 'user-1', email: 'u@example.com' };
    next();
  },
}));
jest.mock('../src/lib/settings', () => ({
  getSetting: async (key, fallback = null) => fallback,
  setSetting: async () => {},
}));
jest.mock('../src/services/email', () => ({
  sendEmail: jest.fn(async () => {}),
  escapeHtml: (s) => String(s),
  newsletterConfirmHtml: () => '',
  orderConfirmationHtml: () => '', orderStatusHtml: () => '', formatMoney: (n) => String(n),
  paymentConfirmedHtml: () => '', newOrderSellerHtml: () => '', newOrderAdminHtml: () => '',
}));
jest.mock('../src/utils/pricing', () => {
  const actual = jest.requireActual('../src/utils/pricing');
  return { ...actual, getActiveFlashSaleMap: async () => new Map() };
});

const request = require('supertest');
const fake = require('./helpers/fakeSupabase');
const app = require('../src/index');
const { sanitizeImages, sanitizeColors, sanitizeColorImages, variantKey, resolveOptionsForProduct } = require('../src/lib/variants');

const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const RED = '#ff0000';
const BLUE = '#0000ff';
const SHIRT = {
  id: PRODUCT_ID, name: 'Shirt', price: 5000, stock: 10, is_active: true, status: 'approved',
  seller_id: 'seller-1', images: ['https://x.test/1.jpg'], color_options: [RED, BLUE], size_options: ['M', 'L'],
};

describe('variants lib', () => {
  it('keeps every image, in order, without duplicates or junk', () => {
    const many = Array.from({ length: 12 }, (_, i) => `https://x.test/${i}.jpg`);
    expect(sanitizeImages([...many, many[0], '', 'javascript:alert(1)', 42])).toEqual(many);
    expect(sanitizeImages('nope')).toBeNull();
  });

  it('normalises colours and drops duplicates', () => {
    expect(sanitizeColors(['#FF0000', '#f00', 'Navy', 'navy', '<script>'])).toEqual(['#ff0000', 'Navy']);
  });

  it('links colour photos only to the product’s own colours and images', () => {
    const out = sanitizeColorImages(
      { '#FF0000': 'https://x.test/red.jpg', '#00ff00': 'https://x.test/red.jpg', '#0000ff': 'https://evil.test/x.jpg' },
      [RED, BLUE], ['https://x.test/red.jpg'],
    );
    expect(out).toEqual({ [RED]: 'https://x.test/red.jpg' });
  });

  it('builds a stable variant key', () => {
    expect(variantKey({ size: 'M', color: '#FF0000' })).toBe(variantKey({ color: '#ff0000', size: 'M' }));
    expect(variantKey(null)).toBe('');
  });

  it('requires a colour on a multi-colour product and rejects unknown ones', () => {
    expect(resolveOptionsForProduct(SHIRT, { size: 'M' }).error).toMatch(/choose a colour/i);
    expect(resolveOptionsForProduct(SHIRT, { color: '#123456' }).error).toMatch(/not available/i);
    expect(resolveOptionsForProduct(SHIRT, { color: '#FF0000', size: 'M' }).options).toEqual({ color: RED, size: 'M' });
    expect(resolveOptionsForProduct({ name: 'Mug' }, { color: RED }).options).toBeNull();
  });
});

describe('product images + colours', () => {
  function world(stored = null) {
    fake.handler = ({ table, op, payload }) => {
      if (table === 'profiles') return { data: { role: 'admin' }, error: null };
      if (table === 'products' && op === 'select') return { data: stored, error: null };
      if (table === 'products') return { data: [{ id: PRODUCT_ID, ...(Array.isArray(payload) ? payload[0] : payload) }], error: null };
      return { data: null, error: null };
    };
  }
  beforeEach(() => fake.reset());

  it('saves all 7 images and every colour', async () => {
    world();
    const images = Array.from({ length: 7 }, (_, i) => `https://x.test/${i}.jpg`);
    const res = await request(app).post('/api/products').send({
      name: 'Shirt', category: 'menswear', price: 5000, stock: 3, images,
      color_options: [RED, BLUE, '#00ff00'], color_images: { [BLUE]: images[3] },
    });
    expect(res.statusCode).toBe(201);
    const insert = fake.calls.find((c) => c.table === 'products' && c.op === 'insert').payload[0];
    expect(insert.images).toHaveLength(7);
    expect(insert.color_options).toEqual([RED, BLUE, '#00ff00']);
    expect(insert.color_images).toEqual({ [BLUE]: images[3] });
  });

  it('rejects a product with no images', async () => {
    world();
    const res = await request(app).post('/api/products').send({ name: 'Shirt', category: 'menswear', price: 5000, stock: 3 });
    expect(res.statusCode).toBe(400);
  });

  it('drops a colour photo when its image is removed', async () => {
    world({ images: ['https://x.test/a.jpg', 'https://x.test/b.jpg'], color_options: [RED], color_images: { [RED]: 'https://x.test/b.jpg' } });
    await request(app).put(`/api/products/${PRODUCT_ID}`).send({ images: ['https://x.test/a.jpg'] });
    const update = fake.calls.find((c) => c.table === 'products' && c.op === 'update');
    expect(update.payload.color_images).toBeNull();
  });
});

describe('cart lines per colour', () => {
  let rows;
  beforeEach(() => {
    fake.reset();
    rows = [];
    fake.handler = ({ table, op, filters, payload }) => {
      if (table === 'products') return { data: SHIRT, error: null };
      if (table !== 'cart_items') return { data: null, error: null };
      if (op === 'select') return { data: rows.find((r) => r.product_id === filters.product_id && r.variant_key === filters.variant_key) || null, error: null };
      if (op === 'insert') { rows.push({ id: `r${rows.length}`, ...payload }); return { data: null, error: null }; }
      if (op === 'update') { Object.assign(rows.find((r) => r.id === filters.id), payload); return { data: null, error: null }; }
      return { data: null, error: null };
    };
  });

  it('refuses to add a multi-colour product without a colour', async () => {
    const res = await request(app).post('/api/cart').send({ productId: PRODUCT_ID, quantity: 1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('OPTIONS_REQUIRED');
  });

  it('keeps red and blue as separate lines and merges repeats', async () => {
    await request(app).post('/api/cart').send({ productId: PRODUCT_ID, quantity: 1, selectedOptions: { color: RED, size: 'M' } });
    await request(app).post('/api/cart').send({ productId: PRODUCT_ID, quantity: 2, selectedOptions: { color: BLUE, size: 'M' } });
    await request(app).post('/api/cart').send({ productId: PRODUCT_ID, quantity: 1, selectedOptions: { color: '#FF0000', size: 'M' } });
    expect(rows.map((r) => [r.selected_options.color, r.quantity])).toEqual([[RED, 2], [BLUE, 2]]);
  });
});

describe('orders with colours', () => {
  let inserted;
  beforeEach(() => {
    fake.reset();
    inserted = null;
    fake.handler = ({ table, op, payload }) => {
      if (table === 'products') return { data: [SHIRT], error: null };
      if (table === 'orders' && op === 'insert') return { data: [{ id: '44444444-4444-4444-8444-444444444444', ...payload[0] }], error: null };
      if (table === 'order_items' && op === 'insert') { inserted = payload; return { data: null, error: null }; }
      return { data: null, error: null };
    };
  });
  const order = (items) => request(app).post('/api/orders').send({ items, shippingAddress: { line1: 'x' }, paymentMethod: 'pod' });

  it('records one line per colour of the same product', async () => {
    const res = await order([
      { productId: PRODUCT_ID, quantity: 1, price: 5000, selectedOptions: { color: RED, size: 'M' } },
      { productId: PRODUCT_ID, quantity: 2, price: 5000, selectedOptions: { color: BLUE, size: 'M' } },
    ]);
    expect(res.statusCode).toBe(201);
    expect(inserted.map((r) => [r.selected_options.color, r.quantity])).toEqual([[RED, 1], [BLUE, 2]]);
  });

  it('rejects a line with no colour chosen', async () => {
    const res = await order([{ productId: PRODUCT_ID, quantity: 1, price: 5000 }]);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('OPTIONS_REQUIRED');
  });

  it('checks stock across all colours of a product', async () => {
    const res = await order([
      { productId: PRODUCT_ID, quantity: 6, price: 5000, selectedOptions: { color: RED, size: 'M' } },
      { productId: PRODUCT_ID, quantity: 6, price: 5000, selectedOptions: { color: BLUE, size: 'M' } },
    ]);
    expect(res.statusCode).toBe(409);
  });
});
describe('required sizes', () => {
 it('rejects missing and invalid sizes while preserving valid spelling', () => {
  expect(resolveOptionsForProduct(SHIRT, {color: RED}).error).toMatch(/choose a size/i);
  expect(resolveOptionsForProduct(SHIRT, {color: RED, size: 'XL'}).error).toMatch(/not available/i);
  expect(resolveOptionsForProduct(SHIRT, {color: RED, size: 'm'}).options.size).toBe('M');
  expect(resolveOptionsForProduct({name:'Mug'}, null).error).toBeNull();
 });
 it('rejects a size-only product before cart insertion', async () => {
  fake.reset(); fake.handler=({table})=>({data:table==='products'?{...SHIRT,color_options:[]}:null,error:null});
  const res=await request(app).post('/api/cart').send({productId:PRODUCT_ID,quantity:1});
  expect(res.statusCode).toBe(400);expect(res.body.error).toMatch(/choose a size/i);
  expect(fake.calls.some(c=>c.table==='cart_items'&&c.op==='insert')).toBe(false);
 });
 it('rejects a missing size at order submission',async()=>{
  fake.reset();fake.handler=({table})=>({data:table==='products'?[SHIRT]:null,error:null});
  const res=await request(app).post('/api/orders').send({items:[{productId:PRODUCT_ID,quantity:1,price:5000,selectedOptions:{color:RED}}],shippingAddress:{line1:'x'},paymentMethod:'pod'});
  expect(res.statusCode).toBe(400);expect(res.body.error).toMatch(/choose a size/i);
 });
});
