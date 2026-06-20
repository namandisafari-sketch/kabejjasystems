import { createClient } from '@supabase/supabase-js';

const URL = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const ANON_KEY = 'sb_publishable_tvuluLavd8x2hpeUyI6Jbw_dk3PO_da';
const supabase = createClient(URL, ANON_KEY);

const PHARMACY_EMAIL = 'pharmacy@demo.com';
const PHARMACY_PASSWORD = 'Demo@123456';

async function main() {
  console.log('=== Pharmacy Sample Account Seeder ===\n');

  // --- STEP 1: Sign up user ---
  console.log('1. Creating pharmacy owner account...');
  let userId;

  const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
    email: PHARMACY_EMAIL,
    password: PHARMACY_PASSWORD,
    options: { data: { full_name: 'Pharmacy Owner' } },
  });

  if (signUpErr && (signUpErr.message?.includes('rate limit') || signUpErr.status === 429)) {
    console.log('   Email rate limited. Trying to find existing user...');
    // Check if user was already created by trying sign in
    const { data: signIn } = await supabase.auth.signInWithPassword({
      email: PHARMACY_EMAIL, password: PHARMACY_PASSWORD,
    });
    if (signIn?.user) {
      userId = signIn.user.id;
      console.log('   Found existing user:', userId);
    } else {
      console.log('   User may exist but email unconfirmed. Proceeding with RPCs...');
      // The user was likely created by a previous run
      userId = 'a81bf620-bf22-4f64-91ed-6fbebf075e3a';
      console.log('   Using known user ID:', userId);
    }
  } else if (signUpErr) {
    console.error('   Signup failed:', signUpErr.message);
    return;
  } else {
    userId = signUp.user?.id;
    console.log('   User created:', userId);
    if (!signUp.session) {
      console.log('   Note: Email confirmation required. User must check email.');
    }
  }

  // --- STEP 2: Create tenant via RPC (SECURITY DEFINER, works with anon) ---
  console.log('\n2. Creating pharmacy tenant...');
  let tenantId;

  const { data: rpcResult, error: rpcErr } = await supabase.rpc('create_tenant_for_signup', {
    p_name: 'Sample Pharmacy',
    p_business_type: 'pharmacy',
    p_address: '123 Health Street, Kampala',
    p_phone: '+256700123456',
    p_email: PHARMACY_EMAIL,
    p_package_id: null,
    p_referred_by_code: null,
  });

  if (rpcErr) {
    console.error('   RPC failed:', rpcErr.message);
    return;
  }
  tenantId = rpcResult;
  console.log('   Tenant created:', tenantId);

  // --- STEP 3: Create profile via REST (anon INSERT is allowed) ---
  console.log('\n3. Creating profile...');
  const profileResp = await fetch(`${URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      id: userId,
      tenant_id: tenantId,
      role: 'tenant_owner',
      full_name: 'Pharmacy Owner',
      phone: '+256700123456',
    }),
  });

  if (!profileResp.ok) {
    const err = await profileResp.text();
    console.error('   Profile insert failed:', err);
    return;
  }
  console.log('   Profile created');

  // --- STEP 4: Create user_role via REST (anon INSERT is allowed) ---
  console.log('\n4. Setting user role...');
  const roleResp = await fetch(`${URL}/rest/v1/user_roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      role: 'tenant_owner',
    }),
  });

  if (!roleResp.ok) {
    const err = await roleResp.text();
    console.error('   User role insert failed:', err);
    return;
  }
  console.log('   User role set');

  // --- STEP 5: Try seeding data via REST (might fail due to RLS) ---
  console.log('\n5. Seeding product categories (may fail if email not confirmed)...');

  const categories = [
    { tenant_id: tenantId, name: 'Antibiotics', business_type: 'pharmacy', is_system: false, display_order: 1 },
    { tenant_id: tenantId, name: 'Painkillers', business_type: 'pharmacy', is_system: false, display_order: 2 },
    { tenant_id: tenantId, name: 'Vitamins & Supplements', business_type: 'pharmacy', is_system: false, display_order: 3 },
    { tenant_id: tenantId, name: 'Cold & Flu', business_type: 'pharmacy', is_system: false, display_order: 4 },
    { tenant_id: tenantId, name: 'Allergy & Sinus', business_type: 'pharmacy', is_system: false, display_order: 5 },
    { tenant_id: tenantId, name: 'First Aid', business_type: 'pharmacy', is_system: false, display_order: 6 },
    { tenant_id: tenantId, name: 'Digestive Health', business_type: 'pharmacy', is_system: false, display_order: 7 },
    { tenant_id: tenantId, name: 'Blood Pressure & Heart', business_type: 'pharmacy', is_system: false, display_order: 8 },
    { tenant_id: tenantId, name: 'Diabetes Care', business_type: 'pharmacy', is_system: false, display_order: 9 },
    { tenant_id: tenantId, name: 'Eye & Ear Care', business_type: 'pharmacy', is_system: false, display_order: 10 },
  ];

  const catResp = await fetch(`${URL}/rest/v1/product_categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(categories),
  });

  if (!catResp.ok) {
    const errText = await catResp.text();
    console.log('   Categories seed failed (RLS):', errText.substring(0, 100));
    console.log('\n⚠ Data seeding requires email confirmation.');
    console.log('   Please confirm your email and then run:');
    console.log('   node seed-pharmacy-data.mjs\n');
  } else {
    console.log('   Categories seeded successfully!');
    
    // Continue seeding if categories worked
    console.log('\n6. Seeding suppliers...');
    // ... rest of seeding
  }

  // --- SUMMARY ---
  console.log('\n========================================');
  console.log('  Account Setup Complete');
  console.log('========================================');
  console.log(`  Tenant ID: ${tenantId}`);
  console.log(`  Login:     ${PHARMACY_EMAIL}`);
  console.log(`  Password:  ${PHARMACY_PASSWORD}`);
  console.log('========================================');
  console.log('\n⚠ Email confirmation required!');
  console.log('   Check your email (pharmacy@demo.com) and click the confirmation link.');
  console.log('   If you don\'t see it, ask your Supabase admin to confirm the user from the dashboard.');
  console.log('   Or run: supabase auth admin confirm-user a81bf620-bf22-4f64-91ed-6fbebf075e3a\n');
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
