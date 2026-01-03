import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HASURA_ENDPOINT = Deno.env.get('HASURA_GRAPHQL_ENDPOINT');
    const HASURA_ADMIN_SECRET = Deno.env.get('HASURA_ADMIN_SECRET');

    if (!HASURA_ENDPOINT || !HASURA_ADMIN_SECRET) {
      console.error('Missing Hasura configuration');
      return new Response(
        JSON.stringify({ error: 'Hasura not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization');
    
    // Get the GraphQL query from request body
    const body = await req.json();

    // Build headers for Hasura request
    const hasuraHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      // If we have a JWT token, pass it to Hasura for role-based access
      hasuraHeaders['Authorization'] = authHeader;
    } else {
      // For unauthenticated requests, use admin secret with anonymous role
      hasuraHeaders['x-hasura-admin-secret'] = HASURA_ADMIN_SECRET;
      hasuraHeaders['x-hasura-role'] = 'anonymous';
    }

    console.log('Proxying request to Hasura:', HASURA_ENDPOINT);

    // Forward the request to Hasura
    const response = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: hasuraHeaders,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Hasura error:', data);
    }

    return new Response(
      JSON.stringify(data),
      { 
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Hasura proxy error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
