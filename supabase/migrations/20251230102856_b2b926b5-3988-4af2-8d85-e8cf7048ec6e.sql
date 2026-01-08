-- Fix RLS policies for rental_payment_proofs
-- Allow anyone to INSERT payment proofs (for public submission)
-- Allow tenant owners to SELECT/UPDATE/DELETE

-- First drop existing policies
DROP POLICY IF EXISTS "Anyone can submit payment proof with valid card" ON public.rental_payment_proofs;
DROP POLICY IF EXISTS "Users can manage their tenant payment proofs" ON public.rental_payment_proofs;

-- Create policy for public INSERT (anyone with valid card can submit)
CREATE POLICY "Anyone can submit payment proof" 
ON public.rental_payment_proofs 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rental_id_cards 
    WHERE rental_id_cards.id = rental_payment_proofs.card_id 
    AND rental_id_cards.status = 'active'
  )
);

-- Create policy for tenant owners to SELECT payment proofs
CREATE POLICY "Tenant owners can view payment proofs" 
ON public.rental_payment_proofs 
FOR SELECT 
TO authenticated
USING (
  tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

-- Create policy for tenant owners to UPDATE payment proofs
CREATE POLICY "Tenant owners can update payment proofs" 
ON public.rental_payment_proofs 
FOR UPDATE 
TO authenticated
USING (
  tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

-- Create policy for tenant owners to DELETE payment proofs
CREATE POLICY "Tenant owners can delete payment proofs" 
ON public.rental_payment_proofs 
FOR DELETE 
TO authenticated
USING (
  tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  )
);