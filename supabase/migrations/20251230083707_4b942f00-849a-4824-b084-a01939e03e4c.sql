-- Rental ID Cards table - cards belong to the property/unit
CREATE TABLE public.rental_id_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  card_number text NOT NULL,
  current_holder_id uuid REFERENCES public.rental_tenants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lost', 'returned')),
  issued_at timestamp with time zone,
  deactivated_at timestamp with time zone,
  deactivation_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, card_number)
);

-- Payment proofs submitted by renters
CREATE TABLE public.rental_payment_proofs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.rental_id_cards(id) ON DELETE CASCADE,
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  payer_name text NOT NULL,
  amount numeric NOT NULL,
  payment_provider text NOT NULL CHECK (payment_provider IN ('mtn', 'airtel', 'bank')),
  transaction_reference text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by uuid,
  verified_at timestamp with time zone,
  rejection_reason text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add property and unit limits to rental packages
ALTER TABLE public.rental_packages 
  ADD COLUMN IF NOT EXISTS max_properties integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_units_per_property integer NOT NULL DEFAULT 20;

-- Enable RLS
ALTER TABLE public.rental_id_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payment_proofs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rental_id_cards
CREATE POLICY "Users can manage their tenant ID cards"
  ON public.rental_id_cards FOR ALL
  USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_payment_proofs  
CREATE POLICY "Users can manage their tenant payment proofs"
  ON public.rental_payment_proofs FOR ALL
  USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Allow renters to submit payment proofs (public insert with validation via card)
CREATE POLICY "Anyone can submit payment proof with valid card"
  ON public.rental_payment_proofs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rental_id_cards 
      WHERE rental_id_cards.id = card_id 
      AND rental_id_cards.status = 'active'
    )
  );

-- Create function to generate card number
CREATE OR REPLACE FUNCTION generate_rental_card_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_business_code text;
  v_sequence integer;
  v_card_number text;
BEGIN
  -- Get business code
  SELECT business_code INTO v_business_code FROM tenants WHERE id = p_tenant_id;
  
  -- Get next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(card_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO v_sequence
  FROM rental_id_cards
  WHERE tenant_id = p_tenant_id;
  
  v_card_number := v_business_code || '-' || LPAD(v_sequence::text, 4, '0');
  
  RETURN v_card_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate card number
CREATE OR REPLACE FUNCTION set_rental_card_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.card_number IS NULL OR NEW.card_number = '' THEN
    NEW.card_number := generate_rental_card_number(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_set_rental_card_number
  BEFORE INSERT ON rental_id_cards
  FOR EACH ROW
  EXECUTE FUNCTION set_rental_card_number();

-- Update timestamp trigger
CREATE TRIGGER update_rental_id_cards_updated_at
  BEFORE UPDATE ON rental_id_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_payment_proofs_updated_at
  BEFORE UPDATE ON rental_payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();