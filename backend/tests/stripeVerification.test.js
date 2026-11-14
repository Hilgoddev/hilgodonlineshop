jest.mock('../src/config/stripe', () => ({ paymentIntents: { retrieve: jest.fn(), create: jest.fn() } }));
jest.mock('../src/config/supabase', () => require('./helpers/fakeSupabase').supabase);
jest.mock('../src/routes/auth', () => ({ verifyToken: (req,res,next) => { req.user={id:'buyer-1'}; next(); } }));
jest.mock('../src/services/paymentSuccess', () => ({ markOrderPaid: jest.fn() }));
const express=require('express');
const request=require('supertest');
const stripe=require('../src/config/stripe');
const fake=require('./helpers/fakeSupabase');
const {markOrderPaid}=require('../src/services/paymentSuccess');
const app=express(); app.use(express.json()); app.use('/api/stripe',require('../src/routes/stripe'));
beforeEach(()=>{ jest.clearAllMocks(); fake.reset(); fake.handler=()=>({data:{id:'order-1',user_id:'buyer-1'},error:null}); stripe.paymentIntents.retrieve.mockResolvedValue({id:'pi_test123',status:'succeeded',amount_received:250000,currency:'ngn',metadata:{order_id:'order-1'}}); markOrderPaid.mockResolvedValue({ok:true}); });
test('verifies amount and currency from provider before success',async()=>{ const r=await request(app).get('/api/stripe/verify/pi_test123'); expect(r.status).toBe(200); expect(r.body.data.status).toBe('success'); expect(markOrderPaid).toHaveBeenCalledWith(expect.objectContaining({paidAmount:2500,currency:'ngn',orderId:'order-1'})); });
test('does not confirm processing payments',async()=>{stripe.paymentIntents.retrieve.mockResolvedValue({status:'processing',metadata:{order_id:'order-1'}}); const r=await request(app).get('/api/stripe/verify/pi_test123'); expect(r.body.data.status).toBe('processing'); expect(markOrderPaid).not.toHaveBeenCalled();});
test('rejects an order outside the signed-in account',async()=>{fake.handler=()=>({data:null,error:null});const r=await request(app).get('/api/stripe/verify/pi_test123');expect(r.status).toBe(404);expect(markOrderPaid).not.toHaveBeenCalled();});
test('does not claim success on provider failure',async()=>{stripe.paymentIntents.retrieve.mockRejectedValue(new Error('offline'));const r=await request(app).get('/api/stripe/verify/pi_test123');expect(r.status).toBe(502);expect(r.body.success).toBe(false);});
test('rejects invalid references without contacting Stripe',async()=>{const r=await request(app).get('/api/stripe/verify/invalid');expect(r.status).toBe(400);expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();});

test('creates a EUR payment intent from the saved quote, not the NGN ledger total',async()=>{
 process.env.STRIPE_SECRET_KEY='sk_test_'+ 'x'.repeat(60);
 fake.handler=()=>({data:{id:'order-1',user_id:'buyer-1',status:'pending',total_amount:51500,currency:'NGN',shipping_address:{payment_quote:{currency:'EUR',amount:32.19}}},error:null});
 stripe.paymentIntents.create.mockResolvedValue({id:'pi_new',client_secret:'test-secret'});
 const r=await request(app).post('/api/stripe/create-payment-intent').send({order_id:'order-1'});
 expect(r.status).toBe(200);
 expect(stripe.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({amount:3219,currency:'eur'}),{idempotencyKey:'hilgod-order-order-1'});
});
