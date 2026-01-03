import { useEffect, useRef } from "react";
import { supabase } from "@/hooks/use-database";
import { toast } from "sonner";
import { format } from "date-fns";

interface CheckinEvent {
  id: string;
  student_id: string;
  check_type: string;
  checked_at: string;
  is_late: boolean;
  notes: string | null;
}

interface StudentInfo {
  id: string;
  full_name: string;
}

export function useRealtimeCheckinNotifications(
  studentIds: string[],
  studentsMap: Map<string, StudentInfo>
) {
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (studentIds.length === 0) return;

    const channel = supabase
      .channel('parent-checkin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gate_checkins',
          filter: `student_id=in.(${studentIds.join(',')})`,
        },
        (payload) => {
          const checkin = payload.new as CheckinEvent;
          
          // Prevent duplicate notifications
          if (notifiedIds.current.has(checkin.id)) return;
          notifiedIds.current.add(checkin.id);
          
          const student = studentsMap.get(checkin.student_id);
          const studentName = student?.full_name || "Your child";
          const time = format(new Date(checkin.checked_at), "h:mm a");
          
          if (checkin.check_type === "arrival") {
            toast.success(
              `🎒 ${studentName} arrived at school`,
              {
                description: checkin.is_late 
                  ? `Checked in late at ${time}`
                  : `Checked in at ${time}`,
                duration: 8000,
              }
            );
          } else if (checkin.check_type === "departure") {
            toast.info(
              `🏠 ${studentName} is ready for pickup`,
              {
                description: `Checked out at ${time}`,
                duration: 8000,
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentIds, studentsMap]);
}
