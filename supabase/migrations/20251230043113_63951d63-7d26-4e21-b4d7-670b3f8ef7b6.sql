-- Add public SELECT policy for rental_units lookup (for renter portal)
CREATE POLICY "Public can lookup rental units for renter portal" 
ON public.rental_units 
FOR SELECT 
USING (is_active = true);