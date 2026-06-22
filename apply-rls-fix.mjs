#!/usr/bin/env node

import axios from 'axios';

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo';
const supabaseUrl = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';

const sql = `
DROP POLICY IF EXISTS "students_select" ON public.students CASCADE;
DROP POLICY IF EXISTS "students_insert" ON public.students CASCADE;
DROP POLICY IF EXISTS "students_update" ON public.students CASCADE;
DROP POLICY IF EXISTS "students_delete" ON public.students CASCADE;
DROP POLICY IF EXISTS "Anonymous users can lookup students for login" ON public.students CASCADE;
DROP POLICY IF EXISTS "Authenticated users can view own student record" ON public.students CASCADE;

CREATE POLICY "students_authenticated_select_own" ON public.students
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "students_anon_select" ON public.students
FOR SELECT
TO anon
USING (true);

CREATE POLICY "students_authenticated_update_own" ON public.students
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.students TO authenticated, anon, public;
GRANT UPDATE ON public.students TO authenticated;
`;

async function fixRLS() {
  try {
    console.log('🔧 Attempting to fix student RLS policies...\n');

    // Note: Supabase doesn't expose SQL execution via REST API with service role
    // We need to use the dashboard or migrations
    console.log('⚠️ Cannot execute SQL directly via API');
    console.log('📝 Please run the migration in Supabase Dashboard:');
    console.log('   https://app.supabase.com/project/ljgbjiixeoxxqpejnmjx/sql/new\n');
    console.log('Or copy this SQL:\n');
    console.log(sql);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

fixRLS();
