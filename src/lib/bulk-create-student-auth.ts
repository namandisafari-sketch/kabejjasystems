import { supabase } from "@/integrations/supabase/client";

/**
 * Bulk create auth accounts for students missing user_id
 * Uses Supabase Admin API via an edge function
 */
export const bulkCreateStudentAuthAccounts = async (tenantId: string): Promise<{
  success: boolean;
  created: number;
  failed: number;
  errors: Array<{ admissionNumber: string; error: string }>;
}> => {
  try {
    // Call edge function to create auth accounts in bulk
    const { data, error } = await supabase.functions.invoke('bulk-create-student-auth', {
      body: {
        tenantId,
      },
    });

    if (error) {
      return {
        success: false,
        created: 0,
        failed: 0,
        errors: [{ admissionNumber: 'all', error: error.message }],
      };
    }

    return {
      success: data?.success || false,
      created: data?.created || 0,
      failed: data?.failed || 0,
      errors: data?.errors || [],
    };
  } catch (err: any) {
    return {
      success: false,
      created: 0,
      failed: 0,
      errors: [{ admissionNumber: 'all', error: err.message }],
    };
  }
};

/**
 * SQL to run in Supabase SQL Editor to create auth accounts for all students
 * This uses the Supabase Auth API to create accounts in bulk
 */
export const getBulkAuthCreationSQL = (): string => {
  return `
-- Bulk create auth accounts for students without user_id
-- This uses the admin API to create accounts in the auth.users table

-- First, let's create a temporary function to generate auth accounts
CREATE OR REPLACE FUNCTION create_missing_student_auth_accounts(p_tenant_id UUID)
RETURNS TABLE (
  student_id UUID,
  admission_number TEXT,
  email TEXT,
  auth_user_id UUID,
  status TEXT
) AS $$
DECLARE
  v_student RECORD;
  v_user_id UUID;
BEGIN
  FOR v_student IN
    SELECT 
      s.id,
      s.admission_number,
      s.first_name,
      s.last_name,
      s.tenant_id
    FROM public.students s
    WHERE s.user_id IS NULL
      AND s.tenant_id = p_tenant_id
      AND s.admission_number IS NOT NULL
  LOOP
    -- Generate portal email
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data
    )
    VALUES (
      v_student.admission_number || '@ttl.student',
      crypt('alwaystry!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object(
        'role', 'student',
        'first_name', v_student.first_name,
        'last_name', v_student.last_name,
        'admission_number', v_student.admission_number,
        'tenant_id', p_tenant_id::text
      )
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO v_user_id;

    -- Link student to auth user
    UPDATE public.students
    SET user_id = v_user_id
    WHERE id = v_student.id
      AND user_id IS NULL;

    RETURN QUERY SELECT
      v_student.id,
      v_student.admission_number,
      v_student.admission_number || '@ttl.student',
      v_user_id,
      'created'::TEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function for Eden High School
SELECT * FROM create_missing_student_auth_accounts('ef7a3391-cddd-434f-9422-e58ffda74953');
`;
};
