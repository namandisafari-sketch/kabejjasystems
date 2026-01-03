import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Firebase public keys URL
const FIREBASE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firebaseToken } = await req.json();

    if (!firebaseToken) {
      return new Response(
        JSON.stringify({ error: 'Firebase token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');
    const HASURA_ADMIN_SECRET = Deno.env.get('HASURA_ADMIN_SECRET');

    if (!FIREBASE_PROJECT_ID || !HASURA_ADMIN_SECRET) {
      console.error('Missing configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode the Firebase token (without full verification for now - you can add full verification later)
    const decodedToken = jose.decodeJwt(firebaseToken);
    
    console.log('Firebase token decoded for user:', decodedToken.sub);

    // Extract user info from Firebase token
    const userId = decodedToken.sub as string;
    const email = decodedToken.email as string;
    
    // Determine role - you'll need to fetch this from your Hasura database
    // For now, default to 'user' role
    let role = 'user';
    
    // You can add logic here to look up the user's role from Hasura
    // using the admin secret for internal queries

    // Create a Hasura-compatible JWT
    const hasuraClaims = {
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': ['admin', 'parent', 'worker', 'user', 'anonymous'],
        'x-hasura-default-role': role,
        'x-hasura-user-id': userId,
        'x-hasura-user-email': email,
      },
    };

    // Create a secret for signing (you should use a proper secret in production)
    const secret = new TextEncoder().encode(HASURA_ADMIN_SECRET);
    
    // Sign the JWT
    const hasuraToken = await new jose.SignJWT({
      sub: userId,
      email: email,
      ...hasuraClaims,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    console.log('Hasura JWT created for user:', userId);

    return new Response(
      JSON.stringify({ 
        hasuraToken,
        userId,
        email,
        role 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Token conversion failed';
    console.error('Firebase to Hasura token error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
