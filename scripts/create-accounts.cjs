const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const ANON_KEY = 'sb_publishable_tvuluLavd8x2hpeUyI6Jbw_dk3PO_da';
const TENANT_ID = '6d6a33e6-13c9-4559-a664-18f30c42cc95';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const accounts = [
  { email: 'sarah.teacher@tennahub.app', password: 'Teacher@2025!', name: 'Sarah Teacher', role: 'class_teacher' },
  { email: 'james.dos@tennahub.app', password: 'DOS@2025!', name: 'James DOS', role: 'director_of_studies' },
  { email: 'peter.head@tennahub.app', password: 'Head@2025!', name: 'Peter Headteacher', role: 'head_teacher' },
];

async function main() {
  console.log('Creating sample accounts for Eden High School...\n');

  for (const acct of accounts) {
    process.stdout.write(`${acct.name} (${acct.email})... `);

    const { data, error } = await supabase.auth.signUp({
      email: acct.email,
      password: acct.password,
      options: {
        data: { full_name: acct.name },
      },
    });

    if (error) {
      // Check if user already exists
      if (error.message?.includes('already') || error.message?.includes('registered')) {
        console.log('USER EXISTS');
      } else if (error.message?.includes('rate limit')) {
        console.log(`RATE LIMITED - ${error.message}`);
      } else {
        console.log(`FAILED - ${error.message}`);
      }
      continue;
    }

    if (data?.user?.id) {
      console.log(`CREATED (${data.user.id}) - email confirmation required`);

      // Try RPC to create profile
      const { error: rpcErr } = await supabase.rpc('create_profile_for_signup', {
        p_user_id: data.user.id,
        p_tenant_id: TENANT_ID,
        p_full_name: acct.name,
        p_phone: null,
      });
      if (rpcErr) {
        console.log(`  Profile RPC: ${rpcErr.message}`);
      } else {
        console.log(`  Profile created!`);
      }
    }
  }

  console.log('\nDone. If users were created but not confirmed:');
  console.log('1. Go to https://supabase.com/dashboard/project/ljgbjiixeoxxqpejnmjx/auth/users');
  console.log('2. Confirm each user email manually');
  console.log('3. Then insert profiles and staff_role_assignments via SQL editor');
  console.log('   (see scripts/seed-sample-accounts.sql)');
}

main().catch(console.error);
