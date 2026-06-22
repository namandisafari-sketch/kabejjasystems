#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ljgbjiixeoxxqpejnmjx.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2JqaWl4ZW94eHFwZWpubWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY5NjY3NywiZXhwIjoyMDk3MjcyNjc3fQ.KKWb1GgbDTF1hVrYJ5mf6LTNB2bEBKaAY2Jx4-ispLo";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSendEmail() {
  try {
    console.log("🚀 Testing Resend email function...\n");

    const magicLinkUrl = "https://system.tennahubapps.com/student/auth-callback?tenant=ef7a3391-cddd-434f-9422-e58ffda74953";

    const { data, error } = await supabase.functions.invoke(
      "send-student-login-email",
      {
        body: {
          email: "namandisafari@gmail.com",
          studentName: "KATENDE KEVIN",
          schoolName: "EDEN HIGH SCHOOL",
          magicLinkUrl: magicLinkUrl,
          expiresInMinutes: 1440,
        },
      }
    );

    if (error) {
      console.error("❌ Error:", error);
      return;
    }

    console.log("✅ Email sent successfully!");
    console.log("📧 To: namandisafari@gmail.com");
    console.log("👤 Student: KATENDE KEVIN");
    console.log("🏫 School: EDEN HIGH SCHOOL");
    console.log("🔗 Magic Link: ", magicLinkUrl);
    console.log("\nResponse:", data);
  } catch (err) {
    console.error("💥 Unexpected error:", err);
  }
}

testSendEmail();
