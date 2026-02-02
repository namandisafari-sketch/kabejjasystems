import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreateBusinessPayload = {
  businessName: string;
  businessType: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  location?: string;
  packageId?: string;
  trialDays?: string;
  notes?: string;
};

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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

    // Verify requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce admin-only access (server-side)
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      return new Response(JSON.stringify({ error: "Failed to verify admin role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = (roles || []).some((r) => r.role === "admin" || r.role === "superadmin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as CreateBusinessPayload;
    const { businessName, businessType, ownerName, ownerEmail } = payload;

    if (!businessName || !businessType || !ownerEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = generateTempPassword();
    const trialDays = Number.parseInt(payload.trialDays || "14", 10);
    const trialEndDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    const businessCode =
      businessName.toLowerCase().replace(/\s+/g, "-").substring(0, 20) + "-" + Date.now().toString(36);

    // 1) Create owner auth user (does NOT switch admin session)
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: tempPassword,
      // Auto-confirm email for admin-created accounts so owners can login immediately
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        phone: payload.ownerPhone || null,
      },
    });

    if (createUserError || !createdUser?.user) {
      // Check if user already exists
      const errorMessage = createUserError?.message || "Failed to create user";
      const isEmailExists = errorMessage.toLowerCase().includes("already") || 
                            errorMessage.toLowerCase().includes("registered") ||
                            errorMessage.toLowerCase().includes("exists");
      
      return new Response(JSON.stringify({ 
        error: isEmailExists 
          ? "A user with this email already exists. Please use a different email address or delete the existing account first."
          : errorMessage,
        code: isEmailExists ? "EMAIL_EXISTS" : "CREATE_USER_ERROR"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = createdUser.user.id;
    let tenantId: string | null = null;

    try {
      // 2) Create tenant
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .insert({
          name: businessName,
          business_type: businessType,
          status: "active",
          subscription_status: "trialing",
          trial_end_date: trialEndDate,
          phone: payload.ownerPhone || null,
          address: payload.location || null,
          email: ownerEmail,
          business_code: businessCode,
          owner_email: ownerEmail,
          owner_password: tempPassword,
        })
        .select("id, business_code")
        .single();

      if (tenantError || !tenant) throw new Error(tenantError?.message || "Failed to create tenant");
      tenantId = tenant.id;

      // 3) Create/Upsert profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: newUserId,
          tenant_id: tenantId,
          role: "tenant_owner",
          full_name: ownerName,
          phone: payload.ownerPhone || null,
        });

      if (profileError) throw new Error(profileError.message || "Failed to create profile");

      // 4) Assign role in user_roles
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: newUserId,
        role: "tenant_owner",
      });

      if (roleError) throw new Error(roleError.message || "Failed to assign role");

      return new Response(
        JSON.stringify({
          success: true,
          tenantId,
          businessCode: tenant.business_code,
          ownerEmail,
          tempPassword,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (e) {
      // Cleanup
      if (tenantId) {
        try {
          await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
        } catch {
          // ignore
        }
      }
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
      } catch {
        // ignore
      }
      const message = e instanceof Error ? e.message : "Internal server error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
