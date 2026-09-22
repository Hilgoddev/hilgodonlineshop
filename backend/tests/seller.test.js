// Seller route rules, run against an in-memory fake Supabase — never the real DB.
jest.mock('dotenv', () => ({ config: () => ({}) }));

// Minimal chainable stand-in for the supabase-js query builder. Each awaited
// query calls `mockHandler({ table, op, filters, payload })` for its result.
let mockHandler;
const mockCalls = [];
function mockBuilder(table) {
  const q = { table, op: 'select', filters: {}, payload: null };
  const chain = {
    select() { return chain; },
    insert(p) { q.op = 'insert'; q.payload = p; return chain; },
    update(p) { q.op = 'update'; q.payload = p; return chain; },
    eq(col, val) { q.filters[col] = val; return chain; },
    in(col, val) { q.filters[col] = val; return chain; },
    order() { return chain; },
    limit() { return chain; },
    single() { return chain; },
    maybeSingle() { return chain; },
    then(resolve, reject) {
      mockCalls.push({ ...q });
      return Promise.resolve(mockHandler(q)).then(resolve, reject);
    },
  };
  return chain;
}
const mockSupabase = {
  from: (t) => mockBuilder(t),
  rpc: jest.fn(async () => ({ data: true, error: null })),
};
jest.mock('../src/config/supabase', () => mockSupabase);
jest.mock('../src/routes/auth', () => ({
  verifyToken: (req, res, next) => { req.user = { id: 'seller-1', email: 's@example.com' }; next(); },
}));
jest.mock('../src/services/email', () => ({ sendEmail: jest.fn(async () => {}), payoutRequestAdminHtml: () => '' }));
jest.mock('../src/lib/resilience', () => ({ getEmailMap: async () => new Map() }));

const express = require('express');
const request = require('supertest');
const sellerRoutes = require('../src/routes/seller');

const app = express();
app.use(express.json());
app.use('/api/seller', sellerRoutes);
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

// Build a handler for a seller-owned item in an order with the given state.
function orderScenario({ role = 'seller', status, payment_method }) {
  return ({ table, op }) => {
    if (table === 'profiles') return { data: { role }, error: null };
    if (table === 'order_items' && op === 'select') {
      return { data: { id: 'item-1', order_id: 'order-1', product_id: 'prod-1', quantity: 1, fulfillment_status: 'pending' }, error: null };
    }
    if (table === 'products') return { data: { id: 'prod-1', seller_id: 'seller-1' }, error: null };
    if (table === 'orders' && op === 'select') return { data: { status, payment_method }, error: null };
    if (table === 'order_items' && op === 'update') return { data: { id: 'item-1', order_id: 'order-1', quantity: 1 }, error: null };
    return { data: null, error: null };
  };
}

const patchStatus = (fulfillmentStatus) =>
  request(app).patch('/api/seller/order-items/item-1/status').send({ fulfillmentStatus });

beforeEach(() => { mockCalls.length = 0; mockSupabase.rpc.mockClear(); });

describe('PATCH /api/seller/order-items/:id/status', () => {
  it('blocks a seller from delivering an unpaid online order', async () => {
    mockHandler = orderScenario({ status: 'pending', payment_method: 'paystack' });
    const res = await patchStatus('delivered');
    expect(res.statusCode).toBe(409);
    expect(mockCalls.some((c) => c.op === 'update')).toBe(false);
  });

  it('blocks a seller from marking a POD order delivered', async () => {
    mockHandler = orderScenario({ status: 'shipped', payment_method: 'pod' });
    const res = await patchStatus('delivered');
    expect(res.statusCode).toBe(403);
    expect(mockCalls.some((c) => c.op === 'update')).toBe(false);
  });

  it('blocks updates on a cancelled order', async () => {
    mockHandler = orderScenario({ status: 'cancelled', payment_method: 'paystack' });
    const res = await patchStatus('shipped');
    expect(res.statusCode).toBe(409);
  });

  it('lets a seller ship a paid online order', async () => {
    mockHandler = orderScenario({ status: 'paid', payment_method: 'paystack' });
    const res = await patchStatus('shipped');
    expect(res.statusCode).toBe(200);
  });

  it('lets an admin deliver a POD order', async () => {
    mockHandler = orderScenario({ role: 'admin', status: 'shipped', payment_method: 'pod' });
    const res = await patchStatus('delivered');
    expect(res.statusCode).toBe(200);
  });

  it('restores stock when cancelling an item of a processing order', async () => {
    mockHandler = orderScenario({ status: 'processing', payment_method: 'paystack' });
    const res = await patchStatus('cancelled');
    expect(res.statusCode).toBe(200);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_product_stock', { p_product_id: 'prod-1', p_quantity: 1 });
  });

  it('does not restore stock when cancelling an unpaid order', async () => {
    mockHandler = orderScenario({ status: 'pending', payment_method: 'paystack' });
    const res = await patchStatus('cancelled');
    expect(res.statusCode).toBe(200);
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });
});

describe('seller balance', () => {
  const balanceScenario = ({ table, op }) => {
    if (table === 'profiles') return { data: { role: 'seller' }, error: null };
    if (table === 'order_items') {
      return {
        data: [
          { quantity: 2, unit_price: 1000, fulfillment_status: 'delivered', order: { status: 'delivered', payment_method: 'paystack' } },
          { quantity: 1, unit_price: 5000, fulfillment_status: 'cancelled', order: { status: 'delivered', payment_method: 'paystack' } },
          { quantity: 1, unit_price: 9000, fulfillment_status: 'pending', order: { status: 'pending', payment_method: 'paystack' } },
        ],
        error: null,
      };
    }
    if (table === 'seller_payouts' && op === 'select') return { data: [], error: null };
    return { data: null, error: null };
  };

  it('counts only paid, non-cancelled lines, keyed on order_items.seller_id', async () => {
    mockHandler = balanceScenario;
    const res = await request(app).get('/api/seller/earnings');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.grossSales).toBe(2000);
    expect(res.body.data.available).toBe(1800);
    const itemsQuery = mockCalls.find((c) => c.table === 'order_items');
    expect(itemsQuery.filters.seller_id).toBe('seller-1');
  });

  it('returns 409 when the DB rejects a second pending payout', async () => {
    mockHandler = (q) => {
      if (q.table === 'seller_payouts' && q.op === 'insert') return { data: null, error: { code: '23505' } };
      return balanceScenario(q);
    };
    const res = await request(app).post('/api/seller/payouts/request').send({ amount: 500 });
    expect(res.statusCode).toBe(409);
  });
});
