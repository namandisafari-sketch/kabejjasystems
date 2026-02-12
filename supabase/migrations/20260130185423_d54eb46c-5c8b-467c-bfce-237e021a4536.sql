-- Add policy to allow public access to school classes for admission purposes
CREATE POLICY "Public can read active classes for admission"
ON public.school_classes
FOR SELECT
USING (is_active = true);