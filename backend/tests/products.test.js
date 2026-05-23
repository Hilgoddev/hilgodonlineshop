const request = require('supertest');
const app = require('../src/index');

describe('Products API', () => {
  it('should fetch all active products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should fetch a single product by ID', async () => {
    const productId = 'test-product-id'; // Replace with a valid ID during testing
    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', productId);
  });

  it('should return 404 for a non-existent product', async () => {
    const res = await request(app).get('/api/products/non-existent-id');
    expect(res.statusCode).toEqual(404);
  });
});