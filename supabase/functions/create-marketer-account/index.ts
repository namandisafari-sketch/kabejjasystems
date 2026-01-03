import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to decode JWT payload without verification
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use self-hosted Supabase instance for all operations
    const supabaseUrl = 'https://kabejjasystems.store';
    const serviceRoleKey = Deno.env.get('SELF_HOSTED_SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Connecting to self-hosted Supabase:', supabaseUrl);
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Decode the JWT to get user ID (skip signature verification since verify_jwt is false)
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.sub) {
      console.log('Failed to decode JWT payload');
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = payload.sub;
    console.log('Decoded user ID from JWT:', userId);

    // Check if user is admin in self-hosted database
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'superadmin'])
      .maybeSingle();

    const isAdmin = roleData || profileData?.role === 'superadmin' || profileData?.role === 'admin';

    console.log('Admin check - profile:', profileData, 'role:', roleData, 'isAdmin:', isAdmin);

    if (!isAdmin) {
      console.log('User is not admin:', userId);
      return new Response(
        JSON.stringify({ error: 'Only admins can create marketer accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified:', userId);

    const { email, password, name, phone, daily_rate } = await req.json();

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user account in self-hosted auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, phone }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created user:', newUser.user.id);

    // Add marketer role to user_roles in self-hosted DB
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'marketer'
      });

    if (roleInsertError) {
      console.error('Error adding marketer role:', roleInsertError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to assign marketer role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create marketer record with user_id in self-hosted DB
    const referralCode = "MKT" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: marketer, error: marketerError } = await supabaseAdmin
      .from('marketers')
      .insert({
        user_id: newUser.user.id,
        name,
        email,
        phone: phone || null,
        daily_rate: daily_rate || 0,
        referral_code: referralCode,
      })
      .select()
      .single();

    if (marketerError) {
      console.error('Error creating marketer:', marketerError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create marketer record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully created marketer:', marketer.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        marketer,
        user_id: newUser.user.id,
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
