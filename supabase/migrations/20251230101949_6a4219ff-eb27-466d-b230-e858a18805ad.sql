-- Add fields to track losses when tenants leave without paying
ALTER TABLE public.leases 
ADD COLUMN IF NOT EXISTS termination_reason TEXT,
ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS marked_as_loss BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loss_marked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS loss_marked_by UUID;

-- Add index for querying losses
CREATE INDEX IF NOT EXISTS idx_leases_marked_as_loss ON public.leases(tenant_id, marked_as_loss) WHERE marked_as_loss = true;