-- Add public SELECT policy for leases lookup (for renter portal)
-- First drop the vague policy
DROP POLICY IF EXISTS "Renters can view their own leases" ON public.leases;

-- Create a proper public lookup policy for active leases
CREATE POLICY "Public can lookup active leases for renter portal" 
ON public.leases 
FOR SELECT 
USING (status = 'active');