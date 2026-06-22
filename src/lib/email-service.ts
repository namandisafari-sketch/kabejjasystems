import { supabase } from "@/integrations/supabase/client";

export async function sendStudentLoginEmail(
  email: string,
  studentName: string,
  schoolName: string,
  magicLinkUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke(
      "send-student-login-email",
      {
        body: {
          email,
          studentName,
          schoolName,
          magicLinkUrl,
          expiresInMinutes: 1440, // 24 hours
        },
      }
    );

    if (error) {
      console.error("Function error:", error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      console.error("Email send error:", data.error);
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return { success: false, error: err.message };
  }
}
