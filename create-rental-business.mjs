import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ljgbjiixeoxxqpejnmjx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo'
);

async function main() {
  // Step 1: Create auth user
  console.log('1. Creating owner auth user...');
  const { data: auth, error: authErr } = await supabase.auth.admin.createUser({
    email: 'mukasa@kampalarentals.com',
    password: 'Rental@2026!',
    email_confirm: true,
    user_metadata: { full_name: 'John Mukasa', phone: '+256700123456', role: 'tenant_owner' },
  });
  if (authErr) { console.error('Auth error:', authErr.message); return; }
  const ownerId = auth.user.id;
  console.log(`   Owner ID: ${ownerId}`);

  // Step 2: Create tenant
  const code = 'KPR' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();
  console.log('2. Creating tenant...');
  const { data: tenant, error: tenErr } = await supabase.from('tenants').insert({
    name: 'Kampala Prime Rentals',
    business_type: 'rental_management',
    status: 'active',
    subscription_status: 'trialing',
    trial_end_date: trialEnd,
    phone: '+256700123456',
    address: 'Kampala, Uganda',
    email: 'mukasa@kampalarentals.com',
    business_code: code,
    owner_email: 'mukasa@kampalarentals.com',
    owner_password: 'Rental@2026!',
  }).select().single();
  if (tenErr) { console.error('Tenant error:', tenErr.message); return; }
  console.log(`   Tenant ID: ${tenant.id}`);

  // Step 3: Create profile
  console.log('3. Creating profile...');
  const { error: profErr } = await supabase.from('profiles').insert({
    id: ownerId,
    tenant_id: tenant.id,
    full_name: 'John Mukasa',
    phone: '+256700123456',
    role: 'tenant_owner',
  });
  if (profErr) { console.error('Profile error:', profErr.message); await supabase.from('tenants').delete().eq('id', tenant.id); return; }

  // Step 4: Assign role
  console.log('4. Assigning role...');
  await supabase.from('user_roles').insert({ user_id: ownerId, tenant_id: tenant.id, role: 'tenant_owner' });

  // Step 5: Enable rental modules
  console.log('5. Enabling rental modules...');
  const modules = ['rental_dashboard','rental_properties','rental_units','rental_tenants','rental_leases','rental_payments','rental_maintenance','rental_documents','rental_messages','rental_reports','settings'];
  await supabase.from('tenant_modules').insert(modules.map(c => ({ tenant_id: tenant.id, module_code: c, is_enabled: true, enabled_by: ownerId })));

  // Step 6: Get rental package and create subscription
  console.log('6. Setting up subscription...');
  const { data: pkgs } = await supabase.from('rental_packages').select('id, name, monthly_price').eq('is_active', true).order('monthly_price').limit(1);
  if (pkgs?.length) {
    const pkg = pkgs[0];
    await supabase.from('rental_subscriptions').insert({
      tenant_id: tenant.id, package_id: pkg.id, monthly_amount: pkg.monthly_price,
      total_amount: pkg.monthly_price, payment_status: 'pending',
      next_billing_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], status: 'trialing',
    });
    await supabase.from('tenants').update({ rental_package_id: pkg.id }).eq('id', tenant.id);
    console.log(`   Package: ${pkg.name} (UGX ${pkg.monthly_price.toLocaleString()}/mo)`);
  }

  console.log('\n========================================');
  console.log('KAMPALA PRIME RENTALS - ACCOUNT CREATED!');
  console.log('========================================');
  console.log(`Business Code: ${code}`);
  console.log(`Login Email:   mukasa@kampalarentals.com`);
  console.log(`Password:      Rental@2026!`);
  console.log(`Login URL:     https://system.tennahubapps.com/login`);
  console.log('========================================');
}

main().catch(console.error);
