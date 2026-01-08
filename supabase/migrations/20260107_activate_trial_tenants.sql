-- Activate all pending trial tenants
-- This migration ensures all trial signups are activated immediately

UPDATE tenants
SET 
  status = 'active',
  is_trial = true,
  trial_days = 14,
  trial_end_date = (created_at + interval '14 days')::date,
  activated_at = COALESCE(activated_at, now())
WHERE 
  status != 'active'
  AND created_at >= (now() - interval '30 days')  -- Only recent signups
  AND is_trial IS NULL OR is_trial = true;  -- Only trial accounts

-- Log the update
DO $$
DECLARE
  v_count INT;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Activated % pending trial tenant(s)', v_count;
END $$;
