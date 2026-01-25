import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Clock, Search, Loader2 } from "lucide-react";

interface SubscriptionRequest {
  id: string;
  tenant_id: string;
  package_id: string;
  billing_cycle: string;
  amount: number;
  billing_email: string;
  billing_phone: string;
  first_name: string;
  last_name: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  tenants?: { name: string; business_type: string };
  subscription_packages?: { name: string };
}

export default function AdminSubscriptionRequests() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-subscription-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("subscription_requests")
        .select(`
          *,
          tenants:tenant_id (name, business_type),
          subscription_packages:package_id (name)
        `)
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      return data as SubscriptionRequest[];
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await (supabase
        .from("subscription_requests")
        .update({
          status,
          admin_notes: notes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id) as any);

      if (error) throw error;

      // If approved, update tenant subscription
      if (status === "approved" && selectedRequest) {
        const { error: tenantError } = await supabase
          .from("tenants")
          .update({
            subscription_status: "active",
            subscription_end_date: getSubscriptionEndDate(selectedRequest.billing_cycle),
            is_trial: false,
            status: "active",
          })
          .eq("id", selectedRequest.tenant_id);

        if (tenantError) throw tenantError;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-requests"] });
      toast.success(`Request ${status === "approved" ? "approved" : "rejected"} successfully`);
      setSelectedRequest(null);
      setDialogAction(null);
      setAdminNotes("");
    },
    onError: (error) => {
      console.error("Failed to update request:", error);
      toast.error("Failed to update request");
    },
  });

  const getSubscriptionEndDate = (billingCycle: string) => {
    const date = new Date();
    if (billingCycle === "yearly") {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    return date.toISOString();
  };

  const handleAction = (request: SubscriptionRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setDialogAction(action);
    setAdminNotes(request.admin_notes || "");
  };

  const handleConfirmAction = () => {
    if (!selectedRequest || !dialogAction) return;
    
    updateRequestMutation.mutate({
      id: selectedRequest.id,
      status: dialogAction === "approve" ? "approved" : "rejected",
      notes: adminNotes,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredRequests = requests?.filter(req =>
    req.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.billing_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = requests?.filter(r => r.status === "pending").length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Requests</h1>
          <p className="text-muted-foreground">Review and approve subscription requests from tenants</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-orange-500">{pendingCount} Pending</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>{requests?.length || 0} total requests</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.tenants?.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {request.tenants?.business_type?.replace("_", " ")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.first_name} {request.last_name}</p>
                      <p className="text-sm text-muted-foreground">{request.billing_email}</p>
                      <p className="text-sm text-muted-foreground">{request.billing_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.subscription_packages?.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{request.billing_cycle}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-UG", {
                      style: "currency",
                      currency: "UGX",
                      minimumFractionDigits: 0,
                    }).format(request.amount)}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    {format(new Date(request.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === "pending" ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleAction(request, "approve")}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleAction(request, "reject")}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {request.admin_notes && `Note: ${request.admin_notes.substring(0, 30)}...`}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredRequests || filteredRequests.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No subscription requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!dialogAction} onOpenChange={() => { setDialogAction(null); setSelectedRequest(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "approve" ? "Approve Subscription Request" : "Reject Subscription Request"}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "approve" 
                ? "This will activate the subscription for this tenant immediately."
                : "This will reject the subscription request. You can add a note explaining the reason."}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Business:</strong> {selectedRequest.tenants?.name}</p>
                <p><strong>Package:</strong> {selectedRequest.subscription_packages?.name}</p>
                <p><strong>Amount:</strong> {new Intl.NumberFormat("en-UG", {
                  style: "currency",
                  currency: "UGX",
                  minimumFractionDigits: 0,
                }).format(selectedRequest.amount)}</p>
                <p><strong>Billing Cycle:</strong> {selectedRequest.billing_cycle}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={dialogAction === "approve" ? "Optional: Add any notes..." : "Reason for rejection..."}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogAction(null); setSelectedRequest(null); }}>
              Cancel
            </Button>
            <Button
              variant={dialogAction === "approve" ? "default" : "destructive"}
              onClick={handleConfirmAction}
              disabled={updateRequestMutation.isPending}
            >
              {updateRequestMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : dialogAction === "approve" ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {dialogAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
