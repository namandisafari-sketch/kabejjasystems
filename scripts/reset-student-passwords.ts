import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo';
const tenantId = 'ef7a3391-cddd-434f-9422-e58ffda74953';
const defaultPassword = 'alwaystry!';

// Create admin client with service role
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetAllStudentPasswords() {
  console.log('🔐 Resetting all student passwords using Supabase Admin API...\n');

  try {
    // Get all students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, admission_number, first_name, last_name, user_id')
      .eq('tenant_id', tenantId)
      .not('user_id', 'is', null);

    if (studentsError) throw studentsError;

    console.log(`📖 Found ${students.length} students with auth accounts\n`);

    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const student of students) {
      try {
        const email = `${student.admission_number}@ttl.student`;
        console.log(`🔄 Resetting password for ${student.admission_number}...`);

        // Use admin API to update password
        const { data, error } = await supabase.auth.admin.updateUserById(
          student.user_id,
          {
            password: defaultPassword,
            email_confirm: true,
          }
        );

        if (error) {
          throw error;
        }

        console.log(`   ✅ Password reset\n`);
        updated++;
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
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('='.repeat(50) + '\n');

    if (errors.length > 0) {
      console.log('⚠️  Failed passwords:');
      errors.forEach((e) => {
        console.log(`   - ${e.admissionNumber}: ${e.error}`);
      });
    }

    console.log('\n✅ Done! Students can now login with:');
    console.log('   Email: {admission_number}@ttl.student');
    console.log(`   Password: ${defaultPassword}`);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run
resetAllStudentPasswords();
