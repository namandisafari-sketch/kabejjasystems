import { supabase } from "@/integrations/supabase/client";

export async function sendStudentLoginEmail(
  email: string,
  studentName: string,
  schoolName: string,
  magicLinkUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[EmailService] Sending branded email...", { email, studentName, schoolName });

    const { data, error } = await supabase.functions.invoke(
      "send-student-login-email",
      {
        body: { email, studentName, schoolName, magicLinkUrl, expiresInMinutes: 1440 },
      }
    );

    if (error) {
      console.error("[EmailService] Function error:", error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      console.error("[EmailService] Email send error:", data.error);
      return { success: false, error: data.error };
    }

    console.log("[EmailService] Email sent successfully:", data?.messageId);
    return { success: true };
  } catch (err: any) {
    console.error("[EmailService] Unexpected error:", err);
    return { success: false, error: err.message };
  }
}
