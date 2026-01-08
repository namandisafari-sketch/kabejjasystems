
-- Add foreign key relationships
ALTER TABLE public.gate_checkins 
  ADD CONSTRAINT gate_checkins_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.gate_checkins 
  ADD CONSTRAINT gate_checkins_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.parent_students 
  ADD CONSTRAINT parent_students_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.parent_students 
  ADD CONSTRAINT parent_students_parent_id_fkey 
  FOREIGN KEY (parent_id) REFERENCES public.parents(id) ON DELETE CASCADE;

ALTER TABLE public.parent_students 
  ADD CONSTRAINT parent_students_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.parents 
  ADD CONSTRAINT parents_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
