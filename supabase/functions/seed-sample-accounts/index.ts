// One-shot: seeds sample repair shop + retail shop tenants with owner accounts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const samples = [
      {
        businessName: "FixIt Pro Repair Shop",
        businessType: "repair_shop",
        ownerName: "John Repair Owner",
        ownerEmail: "demo.repair@tennahub.app",
        ownerPhone: "+256700000001",
        location: "Kampala, Uganda",
        password: "Demo@2025!",
      },
      {
        businessName: "QuickMart Retail Shop",
        businessType: "retail",
        ownerName: "Mary Retail Owner",
        ownerEmail: "demo.retail@tennahub.app",
        ownerPhone: "+256700000002",
        location: "Kampala, Uganda",
        password: "Demo@2025!",
      },
    ];

    const results: any[] = [];

    for (const s of samples) {
      const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const businessCode =
        s.businessName.toLowerCase().replace(/\s+/g, "-").substring(0, 20) +
        "-" +
        Date.now().toString(36);

      // Check if user exists
      const { data: existing } = await admin.auth.admin.listUsers();
      const found = existing?.users?.find((u) => u.email === s.ownerEmail);

      let userId: string;
      if (found) {
        userId = found.id;
        // reset password to known value
        await admin.auth.admin.updateUserById(userId, { password: s.password, email_confirm: true });
      } else {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: s.ownerEmail,
          password: s.password,
          email_confirm: true,
          user_metadata: { full_name: s.ownerName, phone: s.ownerPhone },
        });
        if (cErr || !created?.user) {
          results.push({ email: s.ownerEmail, error: cErr?.message });
          continue;
        }
        userId = created.user.id;
      }

      // Check if tenant already linked via profile
      const { data: prof } = await admin.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
      let tenantId = prof?.tenant_id as string | null;

      if (!tenantId) {
        const { data: tenant, error: tErr } = await admin
          .from("tenants")
          .insert({
            name: s.businessName,
            business_type: s.businessType,
            status: "active",
            subscription_status: "trialing",
            trial_end_date: trialEnd,
            phone: s.ownerPhone,
            address: s.location,
            email: s.ownerEmail,
            business_code: businessCode,
            owner_email: s.ownerEmail,
            owner_password: s.password,
          })
          .select("id, business_code")
          .single();
        if (tErr || !tenant) {
          results.push({ email: s.ownerEmail, error: tErr?.message });
          continue;
        }
        tenantId = tenant.id;

        await admin.from("profiles").upsert({
          id: userId,
          tenant_id: tenantId,
          role: "tenant_owner",
          full_name: s.ownerName,
          phone: s.ownerPhone,
        });

        await admin.from("user_roles").insert({ user_id: userId, role: "tenant_owner" }).then(() => {});
      }

      results.push({
        businessName: s.businessName,
        businessType: s.businessType,
        email: s.ownerEmail,
        password: s.password,
        tenantId,
      });
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
