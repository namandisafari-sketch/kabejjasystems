-- Add trial fields to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 14;