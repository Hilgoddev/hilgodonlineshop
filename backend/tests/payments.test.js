// Payment + order-status + stock integrity, run against an in-memory fake DB
// (never the real database or the real .env — see tests/setup.js).
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
const START_STOCK = { 'prod-a': 10, 'prod-b': 10 };

// Minimal stateful DB: one order, its lines, product stock, payment_events.
// take/release mirror migration 021's take_order_stock / release_order_stock.
let db;
function resetDb({ status = 'pending', payment_method = 'paystack', total = 5000, currency = 'NGN', taken = [0, 0] } = {}) {
  db = {
    order: { id: ORDER_ID, user_id: 'buyer-1', total_amount: total, currency, status, payment_method, payment_reference: null, created_at: '2026-09-22T00:00:00Z' },
    items: [
      { id: 'line-a', order_id: ORDER_ID, product_id: 'prod-a', quantity: 2, unit_price: 1500, fulfillment_status: 'pending', stock_taken_qty: taken[0] },
      { id: 'line-b', order_id: ORDER_ID, product_id: 'prod-b', quantity: 1, unit_price: 2000, fulfillment_status: 'pending', stock_taken_qty: taken[1] },
    ],
    stock: { 'prod-a': START_STOCK['prod-a'] - taken[0], 'prod-b': START_STOCK['prod-b'] - taken[1] },
    events: new Map(),
    failNextOrderRead: false,
  };
  fake.rpcHandler = (fn, { p_order_id, p_item_id }) => {
    let total = 0;
    for (const line of db.items.filter((l) => l.order_id === p_order_id)) {
      if (fn === 'take_order_stock' && line.stock_taken_qty === 0 && line.fulfillment_status !== 'cancelled') {
        const t = Math.min(db.stock[line.product_id], line.quantity);
        db.stock[line.product_id] -= t; line.stock_taken_qty = t; total += t;
      }
      if (fn === 'release_order_stock' && line.stock_taken_qty > 0 && (!p_item_id || line.id === p_item_id)) {
        db.stock[line.product_id] += line.stock_taken_qty; total += line.stock_taken_qty; line.stock_taken_qty = 0;
      }
    }
    return { data: total, error: null };
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

// Let fire-and-forget work (handlePaymentSuccess after a response) finish.
const flush = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
const TAKEN = { 'prod-a': 8, 'prod-b': 9 }; // stock after the order took its lines

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
    expect(db.stock).toEqual(START_STOCK);
  });

  it('rejects a payment in the wrong currency', async () => {
    const r = await markOrderPaid({ orderId: ORDER_ID, reference: 'r', paidAmount: 5000, currency: 'usd', provider: 't' });
    expect(r).toEqual({ ok: false, reason: 'currency_mismatch' });
    expect(db.order.status).toBe('pending');
  });

  it('marks a pending order paid and takes stock exactly once', async () => {
    const first = await markOrderPaid({ orderId: ORDER_ID, reference: 'r', paidAmount: 5000, currency: 'ngn', provider: 't' });
    const second = await markOrderPaid({ orderId: ORDER_ID, reference: 'r', paidAmount: 5000, currency: 'NGN', provider: 't' });
    expect(first).toEqual({ ok: true, claimed: true });
    expect(second).toEqual({ ok: true, claimed: false });
    expect(db.order.status).toBe('paid');
    expect(db.stock).toEqual(TAKEN);
  });

  it('never flips a processing order back to paid', async () => {
    resetDb({ status: 'processing', taken: [2, 1] });
    const r = await markOrderPaid({ orderId: ORDER_ID, reference: 'r', paidAmount: 5000, currency: 'NGN', provider: 't' });
    expect(r.claimed).toBe(false);
    expect(db.order.status).toBe('processing');
    expect(db.stock).toEqual(TAKEN);
  });

  it('reports (does not swallow) a payment for a cancelled order', async () => {
    resetDb({ status: 'cancelled' });
    const r = await markOrderPaid({ orderId: ORDER_ID, reference: 'r', paidAmount: 5000, currency: 'NGN', provider: 't' });
    expect(r).toEqual({ ok: false, reason: 'order_cancelled' });
    expect(db.order.status).toBe('cancelled');
  });
});

