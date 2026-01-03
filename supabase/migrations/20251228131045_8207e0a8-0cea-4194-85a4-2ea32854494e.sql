
-- Create installation purchases table to track installation package orders
CREATE TABLE public.installation_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  
  -- Selected subscription package to start with
  selected_subscription_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  
  -- Payment details
  total_amount NUMERIC NOT NULL DEFAULT 950000,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_plan TEXT NOT NULL DEFAULT 'full', -- 'full', '2_installments', '3_installments'
  
  -- Free subscription period
  free_months INTEGER NOT NULL DEFAULT 2,
  subscription_start_date DATE,
  first_payment_due_date DATE, -- When customer starts paying subscription
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'deposit_paid', 'partially_paid', 'fully_paid', 'installed', 'active', 'refunded', 'cancelled'
  installation_date DATE,
  installation_notes TEXT,
  
  -- Refund policy
  satisfaction_confirmed BOOLEAN DEFAULT FALSE,
  satisfaction_confirmed_at TIMESTAMP WITH TIME ZONE,
  refund_requested BOOLEAN DEFAULT FALSE,
  refund_requested_at TIMESTAMP WITH TIME ZONE,
  refund_reason TEXT,
  refund_amount NUMERIC DEFAULT 0,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create installation payments table to track installment payments
CREATE TABLE public.installation_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installation_id UUID NOT NULL REFERENCES public.installation_purchases(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'mobile_money', 'bank_transfer'
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  installment_number INTEGER NOT NULL DEFAULT 1, -- 1st, 2nd, or 3rd payment
  reference_number TEXT,
  notes TEXT,
  received_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.installation_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for installation_purchases (admin only)
CREATE POLICY "Admins can manage installation purchases"
ON public.installation_purchases
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  )
);

-- RLS policies for installation_payments (admin only)
CREATE POLICY "Admins can manage installation payments"
ON public.installation_payments
FOR ALL
USING (
  installation_id IN (
    SELECT id FROM installation_purchases
    WHERE EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin')
    )
  )
);

-- Update trigger for updated_at
CREATE TRIGGER update_installation_purchases_updated_at
BEFORE UPDATE ON public.installation_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update packages table to mark subscription packages and add free_months field
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS free_months_with_installation INTEGER DEFAULT 2;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT TRUE;
