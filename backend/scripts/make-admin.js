require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Must use the SERVICE_ROLE_KEY to bypass RLS and update roles directly
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeAdmin() {
    const email = process.argv[2];
    
    if (!email) {
        console.error('Usage: node make-admin.js <user-email>');
        process.exit(1);
    }

    console.log(`Promoting user ${email} to admin...`);

    // First find the user by email in profiles
    // Note: since email might only be in auth.users, and we are using public.profiles,
    // we need to search by username if email is stored there, or we can just fetch all and filter.
    // Assuming email is saved in username for MVP or we query auth.users if possible
    
    // Update their profile role to 'admin' using either username or email as the identifier
    const { data, error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('username', email)
        .select();

    if (profileError) {
        console.error('Error updating profile role:', profileError.message);
        process.exit(1);
    }

    if (!data || data.length === 0) {
        // Try falling back to auth users if not found in profiles
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const targetUser = users.find(u => u.email === email);
        if (targetUser) {
            await supabase.from('profiles').update({ role: 'admin' }).eq('id', targetUser.id);
            console.log(`✅ Success! ${email} is now an admin.`);
            return;
        }

        console.error(`User with email or username ${email} not found.`);
        process.exit(1);
    }

    console.log(`✅ Success! ${email} is now an admin.`);
}

makeAdmin();
