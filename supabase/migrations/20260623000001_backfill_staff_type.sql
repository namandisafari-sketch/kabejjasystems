-- Backfill staff_type for existing accounts that are still 'general'
-- Map from employees.role to staff_permissions.staff_type

UPDATE staff_permissions sp
SET staff_type = 
  CASE emp.role
    WHEN 'Head Teacher' THEN 'head_teacher'
    WHEN 'Deputy Head' THEN 'deputy_head_admin'
    WHEN 'Director of Studies' THEN 'director_of_studies'
    WHEN 'Bursar' THEN 'bursar'
    WHEN 'Teacher' THEN 'subject_teacher'
    WHEN 'Librarian' THEN 'librarian'
    WHEN 'Secretary' THEN 'admissions_officer'
    WHEN 'Security' THEN 'gate_keeper'
    WHEN 'Support Staff' THEN 'store_keeper'
    ELSE 'general'
  END
FROM profiles p
JOIN employees emp ON emp.tenant_id = p.tenant_id 
  AND (
    -- profiles table may not have email column, match by normalized phone
    REPLACE(emp.phone, ' ', '') = REPLACE(p.phone, ' ', '')
    OR LOWER(TRIM(emp.full_name)) = LOWER(TRIM(p.full_name))
  )
WHERE sp.profile_id = p.id
  AND sp.staff_type = 'general'
  AND emp.role IS NOT NULL;
