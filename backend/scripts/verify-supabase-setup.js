require('dotenv').config();
const supabase = require('../src/config/supabase');

async function checkTable(table) {
  const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    return { table, ok: false, error: error.message };
  }
  return { table, ok: true, count: count || 0 };
}

async function run() {
  const requiredTables = [
    'profiles',
    'products',
    'orders',
    'order_items',
    'cart_items',
    'wishlist_items'
  ];

  const results = [];
  for (const table of requiredTables) {
    // sequential for cleaner logs
    // eslint-disable-next-line no-await-in-loop
    results.push(await checkTable(table));
  }

  console.log('Supabase setup verification:');
  for (const r of results) {
    if (r.ok) console.log(`  OK    ${r.table} (rows: ${r.count})`);
    else console.log(`  FAIL  ${r.table} (${r.error})`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
