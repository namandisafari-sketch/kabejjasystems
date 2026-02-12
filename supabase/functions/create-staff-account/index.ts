import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the requesting user's auth from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the requesting user is authenticated and is a tenant owner
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get requesting user's profile to verify they're a tenant owner
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', requestingUser.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.role !== 'tenant_owner' && profile.role !== 'superadmin' && profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only tenant owners can create staff accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { action, email, password, full_name, phone, branch_id, allowed_modules, user_id, staff_type } = await req.json();

    // Handle password reset action
    if (action === 'reset_password') {
      if (!user_id || !password) {
        return new Response(
          JSON.stringify({ error: 'User ID and new password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the target user belongs to the same tenant
      const { data: targetProfile, error: targetError } = await supabaseAdmin
        .from('profiles')
        .select('tenant_id, full_name')
        .eq('id', user_id)
        .single();

      if (targetError || !targetProfile || targetProfile.tenant_id !== profile.tenant_id) {
        return new Response(
          JSON.stringify({ error: 'Staff member not found in your organization' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reset the password
      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: password,
      });

      if (resetError) {
        console.error('Error resetting password:', resetError);
        return new Response(
          JSON.stringify({ error: resetError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user email
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          full_name: targetProfile.full_name,
          email: userData?.user?.email || '',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default action: create new staff account
    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and full name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the user account
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        phone,
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create profile for the new user
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        tenant_id: profile.tenant_id,
        role: 'staff',
        full_name,
        phone,
      });

    if (profileInsertError) {
      console.error('Error creating profile:', profileInsertError);
      // Clean up the created user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create staff profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create staff permissions
    const { error: permissionsError } = await supabaseAdmin
      .from('staff_permissions')
      .insert({
        profile_id: newUser.user.id,
        tenant_id: profile.tenant_id,
        branch_id: branch_id || null,
        allowed_modules: allowed_modules || ['dashboard'],
        staff_type: staff_type || 'general',
      });

    if (permissionsError) {
      console.error('Error creating permissions:', permissionsError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile_id: newUser.user.id,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
