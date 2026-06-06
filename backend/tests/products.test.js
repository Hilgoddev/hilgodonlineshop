const request = require('supertest');
const app = require('../src/index');

describe('Products API', () => {
  it('should fetch all active products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should fetch a single product by a real ID', async () => {
    // Get a real id from the listing rather than hardcoding a placeholder.
    const list = await request(app).get('/api/products?limit=1');
    const first = list.body.data && list.body.data[0];
    if (!first) return; // no products in DB — skip gracefully
    const res = await request(app).get(`/api/products/${first._id || first.id}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
  });

  it('should return 404 for a well-formed but non-existent product id', async () => {
    const res = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000');
    expect(res.statusCode).toEqual(404);
  });

  it('should return 404 (not 500) for a malformed product id', async () => {
    const res = await request(app).get('/api/products/not-a-uuid');
    expect(res.statusCode).toEqual(404);
    expect(res.body.success).toBe(false);
  });
});