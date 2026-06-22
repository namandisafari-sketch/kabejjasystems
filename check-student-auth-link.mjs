#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ljgbjiixeoxxqpejnmjx.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStudentData() {
  try {
    console.log("🔍 Checking student data...\n");

    // Check if student with admission number 670033 exists
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, full_name, admission_number, user_id, notification_email, tenant_id")
      .eq("admission_number", "670033")
      .single();

    if (studentError) {
      console.error("❌ Error finding student:", studentError.message);
      return;
    }

    if (!student) {
      console.log("❌ No student found with admission number 670033");
      return;
    }

    console.log("✅ Student found:");
    console.log(`   Name: ${student.full_name}`);
    console.log(`   Admission: ${student.admission_number}`);
    console.log(`   Email: ${student.notification_email}`);
    console.log(`   Tenant ID: ${student.tenant_id}`);
    console.log(`   User ID: ${student.user_id || "(NOT SET)"}\n`);

    // Check the auth user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("❌ Error listing users:", usersError.message);
      return;
    }

    const authUser = users.find(u => u.email === student.notification_email);

    if (!authUser) {
      console.log("❌ No auth user found with email:", student.notification_email);
      console.log("\n📝 Solution: Need to create auth record for this student\n");
      return;
    }

    console.log("✅ Auth user found:");
    console.log(`   Auth User ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}\n`);

    // Check if user_id matches
    if (student.user_id === authUser.id) {
      console.log("✅ user_id MATCHES - everything is correct!");
    } else if (!student.user_id) {
      console.log("❌ Student record has NO user_id set!");
      console.log(`\n📝 Solution: Update student record with user_id = ${authUser.id}\n`);
      console.log("Run this SQL in Supabase dashboard:");
      console.log(`UPDATE public.students SET user_id = '${authUser.id}' WHERE admission_number = '670033';\n`);
    } else {
      console.log("❌ user_id MISMATCH!");
      console.log(`   Student has: ${student.user_id}`);
      console.log(`   Auth user has: ${authUser.id}`);
    }

  } catch (err) {
    console.error("💥 Error:", err.message);
  }
}

checkStudentData();
