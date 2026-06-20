CREATE TABLE public.staff_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  school_code TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT NOT NULL,
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  screen_resolution TEXT,
  browser_language TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_reviews_tenant ON public.staff_reviews(tenant_id);
CREATE INDEX idx_staff_reviews_status ON public.staff_reviews(status);
CREATE INDEX idx_staff_reviews_school_code ON public.staff_reviews(school_code);

ALTER TABLE public.staff_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert reviews" ON public.staff_reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Tenant staff can view their reviews" ON public.staff_reviews FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant staff can update their reviews" ON public.staff_reviews FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_reviews;
