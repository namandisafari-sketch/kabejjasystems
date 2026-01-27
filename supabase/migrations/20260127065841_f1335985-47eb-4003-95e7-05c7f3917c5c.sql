-- Requisition approval levels enum
CREATE TYPE public.requisition_status AS ENUM (
  'draft',
  'pending_level1',
  'pending_level2', 
  'pending_level3',
  'approved',
  'partially_approved',
  'rejected',
  'cancelled'
);

-- Requisition types enum
CREATE TYPE public.requisition_type AS ENUM (
  'cash_advance',
  'reimbursement',
  'purchase_request'
);

-- Requisition approver roles
CREATE TYPE public.approver_role AS ENUM (
  'hod',
  'bursar',
  'head_teacher',
  'director',
  'admin'
);

-- Requisitions table
CREATE TABLE public.requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  requisition_number TEXT NOT NULL,
  requisition_type requisition_type NOT NULL DEFAULT 'cash_advance',
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  department TEXT,
  purpose TEXT NOT NULL,
  description TEXT,
  amount_requested NUMERIC(15,2) NOT NULL,
  amount_approved NUMERIC(15,2),
  currency TEXT DEFAULT 'UGX',
  status requisition_status NOT NULL DEFAULT 'draft',
  current_approval_level INTEGER DEFAULT 0,
  max_approval_levels INTEGER DEFAULT 2,
  urgency TEXT DEFAULT 'normal', -- low, normal, high, urgent
  supporting_documents TEXT[], -- Array of file URLs
  expense_category TEXT,
  budget_code TEXT,
  payment_method TEXT, -- cash, bank_transfer, mobile_money
  bank_details JSONB, -- for bank transfers
  mobile_money_details JSONB, -- for mobile money
  expected_date DATE,
  actual_payment_date DATE,
  receipt_submitted BOOLEAN DEFAULT false,
  receipt_urls TEXT[],
  rejection_reason TEXT,
  cancelled_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Requisition approval workflow
CREATE TABLE public.requisition_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE NOT NULL,
  approval_level INTEGER NOT NULL,
  approver_role approver_role NOT NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  amount_approved NUMERIC(15,2),
  comments TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Requisition workflow settings per tenant
CREATE TABLE public.requisition_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  approval_levels INTEGER DEFAULT 2,
  level1_role approver_role DEFAULT 'bursar',
  level1_label TEXT DEFAULT 'Bursar Approval',
  level2_role approver_role DEFAULT 'head_teacher',
  level2_label TEXT DEFAULT 'Head Teacher Approval',
  level3_role approver_role,
  level3_label TEXT,
  auto_approve_below NUMERIC(15,2), -- Auto-approve amounts below this
  require_receipt_for_advance BOOLEAN DEFAULT true,
  max_advance_amount NUMERIC(15,2),
  expense_categories TEXT[] DEFAULT ARRAY['Stationery', 'Transport', 'Meals', 'Repairs', 'Supplies', 'Events', 'Other'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Requisition comments/activity log
CREATE TABLE public.requisition_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  requisition_id UUID REFERENCES public.requisitions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL, -- created, submitted, approved, rejected, commented, updated, cancelled
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for requisitions
CREATE POLICY "Users can view requisitions in their tenant"
ON public.requisitions FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create requisitions"
ON public.requisitions FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Requester or approvers can update requisitions"
ON public.requisitions FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Only admin can delete requisitions"
ON public.requisitions FOR DELETE
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('superadmin', 'admin', 'tenant_owner'))
);

-- RLS Policies for approvals
CREATE POLICY "Users can view approvals in their tenant"
ON public.requisition_approvals FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Approvers can manage approvals"
ON public.requisition_approvals FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for settings
CREATE POLICY "Users can view requisition settings"
ON public.requisition_settings FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage requisition settings"
ON public.requisition_settings FOR ALL
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('superadmin', 'admin', 'tenant_owner'))
);

-- RLS Policies for activity
CREATE POLICY "Users can view activity in their tenant"
ON public.requisition_activity FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create activity"
ON public.requisition_activity FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Generate requisition number function
CREATE OR REPLACE FUNCTION public.generate_requisition_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  req_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO req_count 
  FROM public.requisitions 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.requisition_number := 'REQ-' || year_prefix || '-' || LPAD(req_count::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

-- Create trigger for requisition number
DROP TRIGGER IF EXISTS set_requisition_number ON public.requisitions;
CREATE TRIGGER set_requisition_number
  BEFORE INSERT ON public.requisitions
  FOR EACH ROW
  EXECUTE FUNCTION generate_requisition_number();

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_requisitions_updated_at ON public.requisitions;
CREATE TRIGGER update_requisitions_updated_at
  BEFORE UPDATE ON public.requisitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requisition_settings_updated_at ON public.requisition_settings;
CREATE TRIGGER update_requisition_settings_updated_at
  BEFORE UPDATE ON public.requisition_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add requisition module to business_modules
INSERT INTO public.business_modules (code, name, description, category, icon, is_core, is_active, applicable_business_types)
VALUES (
  'requisitions',
  'Requisitions',
  'Staff requisition and approval workflow for cash advances, reimbursements, and purchases',
  'core',
  'FileText',
  false,
  true,
  ARRAY['school', 'kindergarten', 'restaurant', 'hotel', 'pharmacy', 'repair', 'salon', 'retail', 'rental']
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  applicable_business_types = EXCLUDED.applicable_business_types;