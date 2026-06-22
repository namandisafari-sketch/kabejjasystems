-- Add constituency and subcounty columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS constituency TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS subcounty TEXT;

-- Add constituency and subcounty columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS constituency TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS subcounty TEXT;
