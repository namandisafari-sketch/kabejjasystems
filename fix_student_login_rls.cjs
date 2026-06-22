const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ljgbjiixeoxxqpejnmjx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo'
);

(async () => {
  try {
    // First test if the RLS is still blocking
    const supabasePublic = createClient(
      'https://ljgbjiixeoxxqpejnmjx.supabase.co',
      'sb_publishable_tvuluLavd8x2hpeUyI6Jbw_dk3PO_da'
    );
    
    const { error: testError } = await supabasePublic
      .from('students')
      .select('id, admission_number, notification_email, parent_email')
      .eq('admission_number', '670033')
      .limit(1);
    
    if (testError) {
      console.log('Current Status:');
      console.log('❌ Error:', testError.message);
      console.log('\nThe students table RLS is blocking anonymous queries.');
      console.log('\n⚠️  You need to manually apply this SQL in Supabase Dashboard:');
      console.log('https://app.supabase.com/project/ljgbjiixeoxxqpejnmjx/sql/new');
      console.log('\n---SQL to execute:---');
      console.log('DROP POLICY IF EXISTS "Anonymous users can lookup students for login" ON public.students;');
      console.log('CREATE POLICY "Anonymous users can lookup students for login"');
      console.log('  ON public.students FOR SELECT TO anon USING (true);');
    } else {
      console.log('✅ RLS policy is working! Anonymous queries are allowed.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
