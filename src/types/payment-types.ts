/**
 * Payment and subscription related types
 */

export interface SubscriptionPackage {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  features: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRequest {
  id: string;
  tenant_id: string;
  package_id: string;
  billing_cycle: 'monthly' | 'yearly';
  amount: number;
  billing_email: string;
  billing_phone: string;
  first_name: string;
  last_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}
