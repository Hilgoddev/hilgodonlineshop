// Input validation + admin safeguards, against the in-memory fake DB — never
// the real database, and never the real .env.
jest.mock('dotenv', () => ({ config: () => ({}) }));
jest.mock('../src/config/supabase', () => require('./helpers/fakeSupabase').supabase);
jest.mock('../src/routes/auth', () => ({
  router: require('express').Router(),
  verifyToken: (req, res, next) => {
    req.user = { id: req.headers['x-test-user'] || 'user-1', email: 'u@example.com' };
    next();
  },
}));
// Settings are cached for 30s in-process, so tests control them directly.
const mockSettings = {};
jest.mock('../src/lib/settings', () => ({
  getSetting: async (key, fallback = null) => (key in mockSettings ? mockSettings[key] : fallback),
  setSetting: async (key, value) => { mockSettings[key] = value; },
}));
jest.mock('../src/services/email', () => ({
  sendEmail: jest.fn(async () => {}),
  escapeHtml: (s) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  newsletterConfirmHtml: () => '',
}));

const request = require('supertest');
const fake = require('./helpers/fakeSupabase');
const { sendEmail } = require('../src/services/email');
const { makeCache } = require('../src/lib/resilience');
const app = require('../src/index');

const STORE_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

// Default world: user-1 is a seller who owns no stores; tables are empty.
function world({ role = 'seller', ownsStore = false, product = null, admins = 2, payoutStatus = null, autoApprove = false } = {}) {
  mockSettings.auto_approve_products = autoApprove;
  fake.handler = ({ table, op, filters, payload }) => {
    if (table === 'profiles' && op === 'select') {
      if (filters.role === 'admin') return { data: null, count: admins, error: null };
      return { data: { role, id: filters.id }, error: null };
    }
    if (table === 'stores') return { data: ownsStore && filters.owner_id === 'user-1' ? { id: STORE_ID } : null, error: null };
    if (table === 'products' && op === 'select') return { data: product, error: null };
    if (table === 'products' && (op === 'insert' || op === 'update')) {
      return { data: [{ id: PRODUCT_ID, ...(product || {}), ...(Array.isArray(payload) ? payload[0] : payload) }], error: null };
    }
    if (table === 'seller_payouts' && op === 'update') {
      const allowed = filters.status;
      return { data: payoutStatus && allowed.includes(payoutStatus) ? [{ id: 'p1', status: payload.status }] : [], error: null };
    }
    if (table === 'seller_payouts' && op === 'select') return { data: payoutStatus ? { status: payoutStatus } : null, error: null };
    return { data: null, error: null };
  };
}

beforeEach(() => { fake.reset(); sendEmail.mockClear(); world(); });

describe('newsletter + careers forms', () => {
  it('subscribes a valid email (used to always 500)', async () => {
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: ' Reader@Example.com ' });
    expect(res.statusCode).toBe(200);
    const upsert = fake.calls.find((c) => c.table === 'newsletter_subscribers');
    expect(upsert.payload.email).toBe('reader@example.com');
  });

  it('rejects an invalid email', async () => {
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'not-an-email@' });
    expect(res.statusCode).toBe(400);
  });

  it('reports a DB failure instead of pretending to subscribe', async () => {
    fake.handler = () => ({ data: null, error: { message: 'down' } });
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'a@b.co' });
    expect(res.statusCode).toBe(500);
  });

  it('accepts a careers application (used to always 500)', async () => {
    const res = await request(app).post('/api/careers/apply')
      .send({ fullName: 'Ada', email: 'ada@example.com', role: 'Designer', cvLink: 'https://cv.example.com' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects a javascript: CV link', async () => {
    const res = await request(app).post('/api/careers/apply')
      .send({ fullName: 'Ada', email: 'ada@example.com', role: 'Designer', cvLink: 'javascript:alert(1)' });
    expect(res.statusCode).toBe(400);
  });
});

