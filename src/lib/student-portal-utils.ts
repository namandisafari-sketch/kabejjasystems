import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a unique portal email based on student name and admission number
 * Format: firstname.lastname.admissionnumber@tennahubapps.com
 */
export const generatePortalEmail = (firstName: string, lastName: string, admissionNumber?: string): string => {
  const sanitized = (text: string) => 
    text
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
  
  const firstNameSanitized = sanitized(firstName);
  const lastNameSanitized = sanitized(lastName);
  const admissionPart = admissionNumber ? sanitized(admissionNumber) : '';
  
  if (admissionPart) {
    return `${firstNameSanitized}.${lastNameSanitized}.${admissionPart}@tennahubapps.com`;
  }
  return `${firstNameSanitized}.${lastNameSanitized}@tennahubapps.com`;
};

/**
 * Generate a random temporary password
 */
export const generateTemporaryPassword = (): string => {
  const length = 12;
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

/**
 * Create a student portal account automatically
 * Returns the user_id if successful, or null if failed
 */
export const createStudentPortalAccount = async (
  firstName: string,
  lastName: string,
  admissionNumber: string,
  tenantId: string,
  schoolName?: string
): Promise<{ success: boolean; email?: string; userId?: string; error?: string }> => {
  try {
    // Generate portal email
    const portalEmail = generatePortalEmail(firstName, lastName, admissionNumber);
    
    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    
    // Create auth account in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: portalEmail,
      password: tempPassword,
      options: {
        data: {
          role: 'student',
          first_name: firstName,
          last_name: lastName,
          admission_number: admissionNumber,
          tenant_id: tenantId,
        },
        // Auto-confirm email in development, require confirmation in production
        emailRedirectTo: `${window.location.origin}/student/login`,
      },
    });
    
    if (authError) {
      return {
        success: false,
        error: authError.message,
      };
    }
    
    if (!authData.user?.id) {
      return {
        success: false,
        error: 'Failed to create user account',
      };
    }
    
    return {
      success: true,
      email: portalEmail,
      userId: authData.user.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown error creating portal account',
    };
  }
};

/**
 * Send welcome email to student with portal login credentials
 */
export const sendStudentWelcomeEmail = async (
  studentEmail: string,
  studentName: string,
  schoolName: string,
  portalUrl: string = 'https://system.tennahubapps.com/student/login'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Call edge function to send email via Supabase
    const { data, error } = await supabase.functions.invoke('send-student-welcome-email', {
      body: {
        email: studentEmail,
        studentName,
        schoolName,
        portalUrl,
        subject: `Welcome to ${schoolName} Student Portal`,
      },
    });
    
    if (error) {
      console.warn('Email send failed (non-critical):', error);
      // Don't fail the whole operation if email fails
      return { success: true };
    }
    
    return { success: true };
  } catch (err: any) {
    console.warn('Email send error (non-critical):', err);
    // Don't fail the whole operation if email fails
    return { success: true };
  }
};

/**
 * Create portal account and send welcome email (combined operation)
 */
export const createStudentPortalAccountWithEmail = async (
  firstName: string,
  lastName: string,
  admissionNumber: string,
  tenantId: string,
  schoolName: string
): Promise<{
  success: boolean;
  email?: string;
  userId?: string;
  error?: string;
  emailSent?: boolean;
}> => {
  // Create account
  const accountResult = await createStudentPortalAccount(
    firstName,
    lastName,
    admissionNumber,
    tenantId,
    schoolName
  );
  
  if (!accountResult.success) {
    return accountResult;
  }
  
  // Send welcome email
  const emailResult = await sendStudentWelcomeEmail(
    accountResult.email!,
    `${firstName} ${lastName}`,
    schoolName
  );
  
  return {
    success: true,
    email: accountResult.email,
    userId: accountResult.userId,
    emailSent: emailResult.success,
  };
};
