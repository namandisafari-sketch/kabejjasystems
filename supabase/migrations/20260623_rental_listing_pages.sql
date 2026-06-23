-- Rental Listing Pages & Application Documents
-- For QR code banners and public property listing pages

-- 1. Rental Listing Banners (admin creates these with QR codes)
CREATE TABLE IF NOT EXISTS public.rental_listing_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  banner_image_url TEXT,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rental_listing_banners ENABLE ROW LEVEL SECURITY;

-- 2. Rental Application Documents (LC1, ID, passport, etc.)
CREATE TABLE IF NOT EXISTS public.rental_application_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.rental_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rental_application_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "tenant_access" ON public.rental_listing_banners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tenant_access" ON public.rental_application_documents FOR ALL USING (true) WITH CHECK (true);
