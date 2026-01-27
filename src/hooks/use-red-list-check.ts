import { supabase } from "@/integrations/supabase/client";

export interface RedListStatus {
  isBlocked: boolean;
  blockingReasons: string[];
  ruleIds: string[];
}

// Check if a student is on the bursar's red list
export async function checkStudentRedListStatus(
  studentId: string,
  tenantId: string
): Promise<RedListStatus> {
  try {
    // Call the database function
    const { data, error } = await supabase.rpc("check_student_red_list_status", {
      p_student_id: studentId,
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error("Error checking red list status:", error);
      return { isBlocked: false, blockingReasons: [], ruleIds: [] };
    }

    if (data && data.length > 0) {
      const result = data[0];
      return {
        isBlocked: result.is_blocked || false,
        blockingReasons: result.blocking_reasons || [],
        ruleIds: result.rule_ids || [],
      };
    }

    return { isBlocked: false, blockingReasons: [], ruleIds: [] };
  } catch (err) {
    console.error("Error in checkStudentRedListStatus:", err);
    return { isBlocked: false, blockingReasons: [], ruleIds: [] };
  }
}

// Check if student has an approved override for today
export async function checkTodayOverrideApproval(
  studentId: string,
  tenantId: string
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("gate_override_requests")
    .select("id")
    .eq("student_id", studentId)
    .eq("tenant_id", tenantId)
    .eq("status", "approved")
    .eq("valid_for_date", today.toISOString().split("T")[0])
    .maybeSingle();

  if (error) {
    console.error("Error checking override approval:", error);
    return false;
  }

  return !!data;
}

// Create an override request
export async function createOverrideRequest(
  studentId: string,
  tenantId: string,
  blockingReason: string,
  overrideReason: string
): Promise<{ success: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from("gate_override_requests").insert({
    tenant_id: tenantId,
    student_id: studentId,
    blocking_reason: blockingReason,
    override_reason: overrideReason,
    requested_by: userData.user?.id,
    status: "pending",
    valid_for_date: new Date().toISOString().split("T")[0],
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
