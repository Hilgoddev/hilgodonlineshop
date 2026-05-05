require('dotenv').config();
const path = require('path');
const supabase = require('../src/config/supabase');

const staticData = require(path.resolve(__dirname, '../../frontend/lib/products-data.js'));
const products = staticData.HILGOD_PRODUCTS || [];

function normalizeProduct(p) {
  return {
    name: p.name,
    description: p.description || '',
    price: Number(p.price || 0),
    category: p.category || 'general',
    subcategory: p.subcategory || null,
    images: p.image ? [p.image] : [],
    stock: p.inStock ? 100 : 0,
    is_active: !!p.inStock
  };
}

async function run() {
  if (!products.length) {
    throw new Error('No static products found to seed');
  }

  let created = 0;
  let updated = 0;

  for (const raw of products) {
    const p = normalizeProduct(raw);
    // eslint-disable-next-line no-await-in-loop
    const { data: existing, error: checkErr } = await supabase
      .from('products')
      .select('id')
      .eq('name', p.name)
      .maybeSingle();
    if (checkErr) throw checkErr;

    if (existing?.id) {
      // eslint-disable-next-line no-await-in-loop
      const { error: updateErr } = await supabase.from('products').update(p).eq('id', existing.id);
      if (updateErr) throw updateErr;
      updated += 1;
    } else {
      // eslint-disable-next-line no-await-in-loop
      const { error: insertErr } = await supabase.from('products').insert([p]);
      if (insertErr) throw insertErr;
      created += 1;
    }
  }

  console.log(`Seed complete. Created: ${created}, Updated: ${updated}, Total static: ${products.length}`);
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
