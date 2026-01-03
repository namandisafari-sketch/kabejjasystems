-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos for their tenant
CREATE POLICY "Tenant owners can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'business-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'business-logos');

-- Allow owners to update/delete their logos
CREATE POLICY "Tenant owners can update logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Tenant owners can delete logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

-- Add logo_url column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS logo_url TEXT;