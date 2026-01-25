-- Add missing payroll columns for full accounting support
ALTER TABLE public.payroll_records 
  ADD COLUMN IF NOT EXISTS gross_pay DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS paye_tax DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nssf_employee DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nssf_employer DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_pay DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS total_employer_cost DECIMAL(15,2);

-- Update gross_pay from base_salary if null
UPDATE public.payroll_records 
SET gross_pay = COALESCE(base_salary, 0) + COALESCE(bonuses, 0)
WHERE gross_pay IS NULL;

-- Update net_pay from net_salary if null
UPDATE public.payroll_records 
SET net_pay = COALESCE(net_salary, 0)
WHERE net_pay IS NULL;