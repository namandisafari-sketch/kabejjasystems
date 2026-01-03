-- Create receipt_settings table for tenant-specific receipt customization
CREATE TABLE public.receipt_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Numbering
  receipt_prefix TEXT DEFAULT 'RCP',
  next_receipt_number INTEGER DEFAULT 1,
  
  -- Layout
  logo_alignment TEXT DEFAULT 'center' CHECK (logo_alignment IN ('left', 'center', 'right')),
  show_logo BOOLEAN DEFAULT true,
  
  -- Contact info
  show_phone BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT true,
  show_address BOOLEAN DEFAULT true,
  
  -- WhatsApp QR
  whatsapp_number TEXT,
  show_whatsapp_qr BOOLEAN DEFAULT false,
  
  -- Seasonal/Custom remarks
  seasonal_remark TEXT,
  show_seasonal_remark BOOLEAN DEFAULT false,
  
  -- Footer customization
  footer_message TEXT DEFAULT 'Thank you for shopping with us!',
  show_footer_message BOOLEAN DEFAULT true,
  
  -- Additional fields visibility
  show_cashier BOOLEAN DEFAULT true,
  show_customer BOOLEAN DEFAULT true,
  show_date_time BOOLEAN DEFAULT true,
  show_payment_method BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_tenant_receipt_settings UNIQUE (tenant_id)
);

-- Enable RLS
ALTER TABLE public.receipt_settings ENABLE ROW LEVEL SECURITY;

-- Policies for tenant access
CREATE POLICY "Tenant owners can manage their receipt settings"
  ON public.receipt_settings
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_receipt_settings_updated_at
  BEFORE UPDATE ON public.receipt_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get next receipt number and increment
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_number INTEGER;
  v_receipt_number TEXT;
BEGIN
  -- Get or create settings for tenant
  INSERT INTO receipt_settings (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;
  
  -- Get and increment the receipt number atomically
  UPDATE receipt_settings
  SET next_receipt_number = next_receipt_number + 1
  WHERE tenant_id = p_tenant_id
  RETURNING receipt_prefix, next_receipt_number - 1 INTO v_prefix, v_number;
  
  -- Format: PREFIX-YYYYMMDD-NNNNNN
  v_receipt_number := v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_number::TEXT, 6, '0');
  
  RETURN v_receipt_number;
END;
$$;