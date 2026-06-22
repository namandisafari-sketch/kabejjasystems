-- Migration: Convert Admission Numbers to 6-Digit Format for Eden High School
-- This migration converts UUID-style admission numbers to sequential 6-digit format
-- Date: 2026-06-22

-- Create a temporary table to track the old to new mapping
CREATE TEMP TABLE admission_mapping AS
SELECT 
  id,
  admission_number as old_admission_number,
  ROW_NUMBER() OVER (ORDER BY created_at) + 100000 as new_admission_number
FROM public.students
WHERE tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953'
  AND admission_number IS NOT NULL
ORDER BY created_at;

-- View the mapping (before updating)
SELECT * FROM admission_mapping LIMIT 10;

-- After reviewing, uncomment the UPDATE section below:
--
-- UPDATE public.students s
-- SET admission_number = CAST(am.new_admission_number AS TEXT)
-- FROM admission_mapping am
-- WHERE s.id = am.id
--   AND s.tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953';

-- Verify the results
-- SELECT admission_number, COUNT(*) FROM public.students 
-- WHERE tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953'
-- GROUP BY admission_number;
