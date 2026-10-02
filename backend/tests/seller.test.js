// Seller route rules, run against an in-memory fake Supabase — never the real DB.

jest.mock('../src/config/supabase', () => require('./helpers/fakeSupabase').supabase);
jest.mock('../src/routes/auth', () => ({
  verifyToken: (req, res, next) => { req.user = { id: 'seller-1', email: 's@example.com' }; next(); },
}));
jest.mock('../src/services/email', () => ({ sendEmail: jest.fn(async () => {}), payoutRequestAdminHtml: () => '' }));
jest.mock('../src/lib/resilience', () => ({ getEmailMap: async () => new Map() }));

const express = require('express');
const request = require('supertest');
const sellerRoutes = require('../src/routes/seller');
const fake = require('./helpers/fakeSupabase');

const app = express();
app.use(express.json());
app.use('/api/seller', sellerRoutes);
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

// Build a handler for a seller-owned item in an order with the given state.
// `lineStatus` is the item's current status; `orderMoves` decides whether the
// conditional order-status update wins (true) or loses a race (false).
function orderScenario({ role = 'seller', status, payment_method, lineStatus = 'pending', orderMoves = true }) {
  const line = { id: 'item-1', order_id: 'order-1', product_id: 'prod-1', quantity: 1, unit_price: 1000, fulfillment_status: lineStatus };
  return ({ table, op, filters, payload }) => {
    if (table === 'profiles') return { data: { role }, error: null };
    if (table === 'order_items' && op === 'select') {
      // By id → the single line; by order_id → the order's lines (a list).
      return { data: filters.order_id ? [{ ...line }] : { ...line }, error: null };
    }
    if (table === 'order_items' && op === 'update') {
      Object.assign(line, payload);
      return { data: { ...line }, error: null };
    }
    if (table === 'orders' && op === 'update') return { data: orderMoves ? [{ id: 'order-1', ...payload }] : [], error: null };
    if (table === 'products') {
      const product = { id: 'prod-1', seller_id: 'seller-1', name: 'Lamp' };
      return { data: Array.isArray(filters.id) ? [product] : product, error: null };
    }
    if (table === 'orders' && op === 'select') return { data: { status, payment_method }, error: null };
    return { data: null, error: null };
  };
}

const patchStatus = (fulfillmentStatus) =>
  request(app).patch('/api/seller/order-items/item-1/status').send({ fulfillmentStatus });

beforeEach(() => fake.reset());

describe('PATCH /api/seller/order-items/:id/status', () => {
  it('blocks a seller from delivering an unpaid online order', async () => {
    fake.handler = orderScenario({ status: 'pending', payment_method: 'paystack' });
    const res = await patchStatus('delivered');
    expect(res.statusCode).toBe(409);
    expect(fake.calls.some((c) => c.op === 'update')).toBe(false);
  });

  it('blocks a seller from marking a POD order delivered', async () => {
    fake.handler = orderScenario({ status: 'shipped', payment_method: 'pod' });
    const res = await patchStatus('delivered');
    expect(res.statusCode).toBe(403);
    expect(fake.calls.some((c) => c.op === 'update')).toBe(false);
  });

  it('blocks updates on a cancelled order', async () => {
    fake.handler = orderScenario({ status: 'cancelled', payment_method: 'paystack' });
    const res = await patchStatus('shipped');
    expect(res.statusCode).toBe(409);
  });

  it('lets a seller ship a paid online order', async () => {
    fake.handler = orderScenario({ status: 'paid', payment_method: 'paystack' });
    const res = await patchStatus('shipped');
    expect(res.statusCode).toBe(200);
  });

  it('lets an admin deliver a POD order', async () => {
    fake.handler = orderScenario({ role: 'admin', status: 'shipped', payment_method: 'pod' });
    const res = await patchStatus('delivered');
    expect(res.statusCode).toBe(200);
  });

  it('cancelling a line returns exactly what that line took (stock ledger)', async () => {
    fake.handler = orderScenario({ status: 'processing', payment_method: 'paystack' });
    const res = await patchStatus('cancelled');
    expect(res.statusCode).toBe(200);
    expect(fake.supabase.rpc).toHaveBeenCalledWith('release_order_stock', { p_order_id: 'order-1', p_item_id: 'item-1' });
  });

  it('reopening a cancelled line on a paid order takes its stock again', async () => {
    fake.handler = orderScenario({ status: 'paid', payment_method: 'paystack', lineStatus: 'cancelled' });
    const res = await patchStatus('packed');
    expect(res.statusCode).toBe(200);
    expect(fake.supabase.rpc).toHaveBeenCalledWith('take_order_stock', { p_order_id: 'order-1' });
  });

  it('a POD order leaving for delivery takes stock once', async () => {
    fake.handler = orderScenario({ status: 'pending', payment_method: 'pod' });
    await patchStatus('shipped');
    for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
    expect(fake.supabase.rpc.mock.calls.filter(([fn]) => fn === 'take_order_stock')).toHaveLength(1);
  });

  it('a seller who loses the status race does not repeat the first-shipment actions', async () => {
    fake.handler = orderScenario({ status: 'pending', payment_method: 'pod', orderMoves: false });
    await patchStatus('shipped');
    for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
    expect(fake.supabase.rpc).not.toHaveBeenCalledWith('take_order_stock', expect.anything());
    // …but it did attempt the (conditional) order update.
    expect(fake.calls.some((c) => c.table === 'orders' && c.op === 'update' && c.filters.status === 'pending')).toBe(true);
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
    fake.handler = balanceScenario;
    const res = await request(app).get('/api/seller/earnings');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.grossSales).toBe(2000);
    expect(res.body.data.available).toBe(1800);
    const itemsQuery = fake.calls.find((c) => c.table === 'order_items');
    expect(itemsQuery.filters.seller_id).toBe('seller-1');
  });

  it('returns 409 when the DB rejects a second pending payout', async () => {
    fake.handler = (q) => {
      if (q.table === 'seller_payouts' && q.op === 'insert') return { data: null, error: { code: '23505' } };
      return balanceScenario(q);
    };
    const res = await request(app).post('/api/seller/payouts/request').send({ amount: 500 });
    expect(res.statusCode).toBe(409);
  });
});
