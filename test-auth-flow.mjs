#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ljgbjiixeoxxqpejnmjx.supabase.co";
const supabaseKey = "sb_publishable_tvuluLavd8x2hpeUyI6Jbw_dk3PO_da";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOTPFlow() {
  try {
    console.log("🧪 Testing OTP Authentication Flow\n");
    console.log("Step 1: Sending OTP to test email...");

    const { data, error } = await supabase.auth.signInWithOtp({
      email: "namandisafari@gmail.com",
      options: {
        emailRedirectTo: "https://system.tennahubapps.com/student/auth-callback?tenant=ef7a3391-cddd-434f-9422-e58ffda74953",
        data: {
          tenantId: "ef7a3391-cddd-434f-9422-e58ffda74953",
          schoolName: "EDEN HIGH SCHOOL",
        }
      }
    });

    if (error) {
      console.error("❌ OTP send failed:", error);
      return;
    }

    console.log("✅ OTP sent successfully!");
    console.log("📧 To: namandisafari@gmail.com");
    console.log("\nIMPORTANT: Check your email and COPY the magic link");
    console.log("Then run: node test-auth-link.mjs 'PASTE_MAGIC_LINK_HERE'");
    
  } catch (err) {
    console.error("💥 Error:", err);
  }
}

testOTPFlow();
