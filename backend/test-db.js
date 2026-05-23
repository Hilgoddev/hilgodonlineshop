require('dotenv').config();
const supabase = require('./src/config/supabase');

async function test() {
  console.log("Testing categories select...");
  const { data: catData, error: catErr } = await supabase.from('categories').select('*').limit(1);
  if (catErr) {
    console.error("Categories error:", catErr);
  } else {
    console.log("Categories data:", catData);
  }

  console.log("Testing profiles select...");
  const { data: profData, error: profErr } = await supabase.from('profiles').select('*').limit(1);
  if (profErr) {
    console.error("Profiles error:", profErr);
  } else {
    console.log("Profiles data:", profData);
  }
}
test();
