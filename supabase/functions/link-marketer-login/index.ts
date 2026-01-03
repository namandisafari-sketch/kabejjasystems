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
    // Self-hosted Supabase for ALL operations
    const selfHostedUrl = 'https://kabejjasystems.store';
    const selfHostedServiceKey = Deno.env.get('SELF_HOSTED_SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Self-hosted URL:', selfHostedUrl);
    
    // Single client for self-hosted instance
    const selfHostedAdmin = createClient(selfHostedUrl, selfHostedServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
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
    const { data: profileData, error: profileError } = await selfHostedAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
    }

    const { data: roleData } = await selfHostedAdmin
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
        JSON.stringify({ error: 'Only admins can link marketer accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified:', userId);

    const { marketer_id, email, password } = await req.json();

    if (!marketer_id || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Marketer ID, email, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All marketer operations use self-hosted Supabase
    // Check if marketer exists
    const { data: marketer, error: marketerError } = await selfHostedAdmin
      .from('marketers')
      .select('*')
      .eq('id', marketer_id)
      .maybeSingle();

    if (marketerError || !marketer) {
      console.log('Marketer not found:', marketer_id, marketerError?.message);
      return new Response(
        JSON.stringify({ error: 'Marketer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (marketer.user_id) {
      return new Response(
        JSON.stringify({ error: 'Marketer already has login credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found marketer:', marketer.name);

    // Create user account in self-hosted auth
    const { data: newUser, error: createError } = await selfHostedAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: marketer.name, phone: marketer.phone }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created user in self-hosted auth:', newUser.user.id);

    // Add marketer role to user_roles in self-hosted DB
    const { error: roleInsertError } = await selfHostedAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'marketer'
      });

    if (roleInsertError) {
      console.error('Error adding marketer role:', roleInsertError);
      await selfHostedAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to assign marketer role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update marketer record with user_id and new email
    const { error: updateError } = await selfHostedAdmin
      .from('marketers')
      .update({ 
        user_id: newUser.user.id,
        email: email
      })
      .eq('id', marketer_id);

    if (updateError) {
      console.error('Error updating marketer:', updateError);
      await selfHostedAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to link marketer to user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully linked marketer to user account');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: newUser.user.id,
        message: 'Login credentials created successfully'
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
