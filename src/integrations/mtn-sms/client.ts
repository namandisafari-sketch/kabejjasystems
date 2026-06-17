import type {
  MtnOAuthTokenResponse,
  OutboundSmsMessageRequest,
  ResourceReference,
  ShortCodeSubscription,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
  OutboundSubscriptionDeleteResponse,
  MtnApiError,
} from "./types";

const MTN_BASE_URL = import.meta.env.VITE_MTN_API_BASE_URL ?? "https://api.mtn.com";
const MTN_TOKEN_URL = `${MTN_BASE_URL}/v1/oauth/access_token/accesstoken?grant_type=client_credentials`;
const MTN_SMS_BASE = `${MTN_BASE_URL}/v3/sms`;
const MTN_CLIENT_ID = import.meta.env.VITE_MTN_CLIENT_ID;
const MTN_CLIENT_SECRET = import.meta.env.VITE_MTN_CLIENT_SECRET;

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  if (!MTN_CLIENT_ID || !MTN_CLIENT_SECRET) {
    throw new Error(
      "MTN SMS integration error: VITE_MTN_CLIENT_ID and VITE_MTN_CLIENT_SECRET must be set in .env"
    );
  }

  const basicAuth = btoa(`${MTN_CLIENT_ID}:${MTN_CLIENT_SECRET}`);

  const response = await fetch(MTN_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`MTN OAuth failed: ${response.status} ${response.statusText}`);
  }

  const data: MtnOAuthTokenResponse = await response.json();

  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${MTN_SMS_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const body = await response.json();

  if (!response.ok) {
    const error = body as MtnApiError;
    throw new Error(
      `MTN API error [${error.statusCode}]: ${error.statusMessage}${error.supportMessage ? ` — ${error.supportMessage}` : ""}`
    );
  }

  return body as T;
}

export async function sendSms(
  request: OutboundSmsMessageRequest
): Promise<ResourceReference> {
  return apiRequest<ResourceReference>("/messages/sms/outbound", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function createSubscription(
  subscription: ShortCodeSubscription,
  transactionId?: string
): Promise<SubscriptionResponse> {
  return apiRequest<SubscriptionResponse>("/messages/sms/subscription", {
    method: "POST",
    headers: {
      ...(transactionId ? { transactionId } : {}),
    },
    body: JSON.stringify(subscription),
  });
}

export async function updateSubscription(
  subscriptionId: string,
  updates: UpdateSubscriptionRequest,
  transactionId?: string
): Promise<SubscriptionResponse> {
  return apiRequest<SubscriptionResponse>(
    `/messages/sms/subscription/${subscriptionId}`,
    {
      method: "PATCH",
      headers: {
        ...(transactionId ? { transactionId } : {}),
      },
      body: JSON.stringify(updates),
    }
  );
}

export async function deleteSubscription(
  subscriptionId: string,
  transactionId?: string
): Promise<OutboundSubscriptionDeleteResponse> {
  return apiRequest<OutboundSubscriptionDeleteResponse>(
    `/messages/sms/subscription/${subscriptionId}`,
    {
      method: "DELETE",
      headers: {
        ...(transactionId ? { transactionId } : {}),
      },
    }
  );
}

export function clearTokenCache(): void {
  cachedToken = null;
}

export { getAccessToken };
