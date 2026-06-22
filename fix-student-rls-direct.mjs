#!/usr/bin/env node

import pg from 'pg';

const { Client } = pg;

// Supabase connection string
const connectionString = 'postgresql://postgres.ljgbjiixeoxxqpejnmjx:pXKp9sXyJJU4AuP3@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function fixRLS() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase\n');

    console.log('🔧 Dropping old RLS policies...');
    const dropPolicies = `
      DROP POLICY IF EXISTS "students_select" ON public.students;
      DROP POLICY IF EXISTS "students_insert" ON public.students;
      DROP POLICY IF EXISTS "students_update" ON public.students;
      DROP POLICY IF EXISTS "students_delete" ON public.students;
      DROP POLICY IF EXISTS "Anonymous users can lookup students for login" ON public.students;
    `;
    
    await client.query(dropPolicies);
    console.log('✅ Old policies dropped\n');

    console.log('🔧 Creating new RLS policies...');
    const createPolicies = `
      -- Allow authenticated users to read their own student record
      CREATE POLICY "students_select_own" ON public.students
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

      -- Allow anonymous for login flow
      CREATE POLICY "students_select_anon_login" ON public.students
      FOR SELECT
      TO anon
      USING (true);

      -- Allow authenticated to update own record
      CREATE POLICY "students_update_own" ON public.students
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    `;

    await client.query(createPolicies);
    console.log('✅ New policies created\n');

    console.log('🔧 Ensuring RLS is enabled...');
    await client.query('ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;');
    console.log('✅ RLS enabled\n');

    console.log('🔧 Granting permissions...');
    await client.query('GRANT SELECT, UPDATE ON public.students TO authenticated, anon, public;');
    console.log('✅ Permissions granted\n');

    console.log('✅ RLS policies fixed successfully!');
    console.log('\nPolicies applied:');
    console.log('1. students_select_own - Auth users can read their own record');
    console.log('2. students_select_anon_login - Anon can select (for login)');
    console.log('3. students_update_own - Auth users can update their own record');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

fixRLS();
