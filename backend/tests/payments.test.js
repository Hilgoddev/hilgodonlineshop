// Payment + order-status integrity, run against an in-memory fake DB — never
// the real database, and never the real .env.
jest.mock('dotenv', () => ({ config: () => ({}) }));
jest.mock('../src/config/supabase', () => require('./helpers/fakeSupabase').supabase);
jest.mock('../src/routes/auth', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: req.headers['x-test-user'] || 'buyer-1', email: 'b@example.com' };
    next();
  },
}));
jest.mock('../src/services/email', () => ({
  sendEmail: jest.fn(async () => {}),
  paymentConfirmedHtml: () => '', newOrderSellerHtml: () => '', newOrderAdminHtml: () => '',
  orderConfirmationHtml: () => '', orderStatusHtml: () => '', escapeHtml: (s) => s, formatMoney: (n) => String(n),
}));

process.env.PAYSTACK_SECRET_KEY = 'sk_test_fake_secret_for_tests';

const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const fake = require('./helpers/fakeSupabase');
const { markOrderPaid } = require('../src/services/paymentSuccess');
const paymentRoutes = require('../src/routes/payment');
const orderRoutes = require('../src/routes/orders');

const app = express();
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const ORDER_ID = '11111111-1111-4111-8111-111111111111';

// Minimal stateful DB: one order, its items, payment_events keys.
let db;
function resetDb({ status = 'pending', payment_method = 'paystack', total = 5000, currency = 'NGN' } = {}) {
  db = {
    order: { id: ORDER_ID, user_id: 'buyer-1', total_amount: total, currency, status, payment_method, created_at: '2026-09-22T00:00:00Z' },
    items: [
      { order_id: ORDER_ID, product_id: 'prod-a', quantity: 2, unit_price: 1500, fulfillment_status: 'pending' },
      { order_id: ORDER_ID, product_id: 'prod-b', quantity: 1, unit_price: 2000, fulfillment_status: 'pending' },
    ],
    events: new Map(),
    failNextOrderRead: false,
  };
  fake.handler = ({ table, op, filters, payload }) => {
    if (table === 'profiles') return { data: { role: 'admin' }, error: null };
    if (table === 'orders') {
      const matches = filters.id === db.order.id
        && (filters.user_id === undefined || filters.user_id === db.order.user_id)
        && (filters.status === undefined || filters.status === db.order.status);
      if (op === 'select') {
        if (db.failNextOrderRead) { db.failNextOrderRead = false; return { data: null, error: { message: 'db timeout' } }; }
        return { data: matches ? { ...db.order } : null, error: null };
      }
      if (op === 'update') {
        if (!matches) return { data: [], error: null };
        Object.assign(db.order, payload);
        return { data: [{ ...db.order }], error: null };
      }
    }
    if (table === 'order_items') {
      if (op === 'update') { db.items.forEach((i) => Object.assign(i, payload)); return { data: null, error: null }; }
      return { data: db.items.map((i) => ({ ...i })), error: null };
    }
    if (table === 'payment_events') {
      const key = payload?.event_key || filters.event_key;
      if (op === 'insert') {
        if (db.events.has(key)) return { data: null, error: { code: '23505' } };
        db.events.set(key, { processed: false });
        return { data: null, error: null };
      }
      if (op === 'update') { if (db.events.has(key)) db.events.get(key).processed = true; return { data: null, error: null }; }
      if (op === 'delete') {
        if (db.events.has(key) && !db.events.get(key).processed) db.events.delete(key);
        return { data: null, error: null };
      }
    }
    return { data: op === 'select' ? [] : null, error: null };
  };
}

const rpcCalls = (name) => fake.supabase.rpc.mock.calls.filter(([fn]) => fn === name);
// Let fire-and-forget work (handlePaymentSuccess after a response) finish.
const flush = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };

function paystackWebhook(event) {
  const body = JSON.stringify(event);
  const sig = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex');
  return request(app).post('/api/payment/webhook')
    .set('content-type', 'application/json').set('x-paystack-signature', sig).send(body);
}
const chargeSuccess = (amountKobo, id = 'evt-1') => ({
  event: 'charge.success',
  data: { id, reference: `ORD_${ORDER_ID}_1`, amount: amountKobo, currency: 'NGN', metadata: { order_id: ORDER_ID } },
});

beforeEach(() => { fake.reset(); resetDb(); });

