import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CreditCard, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface RedListBannerProps {
  studentId: string;
  tenantId: string;
  studentName: string;
}

export function RedListBanner({ studentId, tenantId, studentName }: RedListBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Check red list status
  const { data: redListStatus } = useQuery({
    queryKey: ["student-red-list-status", studentId, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_student_red_list_status", {
        p_student_id: studentId,
        p_tenant_id: tenantId,
      });

      if (error) {
        console.error("Error checking red list status:", error);
        return { is_blocked: false, blocking_reasons: [] };
      }

      if (data && data.length > 0) {
        return data[0];
      }

      return { is_blocked: false, blocking_reasons: [] };
    },
    enabled: !!studentId && !!tenantId,
  });

  // Fetch pending override requests for this student
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["student-pending-overrides", studentId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("gate_override_requests")
        .select("id, status, blocking_reason, override_reason, requested_at")
        .eq("student_id", studentId)
        .gte("requested_at", today.toISOString())
        .order("requested_at", { ascending: false });

      if (error) return [];
      return data || [];
    },
    enabled: !!studentId,
    refetchInterval: 10000,
  });

  if (isDismissed) return null;
  if (!redListStatus?.is_blocked && pendingRequests.length === 0) return null;

  const hasPendingRequest = pendingRequests.some((r) => r.status === "pending");
  const hasRejectedRequest = pendingRequests.some((r) => r.status === "rejected");
  const wasApproved = pendingRequests.some((r) => r.status === "approved");

  if (wasApproved && !redListStatus?.is_blocked) return null;

  return (
    <div className="mb-4 animate-in slide-in-from-top duration-300">
      <div
        className={`p-4 rounded-lg border ${
          hasPendingRequest
            ? "bg-warning/10 border-warning/30"
            : hasRejectedRequest
            ? "bg-destructive/10 border-destructive/30"
            : "bg-destructive/10 border-destructive/30"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-full ${
                hasPendingRequest
                  ? "bg-warning/20"
                  : "bg-destructive/20"
              }`}
            >
              {hasPendingRequest ? (
                <ShieldAlert className="h-5 w-5 text-warning" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                {hasPendingRequest
                  ? `${studentName} - Override Request Pending`
                  : hasRejectedRequest
                  ? `${studentName} - Override Request Rejected`
                  : `${studentName} - On Bursar's Red List`}
              </p>
              
              {redListStatus?.blocking_reasons && redListStatus.blocking_reasons.length > 0 && (
                <div className="space-y-0.5">
                  {redListStatus.blocking_reasons.map((reason: string, index: number) => (
                    <p key={index} className="text-sm text-muted-foreground flex items-center gap-1">
                      <X className="h-3 w-3 text-destructive" />
                      {reason}
                    </p>
                  ))}
                </div>
              )}

              {hasPendingRequest && (
                <p className="text-sm text-warning-foreground mt-2">
                  A gate entry request has been submitted and is awaiting bursar approval.
                </p>
              )}

              {hasRejectedRequest && !hasPendingRequest && (
                <p className="text-sm text-destructive mt-2">
                  The override request was rejected. Please contact the school to resolve.
                </p>
              )}

              {!hasPendingRequest && !hasRejectedRequest && (
                <p className="text-sm text-muted-foreground mt-2">
                  {studentName} may be blocked at the gate until this is resolved. Please contact the school or make payment.
                </p>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!hasPendingRequest && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Make Payment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
