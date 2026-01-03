-- Create parent_issues table for reporting issues
CREATE TABLE public.parent_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parent_issues ENABLE ROW LEVEL SECURITY;

-- Parents can view their own issues
CREATE POLICY "Parents can view their own issues"
ON public.parent_issues
FOR SELECT
TO authenticated
USING (
  parent_id IN (
    SELECT id FROM public.parents WHERE user_id = auth.uid()
  )
);

-- Parents can create issues for their children
CREATE POLICY "Parents can create issues for their children"
ON public.parent_issues
FOR INSERT
TO authenticated
WITH CHECK (
  parent_id IN (
    SELECT id FROM public.parents WHERE user_id = auth.uid()
  )
  AND student_id IN (
    SELECT ps.student_id 
    FROM public.parent_students ps
    JOIN public.parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Parents can update their open issues
CREATE POLICY "Parents can update their open issues"
ON public.parent_issues
FOR UPDATE
TO authenticated
USING (
  parent_id IN (
    SELECT id FROM public.parents WHERE user_id = auth.uid()
  )
  AND status = 'open'
);

-- Staff can manage all issues for their tenant
CREATE POLICY "Staff can manage tenant issues"
ON public.parent_issues
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_parent_issues_updated_at
  BEFORE UPDATE ON public.parent_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();