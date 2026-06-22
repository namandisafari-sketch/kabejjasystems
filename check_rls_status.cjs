const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ljgbjiixeoxxqpejnmjx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo'
);

(async () => {
  const tables = ['students', 'school_classes', 'subjects', 'academic_terms'];
  
  for (const table of tables) {
    console.log(`\n========== ${table.toUpperCase()} ==========`);
    
    try {
      const { data: policies, error } = await supabase
        .from('information_schema.tables')
        .select('*')
        .eq('table_name', table);
      
      // Try a different approach - query directly
      const { data: result, error: err } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (err) {
        console.log(`RLS Error: ${err.code} - ${err.message}`);
      } else {
        console.log(`✅ Can query ${table} - RLS allows it`);
      }
    } catch (e) {
      console.log(`Error querying ${table}: ${e.message}`);
    }
  }
})();
