import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data: schools, error } = await supabase.from('schools').select('id, name, tenant_id');
if (error) {
    console.error('Error:', error.message);
    process.exit(1);
}

console.log('Schools in database:');
(schools || []).forEach(s => console.log(`  - ${s.name} (Tenant ID: ${s.tenant_id})`));
console.log(`\nTotal: ${schools?.length || 0} schools`);
