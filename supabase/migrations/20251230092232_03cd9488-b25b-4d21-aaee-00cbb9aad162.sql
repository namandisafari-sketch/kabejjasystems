
-- Add public SELECT policy for rental_id_cards so renters can view their cards
CREATE POLICY "Public can view rental ID cards"
ON public.rental_id_cards
FOR SELECT
USING (status = 'active');

-- Add public INSERT policy for rental_payments to allow self-payment submissions
CREATE POLICY "Public can insert rental payments"
ON public.rental_payments
FOR INSERT
WITH CHECK (true);
