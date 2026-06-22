-- Fix: Update student record with correct user_id from auth
-- The student KATENDE KEVIN (670033) has the wrong user_id linked

UPDATE public.students 
SET user_id = 'c69dc63f-58ab-4626-b135-601cddba4aae'
WHERE admission_number = '670033' AND tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953';
