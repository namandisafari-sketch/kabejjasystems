import axios from 'axios';

const SUPABASE_URL = "https://ljgbjiixeoxxqpejnmjx.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo";
const EDEN_TENANT_ID = "ef7a3391-cddd-434f-9422-e58ffda74953";

const headers = {
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  "apikey": SERVICE_ROLE_KEY,
};

async function createTestData() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  Creating Discipline Test Data                             ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Step 1: Create rules
    console.log("Step 1: Creating discipline rules...");
    
    const rules = [
      {
        tenant_id: EDEN_TENANT_ID,
        rule_name: "Violence - Critical",
        description: "Physical violence or threat of violence to students or staff",
        offense_type: "violence",
        severity: "critical",
        blocks_portal_login: true
      },
      {
        tenant_id: EDEN_TENANT_ID,
        rule_name: "Bullying - High",
        description: "Repeated bullying or harassment of other students",
        offense_type: "bullying",
        severity: "high",
        blocks_portal_login: true
      },
      {
        tenant_id: EDEN_TENANT_ID,
        rule_name: "Sexual Assault - Critical",
        description: "Any form of sexual assault or harassment",
        offense_type: "sexual_assault",
        severity: "critical",
        blocks_portal_login: true
      },
      {
        tenant_id: EDEN_TENANT_ID,
        rule_name: "Drugs - High",
        description: "Possession, use, or distribution of illegal drugs",
        offense_type: "drugs",
        severity: "high",
        blocks_portal_login: true
      },
      {
        tenant_id: EDEN_TENANT_ID,
        rule_name: "Academic Dishonesty - Medium",
        description: "Cheating, plagiarism, or unauthorized collaboration",
        offense_type: "academic_dishonesty",
        severity: "medium",
        blocks_portal_login: false
      }
    ];

    let rulesCreated = 0;
    for (const rule of rules) {
      try {
        const response = await axios.post(
          `${SUPABASE_URL}/rest/v1/school_discipline_rules`,
          rule,
          { headers, timeout: 10000 }
        );
        console.log(`  ✓ ${rule.rule_name}`);
        rulesCreated++;
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`  - ${rule.rule_name} (already exists)`);
          rulesCreated++;
        } else {
          console.log(`  ⚠ ${rule.rule_name}: ${error.response?.data?.message || error.message}`);
        }
      }
    }
    console.log(`✓ ${rulesCreated}/5 rules ready\n`);

    // Step 2: Get student and create case
    console.log("Step 2: Creating test discipline case...");
    
    const studentsResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/students?admission_number=eq.670033&tenant_id=eq.${EDEN_TENANT_ID}`,
      { headers, timeout: 10000 }
    );

    if (studentsResponse.data && studentsResponse.data.length > 0) {
      const student = studentsResponse.data[0];
      console.log(`  Student: ${student.full_name} (${student.admission_number})`);

      const caseData = {
        tenant_id: EDEN_TENANT_ID,
        student_id: student.id,
        case_number: "EDEN-670033-2026-06-22",
        offense_type: "violence",
        severity: "critical",
        description: "Student involved in altercation with another student on school grounds. Incident reported by witnesses.",
        incident_date: "2026-06-22",
        status: "open",
        is_active: true,
        can_appeal: true
      };

      try {
        await axios.post(
          `${SUPABASE_URL}/rest/v1/student_discipline_cases`,
          caseData,
          { headers, timeout: 10000 }
        );
        console.log(`  ✓ Case created: EDEN-670033-2026-06-22`);
        console.log(`  ✓ Severity: CRITICAL (portal access BLOCKED)\n`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`  - Case already exists: EDEN-670033-2026-06-22\n`);
        } else {
          console.log(`  ⚠ Error: ${error.response?.data?.message || error.message}\n`);
        }
      }
    } else {
      console.log("  ✗ Student 670033 not found\n");
    }

    // Step 3: Verify
    console.log("Step 3: Verifying database...");
    
    const rulesCheck = await axios.get(
      `${SUPABASE_URL}/rest/v1/school_discipline_rules?tenant_id=eq.${EDEN_TENANT_ID}&select=count()`,
      { headers, timeout: 10000 }
    );

    const casesCheck = await axios.get(
      `${SUPABASE_URL}/rest/v1/student_discipline_cases?tenant_id=eq.${EDEN_TENANT_ID}&select=id,case_number`,
      { headers, timeout: 10000 }
    );

    console.log(`  ✓ Discipline Rules: ${rulesCheck.data?.length || '?'} configured`);
    console.log(`  ✓ Discipline Cases: ${casesCheck.data?.length || '?'} active`);
    if (casesCheck.data?.length > 0) {
      for (const c of casesCheck.data) {
        console.log(`    - ${c.case_number}`);
      }
    }
    console.log();

    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║  SETUP COMPLETE ✓                                          ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("NOW TEST IT:\n");
    console.log("1️⃣  STUDENT LOGIN (SHOULD BE BLOCKED):");
    console.log("    URL: https://system.tennahubapps.com/student/login");
    console.log("    School Code: eden-high-school-mqnereze");
    console.log("    Email: 670033@ttl.student");
    console.log("    Expected: DisciplineBlocked page (case EDEN-670033-2026-06-22)\n");

    console.log("2️⃣  SUBMIT APPEAL:");
    console.log("    Click 'Submit an Appeal' on blocked page");
    console.log("    Enter reason + evidence");
    console.log("    Expected: Success message\n");

    console.log("3️⃣  ADMIN REVIEW:");
    console.log("    URL: https://system.tennahubapps.com/business/discipline");
    console.log("    View cases, rules, and appeals");
    console.log("    Approve/reject appeals\n");

  } catch (error) {
    console.error("Fatal error:", error.message);
    if (error.response?.data) {
      console.error("Response:", error.response.data);
    }
    process.exit(1);
  }
}

createTestData();
