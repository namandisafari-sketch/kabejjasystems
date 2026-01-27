-- Add approval_expires_at column to gate_override_requests for tracking when an approval expires
ALTER TABLE public.gate_override_requests 
ADD COLUMN IF NOT EXISTS approval_expires_at DATE;

-- Add a comment explaining the column
COMMENT ON COLUMN public.gate_override_requests.approval_expires_at IS 'Date when the override approval expires. After this date, the student will be blocked again.';