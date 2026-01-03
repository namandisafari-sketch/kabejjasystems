-- Create staff_invitations table
CREATE TABLE public.staff_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  allowed_modules TEXT[] NOT NULL DEFAULT '{}',
  invited_by UUID REFERENCES public.profiles(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for staff_invitations
CREATE POLICY "Tenant owners can manage invitations"
ON public.staff_invitations
FOR ALL
USING (tenant_id IN (
  SELECT profiles.tenant_id FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('tenant_owner', 'superadmin', 'admin')
));

CREATE POLICY "Anyone can view invitation by token"
ON public.staff_invitations
FOR SELECT
USING (true);

-- Update trigger
CREATE TRIGGER update_staff_invitations_updated_at
  BEFORE UPDATE ON public.staff_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();