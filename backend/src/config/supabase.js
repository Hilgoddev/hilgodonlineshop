require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { cleanEnv } = require('../lib/env');

const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Ensure they are set in .env');
}

// We use the Service Role Key here to bypass RLS for admin/backend operations
// Be very careful not to leak this key to the frontend!
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
