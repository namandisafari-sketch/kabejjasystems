-- Import students from CSV (semicolon-delimited)
-- Tenant UUID: ef7a3391-cddd-434f-9422-e58ffda74953

-- 1) Create staging table matching CSV structure
CREATE TEMP TABLE staging_students (
  id UUID,
  tenant_id UUID,
  class_id UUID,
  student_number TEXT,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  enrollment_date DATE,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  photo_url TEXT,
  nationality TEXT,
  place_of_birth TEXT,
  home_district TEXT,
  religion TEXT,
  special_talent TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  guardian_relationship TEXT,
  guardian_occupation TEXT,
  guardian_address TEXT,
  blood_group TEXT,
  medical_conditions TEXT,
  allergies TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  previous_school TEXT,
  previous_class TEXT,
  reason_for_leaving TEXT,
  nin_number TEXT,
  birth_certificate_no TEXT,
  stream_id UUID
);

-- 2) Load CSV using psql: psql -c "\COPY staging_students FROM '/path/to/students-export-2026-06-22_10-55-18.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');"
-- 3) Import into students table, skip NIN, handle duplicates
INSERT INTO public.students (
  tenant_id,
  admission_number,
  full_name,
  date_of_birth,
  gender,
  parent_name,
  parent_phone,
  parent_email,
  class_id,
  address,
  admission_date,
  photo_url,
  is_active
)
SELECT
  'ef7a3391-cddd-434f-9422-e58ffda74953'::UUID AS tenant_id,
  NULL AS admission_number,
  CONCAT(first_name, ' ', last_name) AS full_name,
  date_of_birth,
  LOWER(gender) AS gender,
  guardian_name AS parent_name,
  guardian_phone AS parent_phone,
  guardian_email AS parent_email,
  class_id,
  address,
  enrollment_date AS admission_date,
  photo_url,
  (status = 'active') AS is_active
FROM staging_students
WHERE first_name IS NOT NULL AND last_name IS NOT NULL
ON CONFLICT (tenant_id, admission_number) DO NOTHING;

-- Report
SELECT COUNT(*) as imported_count FROM public.students 
WHERE tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953';