describe('markOrderPaid', () => {
  it('rejects a payment for the wrong amount and leaves the order pending', async () => {
    const r = await markOrderPaid({ orderId: ORDER_ID, reference: 'r', paidAmount: 100, currency: 'NGN', provider: 't' });
    expect(r).toEqual({ ok: false, reason: 'amount_mismatch' });
    expect(db.order.status).toBe('pending');
    expect(rpcCalls('decrement_product_stock')).toHaveLength(0);
  });

  it('rejects a payment in the wrong currency', async () => {
    const r = await markOrderPaid({ orderId: ORDER_ID, reference: 'r', paidAmount: 5000, currency: 'usd', provider: 't' });
    expect(r).toEqual({ ok: false, reason: 'currency_mismatch' });
    expect(db.order.status).toBe('pending');
  });

  it('marks a pending order paid exactly once', async () => {
    const first = await markOrderPaid({ orderId: ORDER_ID, reference: 'r', paidAmount: 5000, currency: 'ngn', provider: 't' });
    const second = await markOrderPaid({ orderId: ORDER_ID, reference: 'r', paidAmount: 5000, currency: 'NGN', provider: 't' });
    expect(first).toEqual({ ok: true, claimed: true });
    expect(second).toEqual({ ok: true, claimed: false });
    expect(db.order.status).toBe('paid');
    expect(rpcCalls('decrement_product_stock')).toHaveLength(2); // one per line, once
  });

  it('never flips a processing order back to paid', async () => {
    resetDb({ status: 'processing' });
    const r = await markOrderPaid({ orderId: ORDER_ID, reference: 'r', paidAmount: 5000, currency: 'NGN', provider: 't' });
    expect(r.claimed).toBe(false);
    expect(db.order.status).toBe('processing');
    expect(rpcCalls('decrement_product_stock')).toHaveLength(0);
  });
});

describe('Paystack webhook', () => {
  it('applies a correct payment once, even if the event is delivered twice', async () => {
    expect((await paystackWebhook(chargeSuccess(500000))).statusCode).toBe(200);
    expect((await paystackWebhook(chargeSuccess(500000))).statusCode).toBe(200);
    expect(db.order.status).toBe('paid');
    expect(rpcCalls('decrement_product_stock')).toHaveLength(2);
  });

  it('acknowledges but does not apply an underpayment', async () => {
    const res = await paystackWebhook(chargeSuccess(100));
    expect(res.statusCode).toBe(200);
    expect(db.order.status).toBe('pending');
  });

  it('lets Paystack retry an event whose processing failed', async () => {
    db.failNextOrderRead = true;
    const failed = await paystackWebhook(chargeSuccess(500000));
    expect(failed.statusCode).toBe(500);
    expect(db.events.size).toBe(0); // released for retry
    const retried = await paystackWebhook(chargeSuccess(500000));
    expect(retried.statusCode).toBe(200);
    expect(db.order.status).toBe('paid');
  });

  it('rejects a bad signature', async () => {
    const res = await request(app).post('/api/payment/webhook')
      .set('content-type', 'application/json').set('x-paystack-signature', 'nope').send('{}');
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/payment/verify/:reference', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });
  const paystackSays = (amountKobo) => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ status: true, data: { status: 'success', reference: 'ref-1', amount: amountKobo, currency: 'NGN', metadata: { order_id: ORDER_ID } } }),
    }));
  };

  it('refuses to mark an order paid when the verified amount is too small', async () => {
    paystackSays(100);
    const res = await request(app).get('/api/payment/verify/ref-1');
    expect(res.statusCode).toBe(409);
    expect(db.order.status).toBe('pending');
  });

  it('refuses to confirm someone else’s order', async () => {
    paystackSays(500000);
    const res = await request(app).get('/api/payment/verify/ref-1').set('x-test-user', 'intruder');
    expect(res.statusCode).toBe(404);
    expect(db.order.status).toBe('pending');
  });

  it('confirms a correct payment for the owner', async () => {
    paystackSays(500000);
    const res = await request(app).get('/api/payment/verify/ref-1');
    expect(res.statusCode).toBe(200);
    expect(db.order.status).toBe('paid');
  });
});

describe('PUT /api/orders/:id (admin status changes)', () => {
  const setStatus = async (status) => {
    const res = await request(app).put(`/api/orders/${ORDER_ID}`).send({ status });
    await flush();
    return res;
  };

  it('takes stock once for an online order: paid → processing → shipped → delivered', async () => {
    resetDb({ status: 'paid' }); // payment already took the stock
    for (const s of ['processing', 'shipped', 'delivered']) expect((await setStatus(s)).statusCode).toBe(200);
    expect(rpcCalls('decrement_product_stock')).toHaveLength(0);
  });

  it('takes stock once for a POD order when it ships', async () => {
    resetDb({ status: 'pending', payment_method: 'pod' });
    await setStatus('processing');
    expect(rpcCalls('decrement_product_stock')).toHaveLength(0);
    await setStatus('shipped');
    expect(rpcCalls('decrement_product_stock')).toHaveLength(2);
    await setStatus('delivered');
    expect(rpcCalls('decrement_product_stock')).toHaveLength(2);
  });

  it('restores stock when cancelling an order whose stock was taken', async () => {
    resetDb({ status: 'processing' });
    db.items[1].fulfillment_status = 'cancelled'; // already restored by the seller route
    await setStatus('cancelled');
    expect(rpcCalls('increment_product_stock')).toEqual([
      ['increment_product_stock', { p_product_id: 'prod-a', p_quantity: 2 }],
    ]);
  });

  it('does not restore stock when cancelling an unpaid order', async () => {
    await setStatus('cancelled');
    expect(rpcCalls('increment_product_stock')).toHaveLength(0);
  });
});
