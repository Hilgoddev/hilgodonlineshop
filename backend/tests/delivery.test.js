// Delivery details at checkout + the GIG Logistics hand-off, against the
// in-memory fake DB — never the real database or the real GIG API.
jest.mock('../src/config/supabase', () => require('./helpers/fakeSupabase').supabase);

const fake = require('./helpers/fakeSupabase');
const { cleanShippingAddress } = require('../src/lib/deliveryAddress');
const { dispatchOrderToGig, setManualWaybill, buildShipment } = require('../src/services/gig');

const ADDRESS = {
  firstName: ' Ada ', lastName: 'Obi', email: 'ada@example.com', phone: '+234 803 123 4567',
  country: 'Nigeria', state: 'Lagos', city: 'Ikeja', street: '12  Allen Avenue', landmark: 'Opposite GTBank',
};

describe('delivery details', () => {
  it('trims and keeps a complete address', () => {
    const { address, error } = cleanShippingAddress({ ...ADDRESS, extra: '<script>' }, 'paystack');
    expect(error).toBeNull();
    expect(address.firstName).toBe('Ada');
    expect(address.street).toBe('12 Allen Avenue');
    expect(address.extra).toBeUndefined();
  });

  it.each([
    ['country', 'Country is required.'],
    ['state', 'State / region is required.'],
    ['city', 'City / town is required.'],
    ['street', 'Delivery address is required.'],
    ['phone', 'Phone number is required.'],
  ])('requires %s', (field, msg) => {
    expect(cleanShippingAddress({ ...ADDRESS, [field]: '' }, 'paystack').error).toBe(msg);
  });

  it('rejects a bad phone number', () => {
    expect(cleanShippingAddress({ ...ADDRESS, phone: 'call me' }, 'paystack').error).toMatch(/valid phone/);
  });

  it('only allows Pay on Delivery where GIG collects cash, with a landmark', () => {
    expect(cleanShippingAddress({ ...ADDRESS, country: 'Ghana' }, 'pod').error).toMatch(/only available in Nigeria/);
    expect(cleanShippingAddress({ ...ADDRESS, landmark: '' }, 'pod').error).toMatch(/landmark/);
    expect(cleanShippingAddress({ ...ADDRESS, country: 'Ghana', landmark: '' }, 'paystack').error).toBeNull();
  });
});

describe('GIG hand-off', () => {
  const ORDER = { id: 'order-1', status: 'pending', total_amount: 25000, currency: 'NGN', payment_method: 'pod', shipping_address: cleanShippingAddress(ADDRESS, 'pod').address };
  const ITEMS = [{ id: 'l1', quantity: 2, unit_price: 10000, selected_options: { color: '#ff0000' }, shipping_tracking: null, fulfillment_status: 'pending', product: { name: 'Shirt' } }];
  let written;
  beforeEach(() => {
    fake.reset();
    written = null;
    fake.handler = ({ table, op, payload }) => {
      if (table === 'orders') return { data: ORDER, error: null };
      if (table === 'order_items' && op === 'select') return { data: ITEMS, error: null };
      if (table === 'order_items' && op === 'update') { written = payload.shipping_tracking; return { data: null, error: null }; }
      return { data: null, error: null };
    };
  });

  it('builds a GIG shipment with the receiver and cash to collect', () => {
    const s = buildShipment(ORDER, ITEMS);
    expect(s.receiver).toMatchObject({ name: 'Ada Obi', city: 'Ikeja', state: 'Lagos', country: 'Nigeria' });
    expect(s.receiver.address).toContain('Near Opposite GTBank');
    expect(s.cashOnDeliveryAmount).toBe(25000);
    expect(buildShipment({ ...ORDER, payment_method: 'paystack' }, ITEMS).cashOnDeliveryAmount).toBe(0);
  });

  it('marks the order awaiting GIG booking when the API is not configured', async () => {
    const rec = await dispatchOrderToGig('order-1');
    expect(rec).toMatchObject({ carrier: 'GIG Logistics', status: 'awaiting_booking' });
    expect(written.status).toBe('awaiting_booking');
  });

  it('stores a manual waybill with a GIG tracking link', async () => {
    const rec = await setManualWaybill('order-1', ' GIG12345678 ');
    expect(rec).toMatchObject({ carrier: 'GIG Logistics', status: 'booked', trackingNumber: 'GIG12345678', source: 'manual' });
    expect(rec.trackingUrl).toContain('GIG12345678');
    await expect(setManualWaybill('order-1', '??')).rejects.toThrow(/waybill/);
  });
});
