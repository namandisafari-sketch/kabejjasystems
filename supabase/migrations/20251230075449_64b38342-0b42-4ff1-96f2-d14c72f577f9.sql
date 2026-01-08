-- Add columns to leases table for Ugandan rental workflow
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS deposit_months integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly';

-- Add receipt_number to rental_payments for tracking
ALTER TABLE rental_payments 
ADD COLUMN IF NOT EXISTS receipt_number text,
ADD COLUMN IF NOT EXISTS months_covered integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS period_start date,
ADD COLUMN IF NOT EXISTS period_end date;

-- Create a function to generate rental receipt numbers
CREATE OR REPLACE FUNCTION generate_rental_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  receipt_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO receipt_count 
  FROM rental_payments 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.receipt_number := 'RNT-' || year_prefix || '-' || LPAD(receipt_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate receipt numbers
DROP TRIGGER IF EXISTS generate_rental_receipt ON rental_payments;
CREATE TRIGGER generate_rental_receipt
  BEFORE INSERT ON rental_payments
  FOR EACH ROW
  EXECUTE FUNCTION generate_rental_receipt_number();