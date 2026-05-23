require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: before } = await supabase.from('profiles').select('username, role').eq('username', 'akhigbewahabb354@gmail.com').single();
    console.log('Before upsert:', before);

    // Simulate syncProfile
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === 'akhigbewahabb354@gmail.com');

    const payload = {
        id: user.id,
        username: 'akhigbewahabb354@gmail.com',
        full_name: 'Walter Walter',
        avatar_url: null
    };

    await supabase.from('profiles').upsert(payload);

    const { data: after } = await supabase.from('profiles').select('username, role').eq('username', 'akhigbewahabb354@gmail.com').single();
    console.log('After upsert:', after);
}

check();
