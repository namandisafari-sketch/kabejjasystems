-- Accounting System Tables (skip payroll_records as it exists)

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  sub_type VARCHAR(50),
  balance DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, account_code)
);

-- General Ledger
CREATE TABLE IF NOT EXISTS public.general_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transaction_type VARCHAR(50) NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_number VARCHAR(100),
  debit_account VARCHAR(100),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_account VARCHAR(100),
  credit_amount DECIMAL(15,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  modified_by UUID REFERENCES auth.users(id),
  modified_at TIMESTAMP WITH TIME ZONE,
  approval_status VARCHAR(20) DEFAULT 'approved',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transaction Audit Trail
CREATE TABLE IF NOT EXISTS public.transaction_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  general_ledger_id UUID REFERENCES public.general_ledger(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank Accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_name VARCHAR(200) NOT NULL,
  bank_name VARCHAR(200),
  account_number VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'UGX',
  balance DECIMAL(15,2) DEFAULT 0,
  is_reconciled BOOLEAN DEFAULT FALSE,
  last_reconciliation_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Valuation
CREATE TABLE IF NOT EXISTS public.inventory_valuation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  valuation_method VARCHAR(20) DEFAULT 'WEIGHTED_AVG',
  quantity_on_hand INTEGER DEFAULT 0,
  unit_cost DECIMAL(15,4) DEFAULT 0,
  total_value DECIMAL(15,2) DEFAULT 0,
  as_of_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax Tracking
CREATE TABLE IF NOT EXISTS public.tax_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tax_type VARCHAR(50) NOT NULL,
  transaction_id UUID,
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL,
  tax_base DECIMAL(15,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  payment_date DATE,
  reference_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Statements Cache
CREATE TABLE IF NOT EXISTS public.financial_statements_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  statement_type VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  statement_json JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_valuation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_statements_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant chart of accounts" ON public.chart_of_accounts
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert chart of accounts for their tenant" ON public.chart_of_accounts
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant chart of accounts" ON public.chart_of_accounts
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their tenant ledger entries" ON public.general_ledger
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert ledger entries for their tenant" ON public.general_ledger
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant ledger entries" ON public.general_ledger
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their tenant audit trail" ON public.transaction_audit_trail
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert audit trail for their tenant" ON public.transaction_audit_trail
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage bank accounts" ON public.bank_accounts
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage inventory valuation" ON public.inventory_valuation
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage tax records" ON public.tax_tracking
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage statements" ON public.financial_statements_cache
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_general_ledger_tenant_date ON public.general_ledger(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_general_ledger_transaction_type ON public.general_ledger(tenant_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_general_ledger_reference ON public.general_ledger(tenant_id, reference_id);
CREATE INDEX IF NOT EXISTS idx_tax_tracking_tenant_type ON public.tax_tracking(tenant_id, tax_type);
CREATE INDEX IF NOT EXISTS idx_statements_tenant_type ON public.financial_statements_cache(tenant_id, statement_type);

-- Update triggers
DROP TRIGGER IF EXISTS update_chart_of_accounts_updated_at ON public.chart_of_accounts;
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tax_tracking_updated_at ON public.tax_tracking;
CREATE TRIGGER update_tax_tracking_updated_at BEFORE UPDATE ON public.tax_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();