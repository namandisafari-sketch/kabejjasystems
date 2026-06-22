const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ljgbjiixeoxxqpejnmjx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo'
);

(async () => {
  console.log('Testing INSERT permissions...\n');
  
  // Test school_classes insert
  console.log('1. Testing INSERT into school_classes');
  const { data: classData, error: classError } = await supabase
    .from('school_classes')
    .insert({
      tenant_id: 'ef7a3391-cddd-434f-9422-e58ffda74953',
      name: 'S.1 Alpha',
      level: 'secondary',
      grade: 'S.1',
      capacity: 40,
      is_active: true
    });
  
  if (classError) {
    console.log('ERROR:', classError.message);
    console.log('Code:', classError.code);
  } else {
    console.log('SUCCESS - class inserted');
  }
  
  // Test subjects insert
  console.log('\n2. Testing INSERT into subjects');
  const { data: subjectData, error: subjectError } = await supabase
    .from('subjects')
    .insert({
      tenant_id: 'ef7a3391-cddd-434f-9422-e58ffda74953',
      name: 'Mathematics',
      code: '101'
    });
  
  if (subjectError) {
    console.log('ERROR:', subjectError.message);
    console.log('Code:', subjectError.code);
  } else {
    console.log('SUCCESS - subject inserted');
  }
  
  // Test academic_terms insert
  console.log('\n3. Testing INSERT into academic_terms');
  const { data: termData, error: termError } = await supabase
    .from('academic_terms')
    .insert({
      tenant_id: 'ef7a3391-cddd-434f-9422-e58ffda74953',
      name: 'Term I',
      term_number: 1,
      year: 2026,
      start_date: '2026-01-15',
      end_date: '2026-04-10'
    });
  
  if (termError) {
    console.log('ERROR:', termError.message);
    console.log('Code:', termError.code);
  } else {
    console.log('SUCCESS - term inserted');
  }
})();