describe('Paystack webhook', () => {
  it('applies a correct payment once, even if the event is delivered twice', async () => {
    expect((await paystackWebhook(chargeSuccess(500000))).statusCode).toBe(200);
    expect((await paystackWebhook(chargeSuccess(500000))).statusCode).toBe(200);
    expect(db.order.status).toBe('paid');
    expect(db.stock).toEqual(TAKEN);
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

  it('tells the buyer a refund is coming when the order was cancelled first', async () => {
    resetDb({ status: 'cancelled' });
    paystackSays(500000);
    const res = await request(app).get('/api/payment/verify/ref-1');
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/cancelled/i);
    expect(res.body.message).toMatch(/refund/i);
  });
});

describe('PUT /api/orders/:id (admin status changes)', () => {
  const setStatus = async (status) => {
    const res = await request(app).put(`/api/orders/${ORDER_ID}`).send({ status });
    await flush();
    return res;
  };

  it('takes stock once for an online order: paid → processing → shipped → delivered', async () => {
    resetDb({ status: 'paid', taken: [2, 1] }); // payment already took the stock
    for (const s of ['processing', 'shipped', 'delivered']) expect((await setStatus(s)).statusCode).toBe(200);
    expect(db.stock).toEqual(TAKEN);
  });

  it('takes stock once for a POD order when it ships', async () => {
    resetDb({ status: 'pending', payment_method: 'pod' });
    await setStatus('processing');
    expect(db.stock).toEqual(START_STOCK);
    await setStatus('shipped');
    expect(db.stock).toEqual(TAKEN);
    await setStatus('delivered');
    expect(db.stock).toEqual(TAKEN);
  });

  it('returns exactly what was taken when cancelling (a line already returned is skipped)', async () => {
    resetDb({ status: 'processing', taken: [2, 0] }); // line b was cancelled and returned earlier
    db.items[1].fulfillment_status = 'cancelled';
    db.stock['prod-b'] = 10;
    await setStatus('cancelled');
    expect(db.stock).toEqual(START_STOCK);
  });

  it('does not change stock when cancelling an unpaid order', async () => {
    await setStatus('cancelled');
    expect(db.stock).toEqual(START_STOCK);
  });

  it('a repeated cancel (double-click) never returns stock twice', async () => {
    resetDb({ status: 'shipped', taken: [2, 1] });
    await setStatus('cancelled');
    await setStatus('cancelled');
    expect(db.stock).toEqual(START_STOCK);
  });

  it('refuses an update when the order changed since it was read', async () => {
    resetDb({ status: 'paid', taken: [2, 1] });
    // Simulate a concurrent change landing between the read and the update.
    const handler = fake.handler;
    let reads = 0;
    fake.handler = (q) => {
      if (q.table === 'orders' && q.op === 'select' && ++reads === 1) {
        const r = handler(q); db.order.status = 'processing'; return r;
      }
      return handler(q);
    };
    const res = await setStatus('cancelled');
    expect(res.statusCode).toBe(409);
    expect(db.order.status).toBe('processing');
    expect(db.stock).toEqual(TAKEN);
  });

  it('keeps stock right across cancel → reopen → ship → cancel', async () => {
    resetDb({ status: 'shipped', taken: [2, 1] });
    await setStatus('cancelled');  // returns stock; lines marked cancelled
    expect(db.stock).toEqual(START_STOCK);
    await setStatus('paid');       // lines still cancelled → nothing taken
    expect(db.stock).toEqual(START_STOCK);
    await setStatus('shipped');    // lines un-cancelled → taken now
    expect(db.stock).toEqual(TAKEN);
    await setStatus('cancelled');  // returned exactly once
    expect(db.stock).toEqual(START_STOCK);
  });
});

describe('POST /api/payment/initialize (Paystack client over fetch)', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('sends the server-side amount in integer kobo and returns the checkout URL', async () => {
    resetDb({ total: 1234.57 });
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ status: true, data: { authorization_url: 'https://checkout.paystack.com/x', reference: 'ref-9' } }),
    }));
    const res = await request(app).post('/api/payment/initialize').send({ order_id: ORDER_ID, email: 'b@example.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.authorization_url).toBe('https://checkout.paystack.com/x');
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.paystack.co/transaction/initialize');
    expect(opts.headers.Authorization).toBe(`Bearer ${process.env.PAYSTACK_SECRET_KEY}`);
    expect(JSON.parse(opts.body).amount).toBe(123457);
  });

  it("surfaces Paystack's error message as a 502", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 400, json: async () => ({ status: false, message: 'Invalid email' }) }));
    const res = await request(app).post('/api/payment/initialize').send({ order_id: ORDER_ID, email: 'b@example.com' });
    expect(res.statusCode).toBe(502);
    expect(res.body.message).toBe('Invalid email');
  });

  it('refuses to start a payment for an order that is not awaiting payment', async () => {
    resetDb({ status: 'cancelled' });
    global.fetch = jest.fn();
    const res = await request(app).post('/api/payment/initialize').send({ order_id: ORDER_ID, email: 'b@example.com' });
    expect(res.statusCode).toBe(409);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
