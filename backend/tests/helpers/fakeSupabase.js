// In-memory stand-in for the supabase-js client used by route tests, so tests
// never touch the real database. Every awaited query calls
// `fake.handler({ table, op, filters, payload })` and resolves to its result.
//
// Use from a test with:
//   jest.mock('../src/config/supabase', () => require('./helpers/fakeSupabase').supabase);
//   const fake = require('./helpers/fakeSupabase');
//   fake.handler = ({ table, op, filters }) => ({ data, error });

const fake = {
  handler: () => ({ data: null, error: null }),
  // Optional: (fnName, args) => ({ data, error }) for supabase.rpc calls.
  rpcHandler: null,
  calls: [],
  reset() {
    this.calls.length = 0;
    this.handler = () => ({ data: null, error: null });
    this.rpcHandler = null;
    this.supabase.rpc.mockClear();
  },
};

function builder(table) {
  const q = { table, op: 'select', filters: {}, payload: null };
  const chain = {
    select() { return chain; },
    insert(p) { q.op = 'insert'; q.payload = p; return chain; },
    update(p) { q.op = 'update'; q.payload = p; return chain; },
    upsert(p) { q.op = 'upsert'; q.payload = p; return chain; },
    delete() { q.op = 'delete'; return chain; },
    eq(col, val) { q.filters[col] = val; return chain; },
    neq(col, val) { q.filters[`${col}__neq`] = val; return chain; },
    in(col, val) { q.filters[col] = val; return chain; },
    is(col, val) { q.filters[`${col}__is`] = val; return chain; },
    order() { return chain; },
    limit() { return chain; },
    range() { return chain; },
    abortSignal() { return chain; },
    single() { return chain; },
    maybeSingle() { return chain; },
    then(resolve, reject) {
      fake.calls.push({ ...q, filters: { ...q.filters } });
      return Promise.resolve(fake.handler(q)).then(resolve, reject);
    },
  };
  return chain;
}

fake.supabase = {
  from: (table) => builder(table),
  rpc: jest.fn(async (fn, args) => (fake.rpcHandler ? fake.rpcHandler(fn, args) : { data: true, error: null })),
  auth: { admin: { getUserById: async () => ({ data: { user: null } }) } },
  storage: { getBucket: async () => ({ data: { public: true } }), from: () => ({}) },
};

module.exports = fake;
