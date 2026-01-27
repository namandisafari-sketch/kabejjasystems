import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Clock, ShieldAlert, User, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface OverrideRequest {
  id: string;
  student_id: string;
  blocking_reason: string;
  override_reason: string;
  requested_at: string;
  status: string;
  valid_for_date: string;
  reviewer_notes: string | null;
  students: {
    full_name: string;
    admission_number: string;
    school_classes: { name: string } | null;
  };
}

interface OverrideRequestsPanelProps {
  showPendingOnly?: boolean;
  maxHeight?: string;
}

export function OverrideRequestsPanel({ 
  showPendingOnly = true,
  maxHeight = "400px" 
}: OverrideRequestsPanelProps) {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();
  
  const [selectedRequest, setSelectedRequest] = useState<OverrideRequest | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");

  // Fetch override requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["override-requests", tenantId, showPendingOnly],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let query = supabase
        .from("gate_override_requests")
        .select(`
          *,
          students (
            full_name,
            admission_number,
            school_classes (name)
          )
        `)
        .eq("tenant_id", tenantId)
        .gte("requested_at", today.toISOString())
        .order("requested_at", { ascending: false });

      if (showPendingOnly) {
        query = query.eq("status", "pending");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OverrideRequest[];
    },
    enabled: !!tenantId,
    refetchInterval: 5000,
  });

  // Approve/Reject mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      requestId,
      status,
      notes,
    }: {
      requestId: string;
      status: "approved" | "rejected";
      notes: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const request = requests.find((r) => r.id === requestId);
      
      if (!request) throw new Error("Request not found");

      // Update the request status
      const { error: updateError } = await supabase
        .from("gate_override_requests")
        .update({
          status,
          reviewed_by: userData.user?.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes || null,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved, record the arrival
      if (status === "approved") {
        const { data: checkinData, error: checkinError } = await supabase
          .from("gate_checkins")
          .insert({
            tenant_id: tenantId,
            student_id: request.student_id,
            check_type: "arrival",
            is_late: false,
            was_blocked: true,
            override_request_id: requestId,
            notes: `Override approved: ${request.override_reason}`,
          })
          .select()
          .single();

        if (checkinError) throw checkinError;

        // Link the checkin to the request
        await supabase
          .from("gate_override_requests")
          .update({ gate_checkin_id: checkinData.id })
          .eq("id", requestId);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["override-requests"] });
      queryClient.invalidateQueries({ queryKey: ["gate-checkins"] });
      toast.success(
        variables.status === "approved"
          ? "Override approved - student can enter"
          : "Override rejected"
      );
      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewerNotes("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleReview = (request: OverrideRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setReviewerNotes("");
    setIsReviewDialogOpen(true);
  };

  const handleConfirmReview = () => {
    if (!selectedRequest) return;
    reviewMutation.mutate({
      requestId: selectedRequest.id,
      status: actionType === "approve" ? "approved" : "rejected",
      notes: reviewerNotes,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-warning" />
              Override Requests
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Students blocked by bursar rules requesting entry
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No pending override requests</p>
          </div>
        ) : (
          <ScrollArea style={{ height: maxHeight }}>
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 rounded-lg border ${
                    request.status === "pending"
                      ? "bg-warning/5 border-warning/30"
                      : request.status === "approved"
                      ? "bg-success/5 border-success/30"
                      : "bg-destructive/5 border-destructive/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium truncate">
                          {request.students?.full_name}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {request.students?.admission_number} •{" "}
                        {request.students?.school_classes?.name}
                      </p>
                      
                      <div className="space-y-1">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                          <span className="text-xs text-destructive">
                            {request.blocking_reason}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium">Reason given:</span>
                          <span className="text-xs text-muted-foreground">
                            {request.override_reason}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(request.requested_at), "h:mm a")}
                      </p>
                    </div>

                    {request.status === "pending" && (
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => handleReview(request, "approve")}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          onClick={() => handleReview(request, "reject")}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Override" : "Reject Override"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{selectedRequest.students?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.students?.admission_number}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder={
                    actionType === "approve"
                      ? "e.g., Payment confirmed, allow entry"
                      : "e.g., Balance too high, cannot approve"
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleConfirmReview}
              disabled={reviewMutation.isPending}
            >
              {actionType === "approve" ? "Approve Entry" : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
