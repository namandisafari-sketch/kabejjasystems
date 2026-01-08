-- Create visitor_register table for tracking visitors
CREATE TABLE public.visitor_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  phone TEXT,
  id_number TEXT,
  purpose TEXT NOT NULL,
  visiting_who TEXT,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  badge_number TEXT,
  notes TEXT,
  checked_in_by UUID,
  checked_out_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitor_register ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant visitors"
ON public.visitor_register FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert visitors for their tenant"
ON public.visitor_register FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update their tenant visitors"
ON public.visitor_register FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete their tenant visitors"
ON public.visitor_register FOR DELETE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_visitor_register_tenant_date ON public.visitor_register(tenant_id, check_in_time DESC);

-- Insert visitor_register module
INSERT INTO business_modules (code, name, description, icon, category, is_core, is_active, display_order, applicable_business_types)
VALUES ('visitor_register', 'Visitor Register', 'Track and manage school visitors', 'ClipboardList', 'school', false, true, 26, ARRAY['school', 'secondary_school', 'primary_school', 'kindergarten'])
ON CONFLICT (code) DO UPDATE SET is_active = true;

-- Enable for all school-type tenants
INSERT INTO tenant_modules (tenant_id, module_code, is_enabled)
SELECT t.id, 'visitor_register', true
FROM tenants t
WHERE t.business_type IN ('school', 'secondary_school', 'primary_school', 'kindergarten')
ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_enabled = true;