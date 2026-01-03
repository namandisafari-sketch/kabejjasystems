import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the requesting user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin or superadmin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "superadmin"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tenantId, reason } = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch tenant details
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Collect all tenant data for backup
    const backupData: Record<string, unknown> = {
      tenant,
      collectedAt: new Date().toISOString(),
    };

    // List of tables with tenant_id to backup
    const tablesToBackup = [
      "profiles",
      "employees",
      "branches",
      "products",
      "categories",
      "customers",
      "sales",
      "sale_items",
      "students",
      "parents",
      "parent_students",
      "school_classes",
      "subjects",
      "academic_terms",
      "fee_structures",
      "student_fees",
      "fee_payments",
      "student_report_cards",
      "report_card_subjects",
      "ecd_report_cards",
      "ecd_learning_areas",
      "ecd_learning_ratings",
      "expenses",
      "suppliers",
      "purchase_orders",
      "repair_jobs",
      "gate_checkins",
      "discipline_cases",
      "staff_permissions",
      "staff_invitations",
      "rental_properties",
      "rental_units",
      "rental_tenants",
      "leases",
      "rental_payments",
      "maintenance_requests",
    ];

    // Backup data from each table
    for (const tableName of tablesToBackup) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select("*")
          .eq("tenant_id", tenantId);

        if (!error && data && data.length > 0) {
          backupData[tableName] = data;
        }
      } catch {
        // Table might not exist or have different structure, skip
        console.log(`Skipping table ${tableName}`);
      }
    }

    // Get user IDs from profiles to delete auth users later
    const { data: userProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenantId);

    const userIds = userProfiles?.map((p) => p.id) || [];

    // Store backup
    const { error: backupError } = await supabaseAdmin
      .from("tenant_backups")
      .insert({
        tenant_id: tenantId,
        tenant_name: tenant.name,
        business_type: tenant.business_type,
        backup_data: backupData,
        deleted_by: user.id,
        reason: reason || "No reason provided",
      });

    if (backupError) {
      console.error("Backup error:", backupError);
      return new Response(
        JSON.stringify({ error: "Failed to create backup: " + backupError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now delete data from all tables (in reverse order due to foreign keys)
    const tablesToDelete = [...tablesToBackup].reverse();

    for (const tableName of tablesToDelete) {
      try {
        await supabaseAdmin
          .from(tableName)
          .delete()
          .eq("tenant_id", tenantId);
      } catch (e) {
        console.log(`Error deleting from ${tableName}:`, e);
      }
    }

    // Delete auth users associated with this tenant
    for (const userId of userIds) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (e) {
        console.log(`Error deleting auth user ${userId}:`, e);
      }
    }

    // Finally delete the tenant
    const { error: deleteError } = await supabaseAdmin
      .from("tenants")
      .delete()
      .eq("id", tenantId);

    if (deleteError) {
      console.error("Tenant delete error:", deleteError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete tenant (backup was created): " + deleteError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Tenant "${tenant.name}" deleted successfully. Backup created.`,
        backupId: tenantId,
        deletedUsers: userIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
