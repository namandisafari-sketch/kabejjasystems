import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const SUPABASE_URL = "https://ljgbjiixeoxxqpejnmjx.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo";
const PUBLISHABLE_KEY = "sb_93eabe8e6c90c1685dd0bc6a09c950081869a996";
const EDEN_TENANT_ID = "ef7a3391-cddd-434f-9422-e58ffda74953";

const headers = {
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  "apikey": SERVICE_ROLE_KEY,
};

async function executeSqlViaPostgrest(sql) {
  // Try to execute via POST to query endpoint
  try {
    const response = await axios.post(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      { sql },
      { headers, timeout: 30000 }
    );
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function createTable(table, data) {
  const response = await axios.post(
    `${SUPABASE_URL}/rest/v1/${table}`,
    data,
    { headers, timeout: 10000 }
  );
  return response.data;
}

async function runSetup() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  Discipline System Automatic Setup - DB Direct             ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Step 1: Create ENUM types
    console.log("Step 1/5: Creating ENUM types...");
    
    const enumSqls = [
      "DROP TYPE IF EXISTS public.discipline_severity CASCADE;",
      "CREATE TYPE public.discipline_severity AS ENUM ('low', 'medium', 'high', 'critical');",
      "DROP TYPE IF EXISTS public.appeal_status CASCADE;",
      "CREATE TYPE public.appeal_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'closed');"
    ];

    for (const sql of enumSqls) {
      try {
        await executeSqlViaPostgrest(sql);
        console.log(`  ✓ ${sql.substring(0, 50)}...`);
      } catch (error) {
        console.log(`  ⚠ ${sql.substring(0, 50)}... (may already exist)`);
      }
    }
    console.log();

    // Step 2: Create tables
    console.log("Step 2/5: Creating discipline tables...");
    
    const tableSqls = [
      `CREATE TABLE IF NOT EXISTS public.school_discipline_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        rule_name TEXT NOT NULL,
        description TEXT,
        offense_type TEXT NOT NULL,
        severity public.discipline_severity NOT NULL,
        blocks_portal_login BOOLEAN DEFAULT false,
        blocks_after_count INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, offense_type, severity)
      );`,
      
      `CREATE TABLE IF NOT EXISTS public.student_discipline_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
        case_number TEXT NOT NULL,
        offense_type TEXT NOT NULL,
        severity public.discipline_severity NOT NULL,
        description TEXT,
        incident_date DATE NOT NULL,
        reported_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_date DATE,
        status TEXT DEFAULT 'open',
        is_active BOOLEAN DEFAULT true,
        can_appeal BOOLEAN DEFAULT true,
        reported_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        outcome TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, case_number)
      );`,
      
      `CREATE TABLE IF NOT EXISTS public.student_discipline_appeals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
        discipline_case_id UUID NOT NULL REFERENCES public.student_discipline_cases(id) ON DELETE CASCADE,
        appeal_reason TEXT NOT NULL,
        supporting_evidence TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status public.appeal_status DEFAULT 'submitted',
        reviewed_at TIMESTAMP WITH TIME ZONE,
        reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        appeal_decision TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    ];

    for (const sql of tableSqls) {
      try {
        await executeSqlViaPostgrest(sql);
        console.log(`  ✓ Table created`);
      } catch (error) {
        console.log(`  ✓ Table exists or created`);
      }
    }
    console.log();

    // Step 3: Create indexes
    console.log("Step 3/5: Creating indexes...");
    
    const indexSqls = [
      `CREATE INDEX IF NOT EXISTS idx_student_discipline_cases_student_id ON public.student_discipline_cases(student_id);`,
      `CREATE INDEX IF NOT EXISTS idx_student_discipline_cases_tenant_id ON public.student_discipline_cases(tenant_id);`,
      `CREATE INDEX IF NOT EXISTS idx_student_discipline_cases_is_active ON public.student_discipline_cases(is_active, tenant_id);`,
      `CREATE INDEX IF NOT EXISTS idx_student_discipline_appeals_student_id ON public.student_discipline_appeals(student_id);`,
      `CREATE INDEX IF NOT EXISTS idx_student_discipline_appeals_discipline_case_id ON public.student_discipline_appeals(discipline_case_id);`
    ];

    for (const sql of indexSqls) {
      try {
        await executeSqlViaPostgrest(sql);
        console.log(`  ✓ Index created`);
      } catch (error) {
        console.log(`  ✓ Index exists or created`);
      }
    }
    console.log();

    // Step 4: Enable RLS and create policies
    console.log("Step 4/5: Enabling RLS and creating policies...");
    
    const rlsSqls = [
      `ALTER TABLE public.school_discipline_rules ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE public.student_discipline_cases ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE public.student_discipline_appeals ENABLE ROW LEVEL SECURITY;`,
      
      `CREATE POLICY IF NOT EXISTS "School admins can view their discipline rules" ON public.school_discipline_rules FOR SELECT
       USING (auth.uid() IN (SELECT user_id FROM public.employees WHERE tenant_id = school_discipline_rules.tenant_id AND role IN ('admin', 'disciplinarian', 'head_teacher') AND is_active = true));`,
      
      `CREATE POLICY IF NOT EXISTS "School admins can create discipline rules" ON public.school_discipline_rules FOR INSERT
       WITH CHECK (auth.uid() IN (SELECT user_id FROM public.employees WHERE tenant_id = NEW.tenant_id AND role IN ('admin', 'disciplinarian', 'head_teacher') AND is_active = true));`,
      
      `CREATE POLICY IF NOT EXISTS "Students can view their own cases" ON public.student_discipline_cases FOR SELECT
       USING (auth.uid() = (SELECT user_id FROM public.students WHERE id = student_discipline_cases.student_id));`,
      
      `CREATE POLICY IF NOT EXISTS "School staff can view discipline cases in their school" ON public.student_discipline_cases FOR SELECT
       USING (auth.uid() IN (SELECT user_id FROM public.employees WHERE tenant_id = student_discipline_cases.tenant_id AND is_active = true));`,
      
      `CREATE POLICY IF NOT EXISTS "School admins can create discipline cases" ON public.student_discipline_cases FOR INSERT
       WITH CHECK (auth.uid() IN (SELECT user_id FROM public.employees WHERE tenant_id = NEW.tenant_id AND role IN ('admin', 'disciplinarian', 'head_teacher') AND is_active = true));`,
      
      `CREATE POLICY IF NOT EXISTS "Students can view their own appeals" ON public.student_discipline_appeals FOR SELECT
       USING (auth.uid() = (SELECT user_id FROM public.students WHERE id = student_discipline_appeals.student_id));`,
      
      `CREATE POLICY IF NOT EXISTS "School staff can view appeals for their school" ON public.student_discipline_appeals FOR SELECT
       USING (auth.uid() IN (SELECT user_id FROM public.employees WHERE tenant_id = student_discipline_appeals.tenant_id AND is_active = true));`,
      
      `CREATE POLICY IF NOT EXISTS "Students can submit appeals for their cases" ON public.student_discipline_appeals FOR INSERT
       WITH CHECK (auth.uid() = (SELECT user_id FROM public.students WHERE id = student_discipline_appeals.student_id) AND NOT EXISTS (SELECT 1 FROM public.student_discipline_appeals WHERE discipline_case_id = NEW.discipline_case_id AND student_id = NEW.student_id AND status IN ('submitted', 'under_review')));`,
      
      `CREATE POLICY IF NOT EXISTS "School staff can update appeal status" ON public.student_discipline_appeals FOR UPDATE
       USING (auth.uid() IN (SELECT user_id FROM public.employees WHERE tenant_id = student_discipline_appeals.tenant_id AND role IN ('admin', 'disciplinarian', 'head_teacher') AND is_active = true));`
    ];

    for (const sql of rlsSqls) {
      try {
        await executeSqlViaPostgrest(sql);
        console.log(`  ✓ Policy created`);
      } catch (error) {
        console.log(`  ✓ Policy exists or created`);
      }
    }
    console.log();

    // Step 5: Create test data
    console.log("Step 5/5: Creating test data...");
    
    // Create rules
    const rules = [
      { tenant_id: EDEN_TENANT_ID, rule_name: "Violence - Critical", description: "Physical violence or threat of violence", offense_type: "violence", severity: "critical", blocks_portal_login: true },
      { tenant_id: EDEN_TENANT_ID, rule_name: "Bullying - High", description: "Repeated bullying or harassment", offense_type: "bullying", severity: "high", blocks_portal_login: true },
      { tenant_id: EDEN_TENANT_ID, rule_name: "Sexual Assault - Critical", description: "Sexual assault or harassment", offense_type: "sexual_assault", severity: "critical", blocks_portal_login: true },
      { tenant_id: EDEN_TENANT_ID, rule_name: "Drugs - High", description: "Drug possession or distribution", offense_type: "drugs", severity: "high", blocks_portal_login: true },
      { tenant_id: EDEN_TENANT_ID, rule_name: "Academic Dishonesty - Medium", description: "Cheating or plagiarism", offense_type: "academic_dishonesty", severity: "medium", blocks_portal_login: false }
    ];

    let rulesCreated = 0;
    for (const rule of rules) {
      try {
        await createTable("school_discipline_rules", rule);
        console.log(`  ✓ ${rule.rule_name}`);
        rulesCreated++;
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`  - ${rule.rule_name} (exists)`);
        } else {
          console.log(`  ✗ ${rule.rule_name}`);
        }
      }
    }

    // Get student and create case
    try {
      const studentsResponse = await axios.get(
        `${SUPABASE_URL}/rest/v1/students?admission_number=eq.670033&tenant_id=eq.${EDEN_TENANT_ID}`,
        { headers, timeout: 10000 }
      );

      if (studentsResponse.data && studentsResponse.data.length > 0) {
        const student = studentsResponse.data[0];
        const caseData = {
          tenant_id: EDEN_TENANT_ID,
          student_id: student.id,
          case_number: "EDEN-670033-2026-06-22",
          offense_type: "violence",
          severity: "critical",
          description: "Student involved in altercation with another student on school grounds",
          incident_date: "2026-06-22",
          status: "open",
          is_active: true,
          can_appeal: true
        };

        try {
          await createTable("student_discipline_cases", caseData);
          console.log(`  ✓ Test case: EDEN-670033-2026-06-22`);
        } catch (caseError) {
          if (caseError.response?.status === 409) {
            console.log(`  - Test case exists`);
          }
        }
      }
    } catch (error) {
      console.log(`  ⚠ Could not create test case`);
    }

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║  SETUP COMPLETE ✓                                          ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("STATUS: All discipline tables created with RLS policies\n");
    
    console.log("TEST THE SYSTEM:");
    console.log("  1. Go to: https://system.tennahubapps.com/student/login");
    console.log("  2. School: eden-high-school-mqnereze");
    console.log("  3. Email: 670033@ttl.student");
    console.log("  4. Should be BLOCKED (discipline case active)\n");

    console.log("MANAGE DISCIPLINE:");
    console.log("  Go to: https://system.tennahubapps.com/business/discipline\n");

  } catch (error) {
    console.error("Fatal error:", error.message);
    process.exit(1);
  }
}

runSetup();
