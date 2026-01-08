-- Add technician payment tracking fields to repair_jobs
ALTER TABLE public.repair_jobs
ADD COLUMN IF NOT EXISTS technician_fee numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS technician_paid boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS technician_paid_at timestamp with time zone;