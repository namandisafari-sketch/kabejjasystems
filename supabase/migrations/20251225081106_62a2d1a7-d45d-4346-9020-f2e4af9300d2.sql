-- Add branch_limit to packages table
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS branch_limit integer DEFAULT 1;

-- Update existing packages with branch limits
UPDATE public.packages SET branch_limit = 1 WHERE name = 'Starter';
UPDATE public.packages SET branch_limit = 3 WHERE name = 'Business';
UPDATE public.packages SET branch_limit = 10 WHERE name = 'Enterprise';

-- Add branch_id to employees table for department assignment
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Create staff_permissions table for controlling page access
CREATE TABLE IF NOT EXISTS public.staff_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    allowed_modules text[] NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    UNIQUE(profile_id, tenant_id)
);

-- Enable RLS on staff_permissions
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_permissions
CREATE POLICY "Tenant owners and admins can manage staff permissions"
ON public.staff_permissions
FOR ALL
USING (
    tenant_id IN (
        SELECT profiles.tenant_id FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('tenant_owner', 'superadmin', 'admin')
    )
);

CREATE POLICY "Staff can view their own permissions"
ON public.staff_permissions
FOR SELECT
USING (profile_id = auth.uid());

-- Add branch_id to sales for department-based reports
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Add branch_id to expenses for department-based reports
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Trigger for updated_at on staff_permissions
CREATE TRIGGER update_staff_permissions_updated_at
BEFORE UPDATE ON public.staff_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();