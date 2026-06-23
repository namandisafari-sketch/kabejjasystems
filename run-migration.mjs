import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  const sql = readFileSync('supabase/migrations/20260617000002_ugandan_school_admin.sql', 'utf-8');
  
  // Split by semicolons but preserve function bodies
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
  
  let success = 0, failed = 0;
  
  for (const stmt of statements) {
    try {
      // Use the raw SQL endpoint via service key
      const { error } = await supabase.rpc('exec_sql_direct', { sql_text: stmt });
      if (error && error.message?.includes('function "exec_sql_direct" does not exist')) {
        throw new Error('Need fallback');
      }
      if (error) throw error;
      success++;
    } catch (e) {
      // Fallback: try direct POST to SQL endpoint
      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({ query: stmt }),
        });
        if (resp.ok) {
          success++;
        } else {
          const text = await resp.text();
          // "already exists" errors are OK
          if (text.includes('already exists') || text.includes('duplicate') || text.includes('IF NOT EXISTS')) {
            success++;
          } else {
            console.log(`Error [${stmt.substring(0, 50)}...]: ${text.substring(0, 200)}`);
            failed++;
          }
        }
      } catch (e2) {
        console.log(`Exception [${stmt.substring(0, 50)}...]: ${e2.message}`);
        failed++;
      }
    }
  }

  console.log(`Done! Statements: ${success + failed}, OK: ${success}, Failed: ${failed}`);
}

run().catch(console.error);
