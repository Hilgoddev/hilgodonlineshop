// Commission tiers, seller balance and payout methods/approval, against the
// in-memory fake DB — never the real database.
jest.mock('../src/config/supabase', () => require('./helpers/fakeSupabase').supabase);
jest.mock('../src/routes/auth', () => ({
  router: require('express').Router(),
  verifyToken: (req, res, next) => { req.user = { id: req.headers['x-test-user'] || 'seller-1', email: 's@example.com' }; next(); },
}));
jest.mock('../src/services/email', () => ({
  ...jest.requireActual('../src/services/email'),
  sendEmail: jest.fn(async () => {}),
}));
jest.mock('../src/lib/resilience', () => ({
  ...jest.requireActual('../src/lib/resilience'),
  getEmailMap: async () => new Map([['seller-1', 's@example.com']]),
}));

const request = require('supertest');
const fake = require('./helpers/fakeSupabase');
const { sendEmail } = require('../src/services/email');
const app = require('../src/index');
const { commissionRateFor, cleanPayoutDetails, lineRate } = require('../src/lib/payouts');
const { getSellerBalance } = require('../src/lib/sellerBalance');

const NGN_PER_USD = 1600; // $100 = ₦160,000

describe('commission tiers', () => {
  it('takes 5% on items up to $100 and 10% above', () => {
    expect(commissionRateFor(50000, NGN_PER_USD)).toBe(0.05);
    expect(commissionRateFor(160000, NGN_PER_USD)).toBe(0.05); // exactly $100
    expect(commissionRateFor(160001, NGN_PER_USD)).toBe(0.10);
  });
  it('treats lines sold before tiers existed as the old flat 10%', () => {
    expect(lineRate({})).toBe(0.10);
    expect(lineRate({ commission_rate: 0.05 })).toBe(0.05);
  });
  it('works out the balance from each line’s own rate', async () => {
    fake.reset();
    fake.handler = ({ table }) => {
      if (table === 'order_items') return { data: [
        { quantity: 2, unit_price: 10000, commission_rate: 0.05, fulfillment_status: 'delivered', order: { status: 'delivered', payment_method: 'paystack' } },
        { quantity: 1, unit_price: 200000, commission_rate: 0.10, fulfillment_status: 'delivered', order: { status: 'delivered', payment_method: 'paystack' } },
      ], error: null };
      if (table === 'seller_payouts') return { data: [{ amount: 5000 }], error: null };
      return { data: null, error: null };
    };
    const b = await getSellerBalance('seller-1');
    expect(b.grossSales).toBe(220000);
    expect(b.commission).toBe(1000 + 20000);
    expect(b.netEarnings).toBe(199000);
    expect(b.available).toBe(194000);
  });
});

describe('payout methods', () => {
  it('accepts complete bank, crypto and other details', () => {
    expect(cleanPayoutDetails('bank_transfer', { bankName: 'GTBank', accountName: 'Ada Obi', accountNumber: '0123 456 789' }).details.accountNumber).toBe('0123456789');
    expect(cleanPayoutDetails('crypto', { asset: 'usdt', network: 'TRC20', walletAddress: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE' }).details.asset).toBe('USDT');
    expect(cleanPayoutDetails('other', { provider: 'OPay', account: '08031234567' }).method).toBe('other');
  });
  it('rejects incomplete details', () => {
    expect(cleanPayoutDetails('bank_transfer', { bankName: 'GTBank', accountName: 'Ada' }).error).toMatch(/account number/);
    expect(cleanPayoutDetails('crypto', { asset: 'USDT', network: 'TRC20', walletAddress: 'short' }).error).toMatch(/wallet/);
    expect(cleanPayoutDetails('paypal', {}).error).toMatch(/Choose how/);
  });
});

describe('payout request + admin payment', () => {
  let payoutRow;
  beforeEach(() => {
    fake.reset(); sendEmail.mockClear();
    payoutRow = { id: 'p1', seller_id: 'seller-1', amount: 9000, status: 'pending', payment_method: 'crypto' };
    fake.handler = ({ table, op, filters, payload }) => {
      if (table === 'profiles' && op === 'select') return { data: { role: filters.id === 'seller-1' ? 'seller' : 'admin', full_name: 'Ada' }, error: null };
      if (table === 'order_items') return { data: [{ quantity: 1, unit_price: 10000, commission_rate: 0.05, fulfillment_status: 'delivered', order: { status: 'delivered', payment_method: 'paystack' } }], error: null };
      if (table === 'seller_payouts' && op === 'select') return { data: filters.id ? payoutRow : [], error: null };
      if (table === 'seller_payouts' && op === 'insert') return { data: { id: 'p1', ...payload }, error: null };
      if (table === 'seller_payouts' && op === 'update') return { data: [{ ...payoutRow, ...payload }], error: null };
      return { data: null, error: null };
    };
  });

  it('stores a crypto payout request and emails the admin the wallet', async () => {
    const res = await request(app).post('/api/seller/payouts/request').send({
      amount: 9000, payment_method: 'crypto',
      payment_details: { asset: 'USDT', network: 'TRC20', walletAddress: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE' },
    });
    expect(res.statusCode).toBe(201);
    const insert = fake.calls.find((c) => c.table === 'seller_payouts' && c.op === 'insert');
    expect(insert.payload.payment_method).toBe('crypto');
    expect(sendEmail.mock.calls[0][0].html).toContain('TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE');
  });

  it('will not pay out more than the seller has earned', async () => {
    const res = await request(app).post('/api/seller/payouts/request').send({
      amount: 9600, payment_method: 'other', payment_details: { provider: 'OPay', account: '08031234567' },
    });
    expect(res.statusCode).toBe(400); // 10,000 sale - 5% = 9,500 available
  });

  it('requires a reference to mark paid, then stores it and emails the seller', async () => {
    expect((await request(app).put('/api/admin/payouts/p1').set('x-test-user', 'admin-1').send({ status: 'paid' })).statusCode).toBe(400);
    const res = await request(app).put('/api/admin/payouts/p1').set('x-test-user', 'admin-1').send({ status: 'paid', payment_reference: '0xabc123' });
    expect(res.statusCode).toBe(200);
    const update = fake.calls.find((c) => c.table === 'seller_payouts' && c.op === 'update');
    expect(update.payload).toMatchObject({ status: 'paid', payment_reference: '0xabc123' });
    const mail = sendEmail.mock.calls.find((c) => c[0].emailType === 'payout_status')[0];
    expect(mail.html).toContain('5 hours');
    expect(mail.html).toContain('0xabc123');
  });

  it('refuses to approve when the balance has fallen below the request', async () => {
    payoutRow.amount = 20000;
    const res = await request(app).put('/api/admin/payouts/p1').set('x-test-user', 'admin-1').send({ status: 'approved' });
    expect(res.statusCode).toBe(409);
  });
});

describe('commission threshold currency', () => {
  it('uses the live USD→NGN rate for the $100 line', async () => {
    fake.reset();
    fake.handler = ({ table }) => (table === 'exchange_rates' ? { data: { rate: 1425.2 }, error: null } : { data: null, error: null });
    const { getNgnPerUsd } = require('../src/lib/payouts');
    const ngnPerUsd = await getNgnPerUsd();
    expect(ngnPerUsd).toBe(1425.2);
    expect(commissionRateFor(142520, ngnPerUsd)).toBe(0.05); // exactly $100
    expect(commissionRateFor(142521, ngnPerUsd)).toBe(0.10);
  });
});
