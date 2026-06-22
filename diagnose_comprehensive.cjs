const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ljgbjiixeoxxqpejnmjx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo'
);

(async () => {
  console.log('=== COMPREHENSIVE PERMISSION DIAGNOSTIC ===\n');
  
  // Test 1: Service role INSERT
  console.log('TEST 1: Service role INSERT school_classes');
  const { data: d1, error: e1 } = await supabase
    .from('school_classes')
    .insert({
      tenant_id: 'ef7a3391-cddd-434f-9422-e58ffda74953',
      name: 'Diagnostic Test',
      level: 'secondary',
      grade: 'S.2',
      capacity: 40,
      is_active: true
    })
    .select();
  
  console.log('Result:', e1 ? 'FAIL - ' + e1.message : 'SUCCESS - inserted');
  
  // Test 2: Public key access
  console.log('\nTEST 2: Public key SELECT school_classes');
  const publicClient = createClient(
    'https://ljgbjiixeoxxqpejnmjx.supabase.co',
    'sb_publishable_tvuluLavd8x2hpeUyI6Jbw_dk3PO_da'
  );
  
  const { data: classes, error: e2 } = await publicClient
    .from('school_classes')
    .select('*')
    .limit(1);
  
  console.log('Result:', e2 ? 'FAIL - ' + e2.message : 'SUCCESS - can read');
  
  // Test 3: Public key INSERT
  console.log('\nTEST 3: Public key INSERT school_classes');
  const { error: e3 } = await publicClient
    .from('school_classes')
    .insert({
      tenant_id: 'ef7a3391-cddd-434f-9422-e58ffda74953',
      name: 'Public Test',
      level: 'secondary',
      grade: 'S.3'
    });
  
  console.log('Result:', e3 ? 'FAIL - ' + e3.message : 'SUCCESS - can insert');
  
  // Test 4: Check actual RLS policies
  console.log('\nTEST 4: Checking RLS configuration');
  const { data: relinfo, error: e4 } = await supabase
    .from('information_schema.role_table_grants')
    .select('*')
    .eq('table_name', 'school_classes');
  
  console.log('RLS info:', e4 ? e4.message : 'Fetched');
})();
