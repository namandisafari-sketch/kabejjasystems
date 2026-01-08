
-- Add fee_balance_threshold to tenants for controlling when parents can view reports
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS fee_balance_threshold numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

-- Create send_home_records table for marking students to be sent home
CREATE TABLE IF NOT EXISTS public.send_home_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  send_home_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  reason_category text NOT NULL DEFAULT 'fees', -- fees, discipline, health, other
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  notified_parent boolean DEFAULT false,
  notified_at timestamp with time zone,
  gate_blocked boolean DEFAULT true,
  cleared_by uuid REFERENCES auth.users(id),
  cleared_at timestamp with time zone,
  cleared_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_send_home_records_tenant_date ON public.send_home_records(tenant_id, send_home_date);
CREATE INDEX IF NOT EXISTS idx_send_home_records_student_active ON public.send_home_records(student_id, is_active);

-- Enable RLS
ALTER TABLE public.send_home_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for send_home_records
CREATE POLICY "Users can view their tenant send home records"
ON public.send_home_records
FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert send home records for their tenant"
ON public.send_home_records
FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update their tenant send home records"
ON public.send_home_records
FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete their tenant send home records"
ON public.send_home_records
FOR DELETE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_send_home_records_updated_at
BEFORE UPDATE ON public.send_home_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
