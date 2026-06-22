#!/usr/bin/env node

/**
 * Bulk create student auth accounts using Supabase Admin API
 * This properly hashes passwords using Supabase's standard bcrypt implementation
 */

const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo';
const projectId = 'ljgbjiixeoxxqpejnmjx';
const tenantId = 'ef7a3391-cddd-434f-9422-e58ffda74953';
const defaultPassword = 'alwaystry!';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTY2NzcsImV4cCI6MjA5NzI3MjY3N30.6TN6FQQZnFBpE8XA64Vh1w6g5RqPVhT2TyM3BfNKr8Y';

async function createStudentAuthAccounts() {
  console.log('🔐 Starting bulk student auth account creation...\n');

  try {
    // Step 1: Fetch all students without auth accounts
    console.log('📖 Fetching students without auth accounts...');
    const studentsRes = await fetch(
      `${supabaseUrl}/rest/v1/students?tenant_id=eq.${tenantId}&user_id=is.null&select=id,admission_number,first_name,last_name,email`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
        },
      }
    ).catch(err => {
      throw new Error(`Fetch error: ${err.message}`);
    });

    if (!studentsRes.ok) {
      const errorText = await studentsRes.text();
      throw new Error(`Failed to fetch students: ${studentsRes.statusText} - ${errorText}`);
    }

    const students = await studentsRes.json();
    console.log(`✅ Found ${students.length} students without auth accounts\n`);

    if (students.length === 0) {
      console.log('✅ All students already have auth accounts!');
      return;
    }

    // Step 2: Create auth accounts for each student
    console.log('🔐 Creating auth accounts...\n');
    let created = 0;
    let failed = 0;
    const errors = [];

    for (const student of students) {
      try {
        const email = `${student.admission_number}@ttl.student`;

        console.log(`Creating auth for ${student.admission_number} (${student.first_name} ${student.last_name})...`);

        // Create auth user via Supabase Admin API
        const createUserRes = await fetch(
          `${supabaseUrl}/auth/v1/users`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              password: defaultPassword,
              email_confirm: true,
              user_metadata: {
                role: 'student',
                first_name: student.first_name,
                last_name: student.last_name,
                admission_number: student.admission_number,
                tenant_id: tenantId,
              },
            }),
          }
        );

        if (!createUserRes.ok) {
          const errorData = await createUserRes.json();
          throw new Error(errorData.message || createUserRes.statusText);
        }

        const userData = await createUserRes.json();
        const userId = userData.user.id;

        console.log(`   ✅ Auth created with ID: ${userId}`);

        // Step 3: Link student to auth account
        const linkRes = await fetch(
          `${supabaseUrl}/rest/v1/students?id=eq.${student.id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId }),
          }
        );

        if (!linkRes.ok) {
          throw new Error(`Failed to link student: ${linkRes.statusText}`);
        }

        console.log(`   ✅ Linked to student record\n`);
        created++;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        failed++;
        errors.push({
          admissionNumber: student.admission_number,
          error: error.message,
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('='.repeat(50) + '\n');

    if (errors.length > 0) {
      console.log('⚠️  Failed accounts:');
      errors.forEach((e) => {
        console.log(`   - ${e.admissionNumber}: ${e.error}`);
      });
    }

    // Verify
    console.log('\n🔍 Verifying...');
    const verifyRes = await fetch(
      `${supabaseUrl}/rest/v1/students?tenant_id=eq.${tenantId}&select=id&user_id=not.is.null`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
      }
    );

    const withAuth = await verifyRes.json();
    console.log(`✅ Students with auth accounts: ${withAuth.length}`);

    console.log('\n✅ Done! Students can now login with:');
    console.log('   Email: {admission_number}@ttl.student');
    console.log(`   Password: ${defaultPassword}`);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run
createStudentAuthAccounts();
