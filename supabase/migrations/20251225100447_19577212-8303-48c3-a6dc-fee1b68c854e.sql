-- Add sale_id column to customer_payments to link payments to specific sales
ALTER TABLE public.customer_payments 
ADD COLUMN sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX idx_customer_payments_sale_id ON public.customer_payments(sale_id);

-- Add a comment explaining the column
COMMENT ON COLUMN public.customer_payments.sale_id IS 'Optional link to the original credit sale this payment is for';