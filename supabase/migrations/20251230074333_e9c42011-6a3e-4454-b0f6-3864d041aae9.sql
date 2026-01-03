-- Allow public select on rental_properties for the renter portal
CREATE POLICY "Public can view rental properties for portal" 
ON rental_properties 
FOR SELECT 
USING (true);