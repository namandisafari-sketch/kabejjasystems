const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ljgbjiixeoxxqpejnmjx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo'
);

(async () => {
  // Check if there are ANY profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, tenant_id, role')
    .limit(10);
  
  console.log('Profiles in system:');
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log(JSON.stringify(profiles, null, 2));
  }
  
  // Check Eden High School tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', 'ef7a3391-cddd-434f-9422-e58ffda74953')
    .single();
  
  console.log('\n\nEden High School Tenant:');
  console.log(JSON.stringify(tenant, null, 2));
})();
