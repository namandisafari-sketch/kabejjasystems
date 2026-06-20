CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT,
  submitter_phone TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'academic', 'facilities', 'safety', 'food', 'transport', 'other')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'implemented', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suggestions_tenant ON public.suggestions(tenant_id);
CREATE INDEX idx_suggestions_status ON public.suggestions(status);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert suggestions" ON public.suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Tenant staff can view their suggestions" ON public.suggestions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant staff can update their suggestions" ON public.suggestions FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;
