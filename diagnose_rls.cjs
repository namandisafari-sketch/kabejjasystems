const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ljgbjiixeoxxqpejnmjx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo'
);

(async () => {
  console.log('Checking students count...');
  const { count: studentCount, error: studentError } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', 'ef7a3391-cddd-434f-9422-e58ffda74953');
  
  console.log('Students in DB:', studentCount);
  console.log('Error:', studentError?.message);
  
  console.log('\nChecking school_classes...');
  const { count: classCount, error: classError } = await supabase
    .from('school_classes')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', 'ef7a3391-cddd-434f-9422-e58ffda74953');
  
  console.log('Classes in DB:', classCount);
  console.log('Error:', classError?.message);
  
  console.log('\nChecking subjects...');
  const { count: subjectCount, error: subjectError } = await supabase
    .from('subjects')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', 'ef7a3391-cddd-434f-9422-e58ffda74953');
  
  console.log('Subjects in DB:', subjectCount);
  console.log('Error:', subjectError?.message);
  
  console.log('\nChecking academic_terms...');
  const { count: termCount, error: termError } = await supabase
    .from('academic_terms')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', 'ef7a3391-cddd-434f-9422-e58ffda74953');
  
  console.log('Terms in DB:', termCount);
  console.log('Error:', termError?.message);
})();
