-- Self-Admission System Tables

-- Table for storing one-time admission links
CREATE TABLE public.admission_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  link_code UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  payment_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_registrations INTEGER NOT NULL DEFAULT 1,
  registrations_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Table for tracking completed self-registrations
CREATE TABLE public.admission_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  admission_link_id UUID NOT NULL REFERENCES public.admission_links(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  confirmation_code TEXT NOT NULL UNIQUE,
  student_data JSONB NOT NULL, -- Store submitted form data
  agreed_to_terms BOOLEAN NOT NULL DEFAULT true,
  terms_agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for school admission settings
CREATE TABLE public.admission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  is_open BOOLEAN NOT NULL DEFAULT false,
  rules_and_regulations TEXT,
  disclaimer_text TEXT DEFAULT 'WARNING: Providing false or misleading information during registration is strictly prohibited and will result in immediate denial of admission with NO REFUND of admission fees. By submitting this form, you confirm that all information provided is accurate and truthful.',
  custom_fields JSONB DEFAULT '[]',
  require_photo BOOLEAN DEFAULT true,
  require_birth_certificate BOOLEAN DEFAULT false,
  require_previous_school_records BOOLEAN DEFAULT false,
  academic_year TEXT,
  admission_fee_amount NUMERIC DEFAULT 0,
  link_validity_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_admission_links_tenant ON public.admission_links(tenant_id);
CREATE INDEX idx_admission_links_code ON public.admission_links(link_code);
CREATE INDEX idx_admission_links_payment ON public.admission_links(tenant_id, payment_code);
CREATE INDEX idx_admission_confirmations_code ON public.admission_confirmations(confirmation_code);
CREATE INDEX idx_admission_confirmations_tenant ON public.admission_confirmations(tenant_id);

-- Enable RLS
ALTER TABLE public.admission_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admission_links
CREATE POLICY "Staff can manage admission links" ON public.admission_links
  FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

-- Public can read active links by link_code (for self-registration)
CREATE POLICY "Public can read active admission links" ON public.admission_links
  FOR SELECT USING (is_active = true AND expires_at > now());

-- RLS Policies for admission_confirmations
CREATE POLICY "Staff can view confirmations" ON public.admission_confirmations
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Staff can update confirmations" ON public.admission_confirmations
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

-- Public can insert confirmations (for self-registration)
CREATE POLICY "Public can create confirmations" ON public.admission_confirmations
  FOR INSERT WITH CHECK (true);

-- Public can read their own confirmation by code
CREATE POLICY "Public can read confirmations by code" ON public.admission_confirmations
  FOR SELECT USING (true);

-- RLS Policies for admission_settings
CREATE POLICY "Staff can manage admission settings" ON public.admission_settings
  FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

-- Public can read admission settings (for self-registration form)
CREATE POLICY "Public can read admission settings" ON public.admission_settings
  FOR SELECT USING (is_open = true);

-- Function to generate unique confirmation code
CREATE OR REPLACE FUNCTION public.generate_confirmation_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN 'ADM-' || result;
END;
$$;

-- Function to validate and use admission link
CREATE OR REPLACE FUNCTION public.use_admission_link(
  p_link_code UUID,
  p_payment_code TEXT,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
BEGIN
  -- Find and lock the link
  SELECT * INTO v_link
  FROM admission_links
  WHERE link_code = p_link_code
    AND payment_code = p_payment_code
    AND tenant_id = p_tenant_id
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid link or payment code');
  END IF;

  IF v_link.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This admission link has expired');
  END IF;

  IF v_link.registrations_used >= v_link.max_registrations THEN
    RETURN jsonb_build_object('success', false, 'error', 'This admission link has already been used');
  END IF;

  -- Increment usage
  UPDATE admission_links
  SET registrations_used = registrations_used + 1,
      is_active = CASE WHEN registrations_used + 1 >= max_registrations THEN false ELSE true END
  WHERE id = v_link.id;

  RETURN jsonb_build_object('success', true, 'link_id', v_link.id, 'tenant_id', v_link.tenant_id);
END;
$$;