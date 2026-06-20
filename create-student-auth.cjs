const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo';

const supabase = createClient(
  'https://ljgbjiixeoxxqpejnmjx.supabase.co',
  SERVICE_ROLE,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PAT = process.env.SUPABASE_PAT;

function sqlQuery(query) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.supabase.com',
      path: '/v1/projects/ljgbjiixeoxxqpejnmjx/database/query',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ query }));
    req.end();
  });
}

function makeEmail(admissionNumber) {
  const cleaned = admissionNumber.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
  return `${cleaned}@student.tenna`;
}

async function main() {
  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name, admission_number, tenant_id')
    .is('user_id', null)
    .limit(500);

  if (error) { console.error('Fetch error:', error); return; }
  console.log(`Found ${students.length} students without auth accounts\n`);

  let created = 0, errors = 0;

  for (const s of students) {
    const email = makeEmail(s.admission_number);

    // Check if auth user already exists (scan all pages)
    let existingUser = null;
    let page = null;
    while (!existingUser) {
      const { data: pageData, error: pageErr } = page
        ? await supabase.auth.admin.listUsers({ page: page + 1, perPage: 100 })
        : await supabase.auth.admin.listUsers();
      if (pageErr) break;
      existingUser = pageData?.users?.find(u => u.email === email) || null;
      if (existingUser || !pageData?.users?.length || pageData.users.length < 100) break;
      page = page ? page + 1 : 1;
    }
    if (existingUser) {
      const linkSql = `UPDATE public.students SET user_id = '${existingUser.id}', email = '${email}' WHERE id = '${s.id}'`;
      await sqlQuery(linkSql);
      process.stdout.write('l');
      await new Promise(r => setTimeout(r, 100));
      continue;
    }

    const { data, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: '1234school.com',
      email_confirm: true,
      user_metadata: { must_reset_password: true, role: 'student', student_name: s.full_name },
    });

    if (createErr) {
      if (createErr.message?.includes('already exists') || createErr.message?.includes('already registered')) {
        console.log(`  EXISTS ${s.admission_number} -> ${email}`);
      } else {
        console.error(`  FAIL ${s.admission_number} -> ${email}: ${createErr.message}`);
        errors++;
      }
      process.stdout.write('s');
      await new Promise(r => setTimeout(r, 100));
      continue;
    }

    // Use raw SQL to update since schema cache is stale
    const updateSql = `UPDATE public.students SET user_id = '${data.user.id}', email = '${email}' WHERE id = '${s.id}'`;
    const res = await sqlQuery(updateSql);
    if (res.status >= 400) {
      console.error(`\n  SQL UPDATE FAIL ${s.admissionNumber}: ${res.body}`);
      await supabase.auth.admin.deleteUser(data.user.id);
      errors++;
    } else {
      created++;
      process.stdout.write('.');
    }

    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n\nDone: ${created} created, ${errors} errors`);
}

main().catch(console.error);
