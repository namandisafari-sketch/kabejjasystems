-- Add school end time and early departure settings to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS school_end_time TIME DEFAULT '16:00:00';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS require_early_departure_reason BOOLEAN DEFAULT true;

-- Create early departure requests table
CREATE TABLE public.early_departure_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  requested_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  gate_checkin_id UUID REFERENCES gate_checkins(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.early_departure_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view tenant early departure requests"
ON public.early_departure_requests
FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can insert early departure requests"
ON public.early_departure_requests
FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can update early departure requests"
ON public.early_departure_requests
FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add index for performance
CREATE INDEX idx_early_departure_requests_tenant_status ON public.early_departure_requests(tenant_id, status);
CREATE INDEX idx_early_departure_requests_student ON public.early_departure_requests(student_id);