describe('product validation', () => {
  const base = { name: 'Lamp', category: 'home', price: 5000, stock: 3 };

  it('rejects a negative price', async () => {
    const res = await request(app).post('/api/products').send({ ...base, price: -1000 });
    expect(res.statusCode).toBe(400);
  });

  it('rejects fractional or negative stock', async () => {
    expect((await request(app).post('/api/products').send({ ...base, stock: 1.5 })).statusCode).toBe(400);
    expect((await request(app).post('/api/products').send({ ...base, stock: -1 })).statusCode).toBe(400);
  });

  it("blocks attaching a product to another seller's store", async () => {
    const res = await request(app).post('/api/products').send({ ...base, store_id: STORE_ID });
    expect(res.statusCode).toBe(403);
  });

  it('allows the seller’s own store', async () => {
    world({ ownsStore: true });
    const res = await request(app).post('/api/products').send({ ...base, store_id: STORE_ID });
    expect(res.statusCode).toBe(201);
  });

  it('sends an approved product back to review when its name changes', async () => {
    world({ product: { name: 'Lamp', status: 'approved' } });
    await request(app).put(`/api/products/${PRODUCT_ID}`).send({ name: 'Totally different thing' });
    const update = fake.calls.find((c) => c.table === 'products' && c.op === 'update');
    expect(update.payload.status).toBe('pending');
  });

  it('keeps it live for a stock-only edit or an unchanged name', async () => {
    world({ product: { name: 'Lamp', status: 'approved' } });
    await request(app).put(`/api/products/${PRODUCT_ID}`).send({ stock: 10, name: 'Lamp' });
    const update = fake.calls.find((c) => c.table === 'products' && c.op === 'update');
    expect(update.payload.status).toBeUndefined();
  });

  it('keeps it live when auto-approve is on', async () => {
    world({ product: { name: 'Lamp', status: 'approved' }, autoApprove: true });
    await request(app).put(`/api/products/${PRODUCT_ID}`).send({ name: 'New name' });
    const update = fake.calls.find((c) => c.table === 'products' && c.op === 'update');
    expect(update.payload.status).toBeUndefined();
  });
});

describe('admin safeguards', () => {
  it('blocks an admin from removing their own admin role', async () => {
    world({ role: 'admin' });
    const res = await request(app).put('/api/admin/promote').send({ userId: 'user-1', newRole: 'customer' });
    expect(res.statusCode).toBe(400);
  });

  it('blocks demoting the last admin', async () => {
    world({ role: 'admin', admins: 1 });
    const res = await request(app).put('/api/admin/promote').send({ userId: 'other-admin', newRole: 'customer' });
    expect(res.statusCode).toBe(400);
  });

  it('refuses to mark a rejected payout as paid', async () => {
    world({ role: 'admin', payoutStatus: 'rejected' });
    const res = await request(app).put('/api/admin/payouts/p1').send({ status: 'paid' });
    expect(res.statusCode).toBe(409);
  });

  it('marks an approved payout as paid', async () => {
    world({ role: 'admin', payoutStatus: 'approved' });
    const res = await request(app).put('/api/admin/payouts/p1').send({ status: 'paid' });
    expect(res.statusCode).toBe(200);
  });
});

describe('uploads', () => {
  it('blocks customers from uploading images', async () => {
    world({ role: 'customer' });
    const res = await request(app).post('/api/upload/product-image')
      .attach('image', Buffer.from('fake'), { filename: 'a.png', contentType: 'image/png' });
    expect(res.statusCode).toBe(403);
  });
});

describe('makeCache', () => {
  it('evicts the oldest entries beyond maxEntries', () => {
    const c = makeCache({ ttlMs: 60000, maxEntries: 2 });
    c.set('a', 1); c.set('b', 2); c.set('c', 3);
    expect(c.get('a')).toBeUndefined();
    expect(c.get('c').value).toBe(3);
  });
});
