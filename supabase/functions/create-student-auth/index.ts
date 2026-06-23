import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { admissionNumber, tenantId, fullName, studentId } = await req.json();

    if (!admissionNumber || !tenantId) {
      return new Response(JSON.stringify({ error: "admissionNumber and tenantId are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const virtualEmail = `${admissionNumber}@ttl.student`;

    // Check if auth user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === virtualEmail);

    if (existingUser) {
      // User exists - just update password to default
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: "alwaystry!" }
      );
      if (error) throw error;

      // Update student record to link user_id if not already set
      if (studentId) {
        const { data: student } = await supabaseAdmin
          .from("students")
          .select("user_id")
          .eq("id", studentId)
          .single();

        if (student && !student.user_id) {
          await supabaseAdmin
            .from("students")
            .update({ user_id: existingUser.id })
            .eq("id", studentId);
        }
      }

      return new Response(JSON.stringify({ 
        message: "User updated", 
        userId: existingUser.id, 
        email: virtualEmail,
        created: false 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create new auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: virtualEmail,
      password: "alwaystry!",
      email_confirm: true,
      user_metadata: {
        role: "student",
        tenant_id: tenantId,
        student_id: studentId,
        full_name: fullName || admissionNumber,
      },
    });

    if (createError) throw createError;

    // Link user_id to student record
    if (studentId && newUser?.user?.id) {
      await supabaseAdmin
        .from("students")
        .update({ user_id: newUser.user.id })
        .eq("id", studentId);
    }

    return new Response(JSON.stringify({ 
      message: "User created", 
      userId: newUser?.user?.id, 
      email: virtualEmail,
      created: true 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
