import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Receipt, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";

export default function RentalPaymentProofs() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch payment proofs
  const { data: proofs = [], isLoading } = useQuery({
    queryKey: ['rental-payment-proofs', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_payment_proofs')
        .select(`
          *,
          rental_id_cards(
            card_number,
            rental_units(unit_number, rental_properties(name)),
            rental_tenants(full_name)
          ),
          leases(monthly_rent)
        `)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async (proofId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('rental_payment_proofs')
        .update({
          status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', proofId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-payment-proofs'] });
      setViewOpen(false);
      setSelectedProof(null);
      toast({ title: "Payment verified successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ proofId, reason }: { proofId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('rental_payment_proofs')
        .update({
          status: 'rejected',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', proofId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-payment-proofs'] });
      setRejectOpen(false);
      setViewOpen(false);
      setSelectedProof(null);
      setRejectionReason('');
      toast({ title: "Payment rejected" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-amber-500 text-amber-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'verified':
        return <Badge className="bg-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'mtn':
        return <Badge className="bg-yellow-500 text-black">MTN MoMo</Badge>;
      case 'airtel':
        return <Badge className="bg-red-500">Airtel Money</Badge>;
      case 'bank':
        return <Badge variant="secondary">Bank Transfer</Badge>;
      default:
        return <Badge variant="outline">{provider}</Badge>;
    }
  };

  const pendingProofs = proofs.filter(p => p.status === 'pending');
  const verifiedProofs = proofs.filter(p => p.status === 'verified');
  const rejectedProofs = proofs.filter(p => p.status === 'rejected');

  // Calculate totals
  const pendingTotal = pendingProofs.reduce((sum, p) => sum + Number(p.amount), 0);
  const verifiedTotal = verifiedProofs.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Proofs</h1>
          <p className="text-muted-foreground">Review and verify payment submissions from tenants</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingProofs.length}</div>
            <p className="text-xs text-muted-foreground">UGX {pendingTotal.toLocaleString()} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{verifiedProofs.length}</div>
            <p className="text-xs text-muted-foreground">UGX {verifiedTotal.toLocaleString()} verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{rejectedProofs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Proofs Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Proofs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="pending" className="w-full">
            <div className="px-6">
              <TabsList>
                <TabsTrigger value="pending">Pending ({pendingProofs.length})</TabsTrigger>
                <TabsTrigger value="verified">Verified ({verifiedProofs.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedProofs.length})</TabsTrigger>
              </TabsList>
            </div>

            {['pending', 'verified', 'rejected'].map(tab => (
              <TabsContent key={tab} value={tab} className="m-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Card / Unit</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tab === 'pending' ? pendingProofs : tab === 'verified' ? verifiedProofs : rejectedProofs).map(proof => (
                      <TableRow key={proof.id}>
                        <TableCell>
                          {format(new Date(proof.payment_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs">{(proof.rental_id_cards as any)?.card_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {(proof.rental_id_cards as any)?.rental_units?.rental_properties?.name} - {(proof.rental_id_cards as any)?.rental_units?.unit_number}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{proof.payer_name}</TableCell>
                        <TableCell>{getProviderBadge(proof.payment_provider)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {proof.transaction_reference || '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          UGX {Number(proof.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(proof.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedProof(proof);
                              setViewOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(tab === 'pending' ? pendingProofs : tab === 'verified' ? verifiedProofs : rejectedProofs).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No {tab} payment proofs
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* View/Action Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Proof Details</DialogTitle>
            <DialogDescription>Review and verify this payment submission</DialogDescription>
          </DialogHeader>
          {selectedProof && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Card Number</div>
                  <div className="font-mono font-bold">{(selectedProof.rental_id_cards as any)?.card_number}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Payment Date</div>
                  <div className="font-medium">{format(new Date(selectedProof.payment_date), 'MMMM d, yyyy')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Payer Name</div>
                  <div className="font-medium">{selectedProof.payer_name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Amount</div>
                  <div className="font-bold text-lg">UGX {Number(selectedProof.amount).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Provider</div>
                  <div>{getProviderBadge(selectedProof.payment_provider)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reference</div>
                  <div className="font-mono text-xs">{selectedProof.transaction_reference || 'Not provided'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">Unit</div>
                  <div>{(selectedProof.rental_id_cards as any)?.rental_units?.rental_properties?.name} - {(selectedProof.rental_id_cards as any)?.rental_units?.unit_number}</div>
                </div>
                {selectedProof.notes && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Notes</div>
                    <div className="text-sm">{selectedProof.notes}</div>
                  </div>
                )}
                {selectedProof.rejection_reason && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-destructive">Rejection Reason</div>
                    <div className="text-sm text-destructive">{selectedProof.rejection_reason}</div>
                  </div>
                )}
              </div>

              {selectedProof.status === 'pending' && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setRejectOpen(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    onClick={() => verifyMutation.mutate(selectedProof.id)}
                    disabled={verifyMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify Payment
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment Proof</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this payment proof</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g., Transaction reference not found, amount doesn't match..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive"
                onClick={() => rejectMutation.mutate({ proofId: selectedProof?.id, reason: rejectionReason })}
                disabled={!rejectionReason || rejectMutation.isPending}
              >
                Reject Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
