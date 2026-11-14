jest.mock('../src/config/supabase', () => require('./helpers/fakeSupabase').supabase);
const {convertAmount,settlementQuote}=require('../src/lib/settlement');
const rates={USD:1,NGN:1600,EUR:1};
test('Cyprus charges EUR at a server rate rounded to cents',()=>{expect(settlementQuote(51500,'Cyprus','stripe',rates)).toMatchObject({currency:'EUR',amount:32.19,ledger_currency:'NGN'});});
test('rejects Paystack for Cyprus instead of charging naira',()=>expect(()=>settlementQuote(51500,'Cyprus','paystack',rates)).toThrow('EUR'));
test('does not invent an exchange rate',()=>expect(()=>settlementQuote(51500,'Cyprus','stripe',{})).toThrow('exchange rate'));
test('keeps Nigerian orders in the original ledger currency',()=>expect(settlementQuote(51500,'Nigeria','paystack',null)).toBeNull());
test('converts foreign catalogue prices to the ledger before totaling',()=>expect(convertAmount(10,'EUR','NGN',rates)).toBe(16000));
