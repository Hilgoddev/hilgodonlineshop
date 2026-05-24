require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseDatabase() {
    console.log('🔍 Diagnosing Supabase Database...\n');
    console.log('📡 Supabase URL:', supabaseUrl, '\n');

    // Test basic connectivity
    console.log('📋 Step 1: Testing database connectivity...\n');
    const { data: testProducts, error: testError } = await supabase
        .from('products')
        .select('id')
        .limit(1);

    if (testError) {
        console.error('❌ Database connection failed:', testError.message);
        console.log('\nPlease check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file.');
        return;
    }

    console.log('✅ Database connection successful!\n');

    // Check specific tables by trying to query them
    console.log('🔍 Step 2: Checking for critical tables...\n');
    
    const tablesToCheck = [
        'stores',
        'storefronts', 
        'products',
        'profiles',
        'seller_applications',
        'exchange_rates',
        'orders',
        'order_items'
    ];

    const existingTables = [];
    const missingTables = [];

    for (const table of tablesToCheck) {
        try {
            const { error } = await supabase
                .from(table)
                .select('id')
                .limit(1);
            
            if (!error) {
                existingTables.push(table);
                console.log('   ✅ ' + table);
            } else {
                missingTables.push(table);
                console.log('   ❌ ' + table + ' (error: ' + error.message + ')');
            }
        } catch (err) {
            missingTables.push(table);
            console.log('   ❌ ' + table + ' (not found)');
        }
    }

    // Get column details for existing tables
    console.log('\n📐 Step 3: Column details for existing tables:\n');
    
    for (const table of existingTables) {
        console.log('   Table: ' + table);
        try {
            // Query the table to get a sample row and infer columns
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (data && data.length > 0) {
                const columns = Object.keys(data[0]);
                columns.forEach(col => console.log('      - ' + col));
            } else if (error) {
                console.log('      Error: ' + error.message);
            } else {
                console.log('      (table exists but no data to show columns)');
            }
        } catch (err) {
            console.log('      Error: ' + err.message);
        }
        console.log('');
    }

    // Count records in critical tables
    console.log('📊 Step 4: Record counts:\n');
    
    for (const table of existingTables) {
        try {
            const { count } = await supabase
                .from(table)
                .select('*', { head: true, count: 'exact' });
            
            console.log('   ' + table + ': ' + (count || 0) + ' records');
        } catch (err) {
            console.log('   ' + table + ': error counting');
        }
    }

    // Check user roles
    console.log('\n👥 Step 5: User roles distribution:\n');
    try {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('role');
        
        if (profiles) {
            const counts = {};
            profiles.forEach(p => {
                counts[p.role] = (counts[p.role] || 0) + 1;
            });
            
            Object.entries(counts).forEach(([role, count]) => {
                console.log('   ' + role + ': ' + count + ' users');
            });
        }
    } catch (err) {
        console.log('   Error: ' + err.message);
    }

    // Summary and recommendations
    console.log('\n📝 Summary and Recommendations:\n');
    
    if (existingTables.includes('storefronts') && !existingTables.includes('stores')) {
        console.log('   ✅ Your database has "storefronts" table (backend code will work)');
        console.log('   ⚠️  Your schema.sql defines "stores" but database has "storefronts"');
        console.log('   📝 Recommendation: Update schema.sql to match your actual database');
    } else if (existingTables.includes('stores') && !existingTables.includes('storefronts')) {
        console.log('   ✅ Your database has "stores" table');
        console.log('   ❌ Your backend code expects "storefronts" table');
        console.log('   📝 Recommendation: Either create "storefronts" table or update backend code');
    } else if (existingTables.includes('stores') && existingTables.includes('storefronts')) {
        console.log('   ✅ Both "stores" and "storefronts" tables exist');
        console.log('   ℹ️  Backend uses "storefronts", schema defines "stores"');
    } else {
        console.log('   ❌ Neither "stores" nor "storefronts" table exists');
        console.log('   📝 Recommendation: Run the schema.sql migrations');
    }

    if (!existingTables.includes('exchange_rates')) {
        console.log('\n   💱 Exchange rates table missing - needed for currency conversion');
        console.log('   📝 Recommendation: Create exchange_rates table');
    }

    console.log('\n✅ Database diagnosis complete!\n');
}

diagnoseDatabase().catch(console.error);