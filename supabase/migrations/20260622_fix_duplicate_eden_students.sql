-- Fix Duplicate Students in Eden High School
-- This migration identifies and removes duplicate students that were imported twice
-- (once with admission_number + UUID, once with DM number + 6-digit)

-- Step 1: Create a temporary table to identify duplicates based on similar names
WITH student_duplicates AS (
  -- Find students with the same full_name but different admission_numbers
  SELECT 
    s1.id as keep_id,
    s2.id as delete_id,
    s1.full_name,
    s1.admission_number as keep_admission,
    s2.admission_number as delete_admission,
    s1.created_at as keep_created,
    s2.created_at as delete_created
  FROM public.students s1
  JOIN public.students s2 ON s1.full_name = s2.full_name
    AND s1.tenant_id = s2.tenant_id
    AND s1.id < s2.id  -- Ensure we get consistent pairs
    AND s1.tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953'
  WHERE s1.full_name IS NOT NULL 
    AND s1.full_name != ''
)

-- Step 2: Review the duplicates that will be deleted
SELECT 
  COUNT(*) as duplicate_count,
  'These records will be deleted' as action
FROM student_duplicates;

-- After reviewing, uncomment the DELETE section below:
--
-- WITH student_duplicates AS (
--   SELECT 
--     s2.id as delete_id
--   FROM public.students s1
--   JOIN public.students s2 ON s1.full_name = s2.full_name
--     AND s1.tenant_id = s2.tenant_id
--     AND s1.id < s2.id
--     AND s1.tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953'
--   WHERE s1.full_name IS NOT NULL 
--     AND s1.full_name != ''
-- )
-- DELETE FROM public.students 
-- WHERE id IN (SELECT delete_id FROM student_duplicates);
