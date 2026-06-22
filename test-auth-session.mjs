#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ljgbjiixeoxxqpejnmjx.supabase.co";
const supabaseKey = "sb_publishable_tvuluLavd8x2hpeUyI6Jbw_dk3PO_da";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSession() {
  try {
    console.log("🔍 Checking current session...\n");

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ Session error:", error);
      return;
    }

    if (!data.session) {
      console.log("❌ No active session found");
      console.log("\nThis is EXPECTED if you haven't completed the OTP flow yet.");
      console.log("Follow these steps:");
      console.log("1. Run: node test-auth-flow.mjs");
      console.log("2. Check your email for the magic link");
      console.log("3. Manually visit the magic link in your browser");
      console.log("4. Then run this script again from the same browser session");
      return;
    }

    console.log("✅ Active session found!");
    console.log("\nSession details:");
    console.log("- User ID:", data.session.user.id);
    console.log("- Email:", data.session.user.email);
    console.log("- Auth method:", data.session.user.app_metadata?.provider);
    console.log("- Last sign in:", data.session.user.last_sign_in_at);

  } catch (err) {
    console.error("💥 Error:", err);
  }
}

testSession();
