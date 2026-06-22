#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ljgbjiixeoxxqpejnmjx.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStudentUserId() {
  try {
    console.log("🔧 Fixing student user_id...\n");

    // Update the student record with the correct auth user_id
    const { error } = await supabase
      .from("students")
      .update({ user_id: "c69dc63f-58ab-4626-b135-601cddba4aae" })
      .eq("admission_number", "670033")
      .eq("tenant_id", "ef7a3391-cddd-434f-9422-e58ffda74953");

    if (error) {
      console.error("❌ Error updating student:", error.message);
      return;
    }

    console.log("✅ Student user_id updated successfully!\n");
    console.log("Updated:");
    console.log("  Admission Number: 670033");
    console.log("  Student: KATENDE KEVIN");
    console.log("  New user_id: c69dc63f-58ab-4626-b135-601cddba4aae\n");
    console.log("Now test the login again:");
    console.log("  1. Go to https://system.tennahubapps.com/student/login");
    console.log("  2. School Code: ED7890");
    console.log("  3. Admission: 670033");
    console.log("  4. Check email and click the link");

  } catch (err) {
    console.error("💥 Error:", err.message);
  }
}

fixStudentUserId();
