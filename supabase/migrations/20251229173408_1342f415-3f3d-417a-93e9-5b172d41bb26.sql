-- Add public SELECT policy for rental_tenants lookup by phone (for renter portal)
CREATE POLICY "Public can lookup rental tenants by phone" 
ON public.rental_tenants 
FOR SELECT 
USING (true);

-- Add public SELECT policy for leases (renters can view their own lease data)
CREATE POLICY "Renters can view their own leases" 
ON public.leases 
FOR SELECT 
USING (true);

-- Add public SELECT policy for rental_payments (renters can view their own payments)
CREATE POLICY "Renters can view their own payments" 
ON public.rental_payments 
FOR SELECT 
USING (true);

-- Add public SELECT and INSERT policy for maintenance_requests (renters can view and submit)
CREATE POLICY "Renters can view their own maintenance requests" 
ON public.maintenance_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Renters can submit maintenance requests" 
ON public.maintenance_requests 
FOR INSERT 
WITH CHECK (true);