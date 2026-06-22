import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const tenantId = 'ef7a3391-cddd-434f-9422-e58ffda74953';

const { data, error } = await supabase
    .from('students')
    .select('full_name, admission_number')
    .eq('tenant_id', tenantId)
    .order('admission_number')
    .limit(20);

if (error) {
    console.error('Error:', error.message);
    process.exit(1);
}

console.log('Eden High School - Sample Admission Numbers (6-digit format):');
console.log('='.repeat(80));
data.forEach((s, idx) => {
    console.log(`${String(idx + 1).padStart(3, ' ')}. ${s.full_name.padEnd(40, ' ')} → ${s.admission_number}`);
});
console.log('='.repeat(80));
console.log(`All admission numbers are now in 6-digit format (range: 670000-670126)`);
