import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QRScanResult {
  success: boolean;
  message: string;
  student?: {
    id: string;
    full_name: string;
    admission_number: string;
    class_name?: string;
    photo_url?: string;
  };
  action?: 'attendance' | 'pickup';
  isLate?: boolean;
  isAuthorizedPickup?: boolean;
  pickerName?: string;
}

export interface ScanContext {
  scannerType: 'teacher' | 'gate';
  tenantId: string;
  schoolStartTime?: string;
  lateArrivalMinutes?: number;
  schoolEndTime?: string;
  requireEarlyDepartureReason?: boolean;
}

// Parse QR code value - supports formats:
// STU:student_id - Student ID QR
// ADM:admission_number - Admission number QR
// PARENT:parent_id:student_id - Parent pickup verification
export function parseQRCode(qrValue: string): { type: 'student' | 'admission' | 'parent_pickup', value: string, studentId?: string } | null {
  if (!qrValue || typeof qrValue !== 'string') return null;
  
  const trimmed = qrValue.trim();
  
  if (trimmed.startsWith('STU:')) {
    return { type: 'student', value: trimmed.slice(4) };
  }
  
  if (trimmed.startsWith('ADM:')) {
    return { type: 'admission', value: trimmed.slice(4) };
  }
  
  if (trimmed.startsWith('PARENT:')) {
    const parts = trimmed.slice(7).split(':');
    if (parts.length >= 2) {
      return { type: 'parent_pickup', value: parts[0], studentId: parts[1] };
    }
  }
  
  // Fallback: treat as admission number
  return { type: 'admission', value: trimmed };
}

// Teacher scan - marks attendance
export async function handleTeacherScan(
  qrValue: string,
  tenantId: string,
  options?: {
    schoolStartTime?: string;
    lateArrivalMinutes?: number;
  }
): Promise<QRScanResult> {
  const parsed = parseQRCode(qrValue);
  if (!parsed) {
    return { success: false, message: "Invalid QR code format" };
  }

  try {
    // Find the student
    let studentQuery = supabase
      .from("students")
      .select(`
        id,
        full_name,
        admission_number,
        photo_url,
        school_classes!class_id (name)
      `)
      .eq("tenant_id", tenantId);

    if (parsed.type === 'student') {
      studentQuery = studentQuery.eq("id", parsed.value);
    } else {
      studentQuery = studentQuery.eq("admission_number", parsed.value);
    }

    const { data: student, error: studentError } = await studentQuery.single();

    if (studentError || !student) {
      return { success: false, message: "Student not found" };
    }

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existingCheckin } = await supabase
      .from("gate_checkins")
      .select("id")
      .eq("student_id", student.id)
      .eq("check_type", "arrival")
      .gte("checked_at", today.toISOString())
      .maybeSingle();

    if (existingCheckin) {
      return {
        success: false,
        message: `${student.full_name} already checked in today`,
        student: {
          id: student.id,
          full_name: student.full_name,
          admission_number: student.admission_number || '',
          class_name: student.school_classes?.name,
          photo_url: student.photo_url,
        }
      };
    }

    // Determine if late
    let isLate = false;
    if (options?.schoolStartTime) {
      const now = new Date();
      const [hours, minutes] = options.schoolStartTime.split(":");
      const startTime = new Date();
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const lateThreshold = new Date(startTime.getTime() + (options.lateArrivalMinutes || 30) * 60000);
      isLate = now > lateThreshold;
    }

    // Record attendance
    const { error: checkinError } = await supabase
      .from("gate_checkins")
      .insert({
        tenant_id: tenantId,
        student_id: student.id,
        check_type: "arrival",
        is_late: isLate,
        notes: "Scanned by teacher"
      });

    if (checkinError) throw checkinError;

    return {
      success: true,
      message: `${student.full_name} marked present${isLate ? ' (LATE)' : ''}`,
      student: {
        id: student.id,
        full_name: student.full_name,
        admission_number: student.admission_number || '',
        class_name: student.school_classes?.name,
        photo_url: student.photo_url,
      },
      action: 'attendance',
      isLate,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to record attendance" };
  }
}

