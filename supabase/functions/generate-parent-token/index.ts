import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, tenant_id } = await req.json();
    if (!phone || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "phone and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const password = phone.slice(-8);
    const email = `${phone.replace(/[+\s-]/g, "")}@parent.portal`;

    // Look up existing parent
    const { data: parent } = await supabase
      .from('parents')
      .select('id, user_id')
      .eq('phone', phone)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    let userId: string;
    let userEmail: string;

    if (parent?.user_id) {
      // Parent exists — get their auth user email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(parent.user_id);
      if (authError) throw authError;
      if (!authUser?.user) throw new Error("Auth user not found");

      userId = parent.user_id;
      userEmail = authUser.user.email || email;

      // Reset password so parent can sign in with it
      const { error: resetError } = await supabase.auth.admin.updateUserById(userId, { password });
      if (resetError) throw resetError;
    } else {
      // Create new auth user + parents record
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Parent", phone, role: "parent", tenant_id },
      });
      if (signUpError) throw signUpError;
      userId = signUpData.user.id;
      userEmail = email;

      const { error: insertError } = await supabase.from("parents").insert({
        user_id: userId,
        tenant_id,
        full_name: "Parent",
        phone,
      });
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ email: userEmail, password, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
