// Pesapal API v3.0 Type Definitions

export interface PesapalAuthResponse {
  token: string;
  expiryDate: string;
  error: string | null;
  status: string;
  message: string;
}

export interface PesapalIPNRegistration {
  url: string;
  ipn_notification_type: 'GET' | 'POST';
}

export interface PesapalIPNResponse {
  url: string;
  created_date: string;
  ipn_id: string;
  error: string | null;
  status: string;
}

export interface PesapalOrderRequest {
  id: string; // Merchant reference (unique)
  currency: string; // e.g., "UGX"
  amount: number;
  description: string;
  callback_url: string;
  notification_id: string; // IPN ID from registration
  billing_address: {
    email_address: string;
    phone_number: string;
    country_code: string; // e.g., "UG"
    first_name: string;
    middle_name?: string;
    last_name: string;
    line_1?: string;
    line_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    zip_code?: string;
  };
}

export interface PesapalOrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
  error: string | null;
  status: string;
}

export interface PesapalTransactionStatus {
  payment_method: string;
  amount: number;
  created_date: string;
  confirmation_code: string;
  payment_status_description: string;
  description: string;
  message: string;
  payment_account: string;
  call_back_url: string;
  status_code: number; // 0=Invalid, 1=Success, 2=Failed, 3=Reversed
  merchant_reference: string;
  payment_status_code: string;
  currency: string;
  error: string | null;
  status: string;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'reversed';

export interface PaymentRecord {
  id: string;
  tenant_id: string;
  package_id: string;
  pesapal_tracking_id: string;
  pesapal_merchant_reference: string;
  amount: number;
  currency: string;
  payment_status: PaymentStatus;
  payment_method?: string;
  confirmation_code?: string;
  billing_email: string;
  billing_phone: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPackage {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
  billing_cycle_months: number; // 1 for monthly, 12 for yearly
}
