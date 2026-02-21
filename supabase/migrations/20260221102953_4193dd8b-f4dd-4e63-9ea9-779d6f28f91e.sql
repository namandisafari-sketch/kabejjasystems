
-- SchoolPay settings per tenant
CREATE TABLE public.schoolpay_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  school_code TEXT NOT NULL,
  api_password TEXT NOT NULL,
  webhook_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_reconcile BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- SchoolPay transactions log
CREATE TABLE public.schoolpay_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  schoolpay_receipt_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  student_name TEXT,
  student_payment_code TEXT,
  student_registration_number TEXT,
  student_class TEXT,
  payment_channel TEXT,
  settlement_bank TEXT,
  transaction_id TEXT,
  payment_date TIMESTAMPTZ,
  transaction_type TEXT NOT NULL DEFAULT 'SCHOOL_FEES',
  supplementary_fee_description TEXT,
  raw_payload JSONB,
  -- Reconciliation
  matched_student_id UUID REFERENCES public.students(id),
  fee_payment_id UUID REFERENCES public.fee_payments(id),
  reconciliation_status TEXT NOT NULL DEFAULT 'pending',
  reconciled_at TIMESTAMPTZ,
  reconciliation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, schoolpay_receipt_number)
);

-- Add SchoolPay payment code to students for matching
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS schoolpay_payment_code TEXT;
CREATE INDEX IF NOT EXISTS idx_students_schoolpay_code ON public.students(schoolpay_payment_code) WHERE schoolpay_payment_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schoolpay_transactions_tenant ON public.schoolpay_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schoolpay_transactions_status ON public.schoolpay_transactions(reconciliation_status);

-- RLS
ALTER TABLE public.schoolpay_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schoolpay_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can manage their schoolpay settings" ON public.schoolpay_settings
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant users can view their schoolpay transactions" ON public.schoolpay_transactions
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Service role needs insert access for webhook (no auth)
CREATE POLICY "Service role can insert schoolpay transactions" ON public.schoolpay_transactions
  FOR INSERT WITH CHECK (true);
