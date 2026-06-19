import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, otp, password } = await req.json();

    if (!email || !otp || !password) {
      return new Response(
        JSON.stringify({ error: "Email, OTP, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emailLower = email.toLowerCase();
    const otpHash = await sha256(otp);

    // Find the OTP record
    const { data: otpRecords, error: fetchError } = await supabaseAdmin
      .from("email_otps")
      .select("*")
      .eq("email", emailLower)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError || !otpRecords || otpRecords.length === 0) {
      return new Response(
        JSON.stringify({ error: "No verification code found. Please request a new one." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const record = otpRecords[0];

    // Check expiry
    if (new Date(record.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Verification code has expired. Please request a new one." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check attempts
    if (record.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many invalid attempts. Please request a new code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify OTP
    if (record.otp_hash !== otpHash) {
      // Increment attempts
      await supabaseAdmin
        .from("email_otps")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);

      const remaining = 4 - record.attempts;
      return new Response(
        JSON.stringify({
          error: remaining > 0
            ? `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            : "Too many invalid attempts. Please request a new code.",
          remainingAttempts: remaining,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const signupData = record.signup_data as {
      fullName: string;
      schoolName: string;
      phone?: string;
      schoolAddress?: string;
      businessType?: string;
      referralCode?: string;
    };

    // Create auth user
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: emailLower,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: signupData.fullName,
        phone: signupData.phone || null,
      },
    });

    if (createUserError || !createdUser?.user) {
      const msg = createUserError?.message?.toLowerCase() || "";
      if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
        return new Response(
          JSON.stringify({ error: "An account with this email already exists. Please login instead." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: createUserError?.message || "Failed to create account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const newUserId = createdUser.user.id;
    let tenantId: string | null = null;

    try {
      // Create tenant via SECURITY DEFINER function
      const { data: createdTenantId, error: tenantError } = await supabaseAdmin.rpc(
        "create_tenant_for_signup",
        {
          p_name: signupData.schoolName,
          p_business_type: signupData.businessType || "school",
          p_address: signupData.schoolAddress || null,
          p_phone: signupData.phone || null,
          p_email: emailLower,
          p_package_id: null,
          p_referred_by_code: signupData.referralCode || null,
        },
      );

      if (tenantError || !createdTenantId) {
        throw new Error(tenantError?.message || "Failed to create school");
      }
      tenantId = createdTenantId;

      // Create profile via SECURITY DEFINER function
      const { error: profileError } = await supabaseAdmin.rpc(
        "create_profile_for_signup",
        {
          p_user_id: newUserId,
          p_tenant_id: tenantId,
          p_full_name: signupData.fullName,
          p_phone: signupData.phone || null,
        },
      );

      if (profileError) {
        throw new Error(profileError.message || "Failed to create profile");
      }

      // Insert user_roles record
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: newUserId,
          role: "tenant_owner",
        });

      if (roleError) {
        console.error("Failed to insert user_roles:", roleError);
      }

      // Mark OTP as verified
      await supabaseAdmin
        .from("email_otps")
        .update({ verified: true })
        .eq("id", record.id);

      // Send welcome email
      const apiKey = Deno.env.get("RESEND_API_KEY");
      if (apiKey) {
        const welcomeHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <div style="text-align: center; padding: 32px 0;">
              <h1 style="font-size: 24px; color: #1a1a2e; margin: 0;">Welcome to TennaHub!</h1>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 32px;">
              <p style="font-size: 16px; color: #333;">Hi ${signupData.fullName},</p>
              <p style="color: #666; line-height: 1.6;">
                Your school <strong>${signupData.schoolName}</strong> has been registered successfully.
                You're now on a <strong>14-day free trial</strong>.
              </p>
              <p style="color: #666; line-height: 1.6;">
                You can log in and start setting up your school right away:
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${Deno.env.get("SITE_URL") || "https://tennahubapps.com"}/login"
                   style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px;
                          text-decoration: none; font-weight: 600; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>
            </div>
            <div style="text-align: center; padding: 24px; color: #999; font-size: 12px;">
              <p>TennaHub &mdash; School Management Platform</p>
            </div>
          </div>
        `;

        // Fire-and-forget — don't block signup on email
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "TennaHub <noreply@tennahubapps.com>",
            to: [emailLower],
            subject: `Welcome to TennaHub, ${signupData.fullName}!`,
            html: welcomeHtml,
          }),
        }).catch((e) => console.error("Welcome email send failed:", e));
      }

      // Clean up old OTP records for this email
      await supabaseAdmin
        .from("email_otps")
        .delete()
        .eq("email", emailLower)
        .neq("id", record.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Account created successfully!",
          tenantId,
          email: emailLower,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (e) {
      // Cleanup on failure
      if (tenantId) {
        try {
          await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
        } catch { /* ignore */ }
      }
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
      } catch { /* ignore */ }

      const message = e instanceof Error ? e.message : "Internal server error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("verify-signup-otp error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
