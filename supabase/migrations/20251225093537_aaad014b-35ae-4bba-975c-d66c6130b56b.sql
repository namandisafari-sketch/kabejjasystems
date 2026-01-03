-- Create testimonials table for real customer feedback
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  submitter_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  business_name TEXT,
  role TEXT,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  photo_url TEXT,
  proof_description TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved testimonials (for public landing page)
CREATE POLICY "Anyone can view approved testimonials"
  ON public.testimonials
  FOR SELECT
  USING (is_approved = true);

-- Authenticated users can submit testimonials
CREATE POLICY "Authenticated users can submit testimonials"
  ON public.testimonials
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND submitter_id = auth.uid());

-- Users can update their own pending testimonials
CREATE POLICY "Users can update their own pending testimonials"
  ON public.testimonials
  FOR UPDATE
  USING (submitter_id = auth.uid() AND is_approved = false);

-- Admins can manage all testimonials
CREATE POLICY "Admins can manage all testimonials"
  ON public.testimonials
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  ));

-- Create updated_at trigger
CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();