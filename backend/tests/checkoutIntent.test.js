const { buildBuyNowUrl, readBuyNowQuery } = require('../../frontend/lib/checkoutIntent');
describe('Buy Now intent', () => {
  test('round trips just the selected product, quantity and variant', () => {
    const url = buildBuyNowUrl('product-a', 2, { size: 'XL', color: 'Black & White' });
    const intent = readBuyNowQuery(Object.fromEntries(new URL(url, 'https://hilgod.com').searchParams));
    expect(intent).toEqual({ productId: 'product-a', quantity: 2, options: { size: 'XL', color: 'Black & White' } });
    expect(readBuyNowQuery({})).toBeNull();
  });
  test.each(['-1', '0', '21', '1.5', 'nope'])('rejects invalid quantity %s', quantity => {
    expect(readBuyNowQuery({ buy: 'a', quantity }).quantity).toBe(1);
  });
  test('ignores ambiguous array product IDs', () => expect(readBuyNowQuery({ buy: ['a','b'] })).toBeNull());
});
