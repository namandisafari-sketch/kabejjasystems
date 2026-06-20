-- Add user_id column to students for auth
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- School events for bookings (tours, trips, sports days, etc.)
CREATE TABLE IF NOT EXISTS public.school_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'general',
  start_date date NOT NULL,
  end_date date,
  event_time time,
  location text,
  capacity integer,
  ticket_price numeric(10,2) DEFAULT 0,
  booking_deadline timestamptz,
  cover_image_url text,
  is_published boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event bookings
CREATE TABLE IF NOT EXISTS public.event_bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.school_events(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_count integer NOT NULL DEFAULT 1,
  total_price numeric(10,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  payment_status text DEFAULT 'unpaid',
  booked_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(event_id, student_id)
);

-- Student learning resources
CREATE TABLE IF NOT EXISTS public.student_resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  resource_type text NOT NULL DEFAULT 'file',
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.school_classes(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: school_events
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant staff can manage events" ON public.school_events
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );
CREATE POLICY "Students can view published events" ON public.school_events
  FOR SELECT USING (is_published = true AND tenant_id IN (
    SELECT tenant_id FROM public.students WHERE user_id = auth.uid()
  ));

-- RLS: event_bookings
ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can manage own bookings" ON public.event_bookings
  FOR ALL USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Tenant staff can view bookings" ON public.event_bookings
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS: student_resources
ALTER TABLE public.student_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant staff can manage resources" ON public.student_resources
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );
CREATE POLICY "Students can view published resources" ON public.student_resources
  FOR SELECT USING (
    is_published = true
    AND (
      class_id IS NULL
      OR class_id IN (
        SELECT class_id FROM public.students WHERE user_id = auth.uid()
      )
    )
    AND tenant_id IN (
      SELECT tenant_id FROM public.students WHERE user_id = auth.uid()
    )
  );
