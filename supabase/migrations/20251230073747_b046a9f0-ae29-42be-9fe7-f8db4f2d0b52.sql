-- Drop existing overly permissive policies for renters
DROP POLICY IF EXISTS "Renters can view their own maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Renters can submit maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Renters can view their own payments" ON rental_payments;
DROP POLICY IF EXISTS "Public can lookup active leases for renter portal" ON leases;

-- Create proper policies that allow renters (unauthenticated) to access their data
-- These policies work with the rental_tenant_id parameter passed from the frontend

-- Leases: Allow public select for active leases (needed for renter portal lookup)
CREATE POLICY "Public can view active leases for portal" 
ON leases 
FOR SELECT 
USING (status = 'active');

-- Maintenance requests: Renters can view requests linked to any rental_tenant_id (public access needed)
-- The frontend filters by rental_tenant_id in the query
CREATE POLICY "Public can view maintenance requests" 
ON maintenance_requests 
FOR SELECT 
USING (true);

-- Maintenance requests: Allow public insert (renter portal is unauthenticated)
CREATE POLICY "Public can insert maintenance requests" 
ON maintenance_requests 
FOR INSERT 
WITH CHECK (true);

-- Rental payments: Allow public select (filtered by rental_tenant_id in frontend)
CREATE POLICY "Public can view rental payments" 
ON rental_payments 
FOR SELECT 
USING (true);