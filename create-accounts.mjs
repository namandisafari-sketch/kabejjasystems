import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const ANON_KEY = 'sb_publishable_tvuluLavd8x2hpeUyI6Jbw_dk3PO_da';
const TENANT_ID = '6d6a33e6-13c9-4559-a664-18f30c42cc95';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const accounts = [
  { email: 'teacher@edenhighschool.com', password: 'Teacher@2025!', name: 'Sarah Teacher', role: 'staff' },
  { email: 'dos@edenhighschool.com', password: 'DOS@2025!', name: 'James DOS', role: 'staff' },
  { email: 'headteacher@edenhighschool.com', password: 'Head@2025!', name: 'Peter Headteacher', role: 'staff' },
];

async function createAccount(account) {
  console.log(`\n--- Creating ${account.name} (${account.email}) ---`);

  // Step 1: Sign up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
    options: {
      data: { full_name: account.name },
    },
  });

  if (signUpError) {
    console.error(`Signup error: ${signUpError.message}`);
    return;
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    console.error('No user ID returned');
    return;
  }

  console.log(`Auth user created: ${userId}`);

  // Step 2: Try to insert profile using service_role via RPC
  // Since we can't do direct inserts, let's try calling the create_profile_for_signup RPC
  // But first let's try the profiles insert anyway
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      tenant_id: TENANT_ID,
      role: 'staff',
      full_name: account.name,
    });

  if (profileError) {
    console.log(`Profile insert failed (expected): ${profileError.message}`);
    console.log('Will need to create profile via admin API or dashboard');
  } else {
    console.log('Profile created successfully');
  }

  // Step 3: Try RPC functions
  console.log('Trying RPC create_profile_for_signup...');
  const { error: rpcError } = await supabase.rpc('create_profile_for_signup', {
    p_user_id: userId,
    p_tenant_id: TENANT_ID,
    p_full_name: account.name,
    p_phone: null,
  });

  if (rpcError) {
    console.log(`RPC failed: ${rpcError.message}`);
  } else {
    console.log('RPC succeeded!');
  }

  return userId;
}

async function main() {
  console.log('Creating demo accounts for Eden High School');
  console.log('============================================\n');

  for (const account of accounts) {
    await createAccount(account);
  }

  console.log('\n============================================');
  console.log('\nNext steps:');
  console.log('1. Use Supabase Dashboard > Authentication > Users to confirm each user');
  console.log('2. Then insert profiles for each user in the SQL editor:');
  console.log(`
INSERT INTO profiles (id, tenant_id, role, full_name) VALUES
  ('<teacher-user-id>', '${TENANT_ID}', 'staff', 'Sarah Teacher'),
  ('<dos-user-id>', '${TENANT_ID}', 'staff', 'James DOS'),
  ('<headteacher-user-id>', '${TENANT_ID}', 'staff', 'Peter Headteacher');

INSERT INTO staff_role_assignments (profile_id, tenant_id, role) VALUES
  ('<teacher-user-id>', '${TENANT_ID}', 'class_teacher'),
  ('<dos-user-id>', '${TENANT_ID}', 'director_of_studies'),
  ('<headteacher-user-id>', '${TENANT_ID}', 'head_teacher');
`);
}

main().catch(console.error);
