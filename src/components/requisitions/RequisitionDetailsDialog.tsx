import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useRequisition,
  useRequisitionApprovals,
  useRequisitionActivity,
  useSubmitRequisition,
  useApproveRequisition,
  useRejectRequisition,
  RequisitionStatus,
} from "@/hooks/use-requisitions";
import { 
  Loader2, Send, CheckCircle, XCircle, Clock, FileText,
  User, Calendar, DollarSign, MessageSquare, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RequisitionDetailsDialogProps {
  requisitionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<RequisitionStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_level1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  pending_level2: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  pending_level3: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  partially_approved: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const roleLabels: Record<string, string> = {
  hod: 'Head of Department',
  bursar: 'Bursar',
  head_teacher: 'Head Teacher',
  director: 'Director',
  admin: 'Administrator',
};

const typeLabels: Record<string, string> = {
  cash_advance: 'Cash Advance',
  reimbursement: 'Reimbursement',
  purchase_request: 'Purchase Request',
};

export function RequisitionDetailsDialog({ 
  requisitionId, 
  open, 
  onOpenChange 
}: RequisitionDetailsDialogProps) {
  const { data: requisition, isLoading } = useRequisition(requisitionId);
  const { data: approvals } = useRequisitionApprovals(requisitionId);
  const { data: activities } = useRequisitionActivity(requisitionId);
  
  const submitRequisition = useSubmitRequisition();
  const approveRequisition = useApproveRequisition();
  const rejectRequisition = useRejectRequisition();
  
  const [approvalAmount, setApprovalAmount] = useState<string>('');
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!requisitionId) return null;

  const handleSubmit = async () => {
    if (!requisitionId) return;
    await submitRequisition.mutateAsync(requisitionId);
  };

  const handleApprove = async () => {
    const currentApproval = approvals?.find(
      a => a.approval_level === requisition?.current_approval_level && a.status === 'pending'
    );
    if (!currentApproval || !requisitionId) return;
    
    await approveRequisition.mutateAsync({
      requisitionId,
      approvalId: currentApproval.id,
      amountApproved: approvalAmount ? parseFloat(approvalAmount) : requisition?.amount_requested,
      comments: approvalComments,
    });
    setApprovalAmount('');
    setApprovalComments('');
  };

  const handleReject = async () => {
    const currentApproval = approvals?.find(
      a => a.approval_level === requisition?.current_approval_level && a.status === 'pending'
    );
    if (!currentApproval || !requisitionId || !rejectionReason) return;
    
    await rejectRequisition.mutateAsync({
      requisitionId,
      approvalId: currentApproval.id,
      reason: rejectionReason,
    });
    setRejectionReason('');
    setShowRejectForm(false);
  };

  const isPending = requisition?.status.startsWith('pending');
  const isDraft = requisition?.status === 'draft';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="font-mono">{requisition?.requisition_number}</DialogTitle>
            {requisition && (
              <Badge className={statusColors[requisition.status]}>
                {requisition.status.replace(/_/g, ' ').replace('level', 'Level ')}
              </Badge>
            )}
          </div>
          <DialogDescription>
            {requisition && typeLabels[requisition.requisition_type]}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : requisition ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Requested By</p>
                    <p className="font-medium">{requisition.requester_name}</p>
                    {requisition.department && (
                      <p className="text-xs text-muted-foreground">{requisition.department}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(requisition.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Amount Requested</p>
                    <p className="font-medium">UGX {requisition.amount_requested.toLocaleString()}</p>
                  </div>
                </div>
                {requisition.amount_approved && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Amount Approved</p>
                      <p className="font-medium text-green-600">
                        UGX {requisition.amount_approved.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Purpose & Description */}
              <div>
                <h4 className="font-medium mb-2">Purpose</h4>
                <p>{requisition.purpose}</p>
                {requisition.description && (
                  <p className="text-sm text-muted-foreground mt-2">{requisition.description}</p>
                )}
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                {requisition.expense_category && (
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p>{requisition.expense_category}</p>
                  </div>
                )}
                {requisition.payment_method && (
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="capitalize">{requisition.payment_method.replace('_', ' ')}</p>
                  </div>
                )}
                {requisition.urgency && (
                  <div>
                    <p className="text-muted-foreground">Urgency</p>
                    <Badge variant={requisition.urgency === 'urgent' ? 'destructive' : 'outline'}>
                      {requisition.urgency}
                    </Badge>
                  </div>
                )}
              </div>

              {requisition.rejection_reason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Rejection Reason</span>
                  </div>
                  <p className="text-sm">{requisition.rejection_reason}</p>
                </div>
              )}

              <Separator />

              {/* Approval Workflow */}
              <div>
                <h4 className="font-medium mb-3">Approval Workflow</h4>
                <div className="space-y-3">
                  {approvals?.map((approval, index) => (
                    <div 
                      key={approval.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        approval.status === 'approved' && "bg-green-50 dark:bg-green-950 border-green-200",
                        approval.status === 'rejected' && "bg-red-50 dark:bg-red-950 border-red-200",
                        approval.status === 'pending' && approval.approval_level === requisition.current_approval_level && "bg-yellow-50 dark:bg-yellow-950 border-yellow-200",
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                        approval.status === 'approved' && "bg-green-600 text-white",
                        approval.status === 'rejected' && "bg-red-600 text-white",
                        approval.status === 'pending' && "bg-muted text-muted-foreground",
                      )}>
                        {approval.status === 'approved' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : approval.status === 'rejected' ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{roleLabels[approval.approver_role] || approval.approver_role}</p>
                        {approval.approver_name && (
                          <p className="text-sm text-muted-foreground">{approval.approver_name}</p>
                        )}
                        {approval.comments && (
                          <p className="text-sm mt-1">{approval.comments}</p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        {approval.approved_at ? (
                          <p className="text-muted-foreground">
                            {format(new Date(approval.approved_at), 'MMM d, h:mm a')}
                          </p>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                        {approval.amount_approved && (
                          <p className="text-green-600 font-medium">
                            UGX {approval.amount_approved.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Log */}
              {activities && activities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Activity</h4>
                    <div className="space-y-2">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-2 text-sm">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <span className="font-medium">{activity.user_name || 'System'}</span>
                            <span className="text-muted-foreground"> {activity.action}</span>
                            {activity.details && (
                              <p className="text-muted-foreground">{activity.details}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              {isDraft && (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitRequisition.isPending}
                    className="w-full"
                  >
                    {submitRequisition.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit for Approval
                  </Button>
                </div>
              )}

              {isPending && (
                <div className="pt-4 border-t space-y-4">
                  <div className="space-y-2">
                    <Label>Approved Amount (optional - leave blank for full amount)</Label>
                    <Input
                      type="number"
                      placeholder={requisition.amount_requested.toString()}
                      value={approvalAmount}
                      onChange={(e) => setApprovalAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Comments (optional)</Label>
                    <Textarea
                      placeholder="Add approval comments..."
                      value={approvalComments}
                      onChange={(e) => setApprovalComments(e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  {showRejectForm ? (
                    <div className="space-y-2">
                      <Label>Rejection Reason</Label>
                      <Textarea
                        placeholder="Please provide a reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowRejectForm(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleReject}
                          disabled={!rejectionReason || rejectRequisition.isPending}
                          className="flex-1"
                        >
                          {rejectRequisition.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Confirm Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectForm(true)}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={handleApprove}
                        disabled={approveRequisition.isPending}
                        className="flex-1"
                      >
                        {approveRequisition.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
