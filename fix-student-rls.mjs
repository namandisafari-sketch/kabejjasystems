#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStudentRLS() {
  try {
    console.log('🔧 Fixing student RLS policies...\n');

    const { error: dropError } = await supabase.rpc('execute_sql', {
      sql: `
        DROP POLICY IF EXISTS "students_select" ON public.students;
        DROP POLICY IF EXISTS "students_insert" ON public.students;
        DROP POLICY IF EXISTS "students_update" ON public.students;
        DROP POLICY IF EXISTS "students_delete" ON public.students;
        DROP POLICY IF EXISTS "students_select_authenticated" ON public.students;
        DROP POLICY IF EXISTS "students_select_anon" ON public.students;
        DROP POLICY IF EXISTS "students_update_self" ON public.students;
      `
    });

    if (dropError && !dropError.message.includes('Unknown')) {
      console.log('⚠️ Drop policies result:', dropError?.message || 'OK');
    }

    const { error: createError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE POLICY "students_select_authenticated" ON public.students
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() = user_id
        );

        CREATE POLICY "students_select_anon" ON public.students
        FOR SELECT
        TO anon
        USING (true);

        CREATE POLICY "students_update_self" ON public.students
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

        ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
        GRANT SELECT, UPDATE ON public.students TO authenticated, anon;
      `
    });

    if (createError) {
      console.error('❌ Error creating policies:', createError);
      return;
    }

    console.log('✅ Student RLS policies fixed!');
    console.log('\nPolicies created:');
    console.log('- students_select_authenticated: authenticated users read own record (matched by user_id)');
    console.log('- students_select_anon: anonymous can select (for login flow)');
    console.log('- students_update_self: authenticated users update own record');

  } catch (err) {
    console.error('💥 Error:', err);
  }
}

fixStudentRLS();
