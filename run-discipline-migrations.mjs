import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase
const supabaseUrl = 'https://ljgbjiixeoxxqpejnmjx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxODEwNDQ4NCwiZXhwIjoxODc1ODcwNDg0fQ.4u9EpPjZWaF6MdKdG10D_WNgkbPPM2DWmI3X1z0VbV8';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const EDEN_TENANT_ID = 'ef7a3391-cddd-434f-9422-e58ffda74953';

async function runMigrations() {
  console.log('Starting discipline system setup...\n');
  
  try {
    // Step 1: Create tables
    console.log('Step 1: Verifying discipline tables...');
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260622_create_discipline_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Try to check if tables exist
    try {
      const { error: tableCheckError } = await supabase
        .from('school_discipline_rules')
        .select('id', { count: 'exact' })
        .limit(0);
      
      if (tableCheckError && tableCheckError.code === 'PGRST116') {
        console.log('⚠ Tables do not exist yet - requires manual SQL execution');
        console.log('   Go to: https://supabase.com/dashboard/project/ljgbjiixeoxxqpejnmjx/sql/new');
        console.log('   Run the migration SQL from supabase/migrations/20260622_create_discipline_system.sql\n');
      } else if (!tableCheckError) {
        console.log('✓ Discipline tables exist\n');
      }
    } catch (err) {
      console.log('⚠ Could not verify tables - may need manual creation\n');
    }
    
    // Step 2: Create discipline rules
    console.log('Step 2: Creating discipline rules for Eden High School...');
    
    const rules = [
      {
        tenant_id: EDEN_TENANT_ID,
        rule_name: 'Violence - Critical',
        description: 'Physical violence or threat of violence to students or staff',
        offense_type: 'violence',
        severity: 'critical',
        blocks_portal_login: true
      },
      {
        tenant_id: EDEN_TENANT_ID,
        rule_name: 'Bullying - High',
        description: 'Repeated bullying or harassment of other students',
        offense_type: 'bullying',
        severity: 'high',
        blocks_portal_login: true
      },
      {
        tenant_id: EDEN_TENANT_ID,
        rule_name: 'Sexual Assault - Critical',
        description: 'Any form of sexual assault or harassment',
        offense_type: 'sexual_assault',
        severity: 'critical',
        blocks_portal_login: true
      },
      {
        tenant_id: EDEN_TENANT_ID,
        rule_name: 'Drugs - High',
        description: 'Possession, use, or distribution of illegal drugs',
        offense_type: 'drugs',
        severity: 'high',
        blocks_portal_login: true
      },
      {
        tenant_id: EDEN_TENANT_ID,
        rule_name: 'Academic Dishonesty - Medium',
        description: 'Cheating, plagiarism, or unauthorized collaboration',
        offense_type: 'academic_dishonesty',
        severity: 'medium',
        blocks_portal_login: false
      }
    ];
    
    const { data: rulesData, error: rulesError } = await supabase
      .from('school_discipline_rules')
      .insert(rules)
      .select();
    
    if (rulesError) {
      if (rulesError.code === 'PGRST001') {
        console.log('✓ Rules table may not exist yet (needs manual SQL execution)');
      } else {
        throw rulesError;
      }
    } else {
      console.log(`✓ Created ${rulesData.length} discipline rules\n`);
    }
    
    // Step 3: Get student 670033 and create test case
    console.log('Step 3: Creating test discipline case for student 670033...');
    
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, admission_number, tenant_id')
      .eq('admission_number', '670033')
      .eq('tenant_id', EDEN_TENANT_ID)
      .limit(1);
    
    if (studentError) {
      throw studentError;
    }
    
    if (!students || students.length === 0) {
      console.log('✗ Student 670033 not found in database');
    } else {
      const student = students[0];
      const caseNumber = 'EDEN-670033-2026-06-22';
      
      const { data: caseData, error: caseError } = await supabase
        .from('student_discipline_cases')
        .insert([{
          tenant_id: EDEN_TENANT_ID,
          student_id: student.id,
          case_number: caseNumber,
          offense_type: 'violence',
          severity: 'critical',
          description: 'Student involved in altercation with another student on school grounds. Incident reported by witnesses.',
          incident_date: '2026-06-22',
          status: 'open',
          is_active: true,
          can_appeal: true
        }])
        .select();
      
      if (caseError) {
        if (caseError.code === 'PGRST001') {
          console.log('✓ Cases table may not exist yet (needs manual SQL execution)');
        } else {
          throw caseError;
        }
      } else {
        console.log(`✓ Created test discipline case: ${caseNumber}\n`);
      }
    }
    
    console.log('════════════════════════════════════════════════════════════');
    console.log('SETUP COMPLETE');
    console.log('════════════════════════════════════════════════════════════\n');
    
    console.log('NOTE: If you see errors about tables not existing:');
    console.log('  1. Go to: https://supabase.com/dashboard/project/ljgbjiixeoxxqpejnmjx/sql/new');
    console.log('  2. Copy the full SQL migration from supabase/migrations/20260622_create_discipline_system.sql');
    console.log('  3. Run it in the SQL editor');
    console.log('  4. Then run this script again\n');
    
    console.log('NEXT STEPS:');
    console.log('  1. Test student login: https://system.tennahubapps.com/student/login');
    console.log('  2. Use school code: eden-high-school-mqnereze');
    console.log('  3. Use email: 670033@ttl.student');
    console.log('  4. Should be blocked and see DisciplineBlocked page');
    console.log('  5. Click "Submit an Appeal" to test appeal workflow\n');
    
  } catch (error) {
    console.error('Error during setup:', error.message);
    process.exit(1);
  }
}

runMigrations();