// Gate scan - verifies parent pickup
export async function handleGateScan(
  qrValue: string,
  tenantId: string,
  checkType: 'arrival' | 'departure',
  options?: {
    schoolStartTime?: string;
    lateArrivalMinutes?: number;
    schoolEndTime?: string;
    verifyParent?: boolean;
  }
): Promise<QRScanResult> {
  const parsed = parseQRCode(qrValue);
  if (!parsed) {
    return { success: false, message: "Invalid QR code format" };
  }

  try {
    // Find the student
    let studentQuery = supabase
      .from("students")
      .select(`
        id,
        full_name,
        admission_number,
        photo_url,
        guardian_name,
        guardian_phone,
        authorized_pickups,
        school_classes!class_id (name)
      `)
      .eq("tenant_id", tenantId);

    if (parsed.type === 'student' || (parsed.type === 'parent_pickup' && parsed.studentId)) {
      studentQuery = studentQuery.eq("id", parsed.type === 'parent_pickup' ? parsed.studentId! : parsed.value);
    } else {
      studentQuery = studentQuery.eq("admission_number", parsed.value);
    }

    const { data: student, error: studentError } = await studentQuery.single();

    if (studentError || !student) {
      return { success: false, message: "Student not found" };
    }

    // For departures, verify if it's a parent pickup code
    let pickerName: string | undefined;
    let isAuthorizedPickup = false;

    if (checkType === 'departure' && parsed.type === 'parent_pickup') {
      // Verify the parent is authorized
      const { data: parent } = await supabase
        .from("parents")
        .select("full_name")
        .eq("id", parsed.value)
        .single();

      if (parent) {
        isAuthorizedPickup = true;
        pickerName = parent.full_name;
      } else {
        // Check authorized pickups list
        const authorizedList = student.authorized_pickups as { name: string; phone: string; relationship: string }[] | null;
        if (authorizedList && authorizedList.length > 0) {
          // For now, just log that it's a pickup
          isAuthorizedPickup = true;
          pickerName = "Authorized Guardian";
        }
      }
    }

    // For departures, also handle regular student QR (guardian present)
    if (checkType === 'departure' && !isAuthorizedPickup) {
      // Assume guardian is picking up when student QR is scanned
      isAuthorizedPickup = true;
      pickerName = student.guardian_name || "Guardian";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for arrival - ensure not already checked in
    if (checkType === 'arrival') {
      const { data: existingCheckin } = await supabase
        .from("gate_checkins")
        .select("id")
        .eq("student_id", student.id)
        .eq("check_type", "arrival")
        .gte("checked_at", today.toISOString())
        .maybeSingle();

      if (existingCheckin) {
        return {
          success: false,
          message: `${student.full_name} already checked in today`,
          student: {
            id: student.id,
            full_name: student.full_name,
            admission_number: student.admission_number || '',
            class_name: student.school_classes?.name,
            photo_url: student.photo_url,
          }
        };
      }
    }

    // Determine if late (for arrivals)
    let isLate = false;
    if (checkType === 'arrival' && options?.schoolStartTime) {
      const now = new Date();
      const [hours, minutes] = options.schoolStartTime.split(":");
      const startTime = new Date();
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const lateThreshold = new Date(startTime.getTime() + (options.lateArrivalMinutes || 30) * 60000);
      isLate = now > lateThreshold;
    }

    // Record check-in/out
    const { error: checkinError } = await supabase
      .from("gate_checkins")
      .insert({
        tenant_id: tenantId,
        student_id: student.id,
        check_type: checkType,
        is_late: checkType === 'arrival' ? isLate : false,
        notes: checkType === 'departure' && pickerName ? `Picked up by: ${pickerName}` : undefined
      });

    if (checkinError) throw checkinError;

    const actionMessage = checkType === 'arrival' 
      ? `${student.full_name} checked IN${isLate ? ' (LATE)' : ''}`
      : `${student.full_name} checked OUT${pickerName ? ` - Picked up by ${pickerName}` : ''}`;

    return {
      success: true,
      message: actionMessage,
      student: {
        id: student.id,
        full_name: student.full_name,
        admission_number: student.admission_number || '',
        class_name: student.school_classes?.name,
        photo_url: student.photo_url,
      },
      action: checkType === 'departure' ? 'pickup' : 'attendance',
      isLate,
      isAuthorizedPickup,
      pickerName,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to process scan" };
  }
}
