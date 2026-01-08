-- Add credit fields to customers table
ALTER TABLE public.customers 
ADD COLUMN credit_limit NUMERIC DEFAULT 0,
ADD COLUMN current_balance NUMERIC DEFAULT 0;

-- Create customer_payments table for payment collection tracking
CREATE TABLE public.customer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  received_by UUID REFERENCES auth.users(id),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_payments
CREATE POLICY "Users can view their tenant payments"
ON public.customer_payments FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert payments for their tenant"
ON public.customer_payments FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant payments"
ON public.customer_payments FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant payments"
ON public.customer_payments FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_customer_payments_customer ON public.customer_payments(customer_id);
CREATE INDEX idx_customer_payments_tenant ON public.customer_payments(tenant_id);
CREATE INDEX idx_customers_balance ON public.customers(tenant_id, current_balance) WHERE current_balance > 0;