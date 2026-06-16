// One-off script: update TechMart product images with Unsplash photo URLs.
// Run from repo root: node --env-file=backend/.env scripts/update_product_images.js
// (Node 20+ built-in --env-file; no dotenv package needed)

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const U = (id, w = 600, h = 600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80`;

const UPDATES = [
  {
    id: '65982d7f-0336-4e1f-9762-d74ffbd43ada',
    name: 'Samsung Galaxy A55 5G',
    images: [
      U('1511707171634-5f897ff02aa9'),   // smartphone on desk
      U('1580910051074-3eb694886505'),   // hands holding Android phone
    ],
  },
  {
    id: 'ba768326-ed7a-4ddb-ba2e-2106b43c34e6',
    name: 'JBL Flip 6 Bluetooth Speaker',
    images: [
      U('1608043152269-423dbba4e7e1'),   // portable bluetooth speaker
      U('1545127398-14699f92334b'),      // speaker on table
    ],
  },
  {
    id: 'ae455529-12ec-429c-83c9-eb63e2d68d43',
    name: 'Apple AirPods Pro (2nd Generation)',
    images: [
      U('1606220838315-056192d5e927'),   // AirPods Pro in case
      U('1484704849700-f032a568e944'),   // wireless earbuds
    ],
  },
  {
    id: '2787ebc8-b866-408b-8a02-91710b24cd87',
    name: 'Anker PowerCore 26800mAh',
    images: [
      U('1585771724684-38269d6639fd'),   // power bank charging setup
      U('1609091839311-d5365f9ff1c5'),   // portable charger with cables
    ],
  },
  {
    id: 'ce6d2ca7-ccdb-4e95-968e-6a5452546f29',
    name: 'TP-Link Archer AX23 Wi-Fi 6 Router',
    images: [
      U('1558618666-fcd25c85cd64'),      // router / networking device
      U('1544197150-b99a580bb7a8'),      // network cables and equipment
    ],
  },
];

async function run() {
  console.log('Updating product images…\n');
  let ok = 0;
  for (const p of UPDATES) {
    const { error } = await supabase
      .from('products')
      .update({ images: p.images })
      .eq('id', p.id);

    if (error) {
      console.error(`✗ ${p.name}: ${error.message}`);
    } else {
      console.log(`✓ ${p.name}`);
      ok++;
    }
  }
  console.log(`\nDone — ${ok}/${UPDATES.length} updated.`);
}

run().catch(console.error);
