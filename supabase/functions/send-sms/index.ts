import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MTN_AUTH_URL = "https://proxy.momoapi.mtn.com/collection/token/";
const MTN_API_URL = "https://proxy.momoapi.mtn.com/collection/v1_0/";

interface SmsRequest {
  phone: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: SmsRequest = await req.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get("MTN_CLIENT_ID");
    const clientSecret = Deno.env.get("MTN_CLIENT_SECRET");
    const subscriptionKey = Deno.env.get("MTN_SUBSCRIPTION_KEY");
    const shortCode = Deno.env.get("MTN_SHORT_CODE");

    if (!clientId || !clientSecret || !subscriptionKey || !shortCode) {
      return new Response(
        JSON.stringify({ error: "MTN API not configured on server" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Get OAuth2 token from MTN
    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch(MTN_AUTH_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Content-Type": "application/json",
      },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return new Response(
        JSON.stringify({ error: "MTN auth failed", detail: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Send SMS via MTN v3 API
    const smsRes = await fetch(`${MTN_API_URL}sms/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "X-Target-Operator": "MTN",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: shortCode,
        to: [phone],
        text: message,
        registeredDelivery: true,
      }),
    });

    if (!smsRes.ok) {
      const errText = await smsRes.text();
      return new Response(
        JSON.stringify({ error: "MTN SMS send failed", detail: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const smsData = await smsRes.json();

    return new Response(
      JSON.stringify({ success: true, data: smsData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
