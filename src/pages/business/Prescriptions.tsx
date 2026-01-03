import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pill, Search, Eye, CheckCircle, Clock, XCircle, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const Prescriptions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingPrescription, setViewingPrescription] = useState<any>(null);
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_name: "",
    doctor_phone: "",
    hospital_clinic: "",
    prescription_date: format(new Date(), "yyyy-MM-dd"),
    expiry_date: "",
    notes: "",
    items: [{ medication_name: "", dosage: "", frequency: "", duration: "", quantity: "1" }],
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile-prescriptions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      return data;
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-list', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await (supabase.from('patients') as any)
        .select('id, full_name, phone')
        .eq('tenant_id', profile.tenant_id)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ['prescriptions', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await (supabase.from('prescriptions') as any)
        .select('*, patients(full_name, phone)')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const filteredPrescriptions = prescriptions?.filter((rx: any) =>
    rx.prescription_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rx.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rx.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generatePrescriptionNumber = () => {
    const date = format(new Date(), "yyyyMMdd");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RX-${date}-${random}`;
  };

  const savePrescriptionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const prescriptionNumber = generatePrescriptionNumber();

      const { data: prescription, error } = await (supabase.from('prescriptions') as any)
        .insert([{
          tenant_id: profile!.tenant_id,
          patient_id: data.patient_id,
          prescription_number: prescriptionNumber,
          doctor_name: data.doctor_name || null,
          doctor_phone: data.doctor_phone || null,
          hospital_clinic: data.hospital_clinic || null,
          prescription_date: data.prescription_date,
          expiry_date: data.expiry_date || null,
          notes: data.notes || null,
          status: 'pending',
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Insert prescription items
      const items = data.items.filter(i => i.medication_name.trim());
      if (items.length > 0) {
        const { error: itemsError } = await (supabase.from('prescription_items') as any)
          .insert(items.map(item => ({
            prescription_id: prescription.id,
            medication_name: item.medication_name,
            dosage: item.dosage || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            quantity: parseInt(item.quantity) || 1,
          })));
        if (itemsError) throw itemsError;
      }

      return prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Prescription Created", description: "Prescription has been recorded" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const updateData: any = { status };
      if (status === 'dispensed') {
        updateData.dispensed_by = user?.id;
        updateData.dispensed_at = new Date().toISOString();
      }
      const { error } = await (supabase.from('prescriptions') as any)
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast({ title: "Status Updated" });
    },
  });

  const resetForm = () => {
    setFormData({
      patient_id: "",
      doctor_name: "",
      doctor_phone: "",
      hospital_clinic: "",
      prescription_date: format(new Date(), "yyyy-MM-dd"),
      expiry_date: "",
      notes: "",
      items: [{ medication_name: "", dosage: "", frequency: "", duration: "", quantity: "1" }],
    });
  };

  const addItem = () => {
    setFormData(p => ({
      ...p,
      items: [...p.items, { medication_name: "", dosage: "", frequency: "", duration: "", quantity: "1" }],
    }));
  };

  const updateItem = (index: number, field: string, value: string) => {
    setFormData(p => ({
      ...p,
      items: p.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'dispensed': return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Dispensed</Badge>;
      case 'cancelled': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Prescriptions</h1>
          <p className="text-muted-foreground">Manage and dispense prescriptions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Prescription</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Prescription</DialogTitle>
              <DialogDescription>Record a new prescription for dispensing</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); savePrescriptionMutation.mutate(formData); }} className="space-y-4">
              <div>
                <Label>Patient *</Label>
                <Select value={formData.patient_id} onValueChange={(v) => setFormData(p => ({ ...p, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.full_name} {patient.phone && `(${patient.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Doctor Name</Label>
                  <Input value={formData.doctor_name} onChange={(e) => setFormData(p => ({ ...p, doctor_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Doctor Phone</Label>
                  <Input value={formData.doctor_phone} onChange={(e) => setFormData(p => ({ ...p, doctor_phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Hospital/Clinic</Label>
                <Input value={formData.hospital_clinic} onChange={(e) => setFormData(p => ({ ...p, hospital_clinic: e.target.value }))} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Prescription Date</Label>
                  <Input type="date" value={formData.prescription_date} onChange={(e) => setFormData(p => ({ ...p, prescription_date: e.target.value }))} required />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input type="date" value={formData.expiry_date} onChange={(e) => setFormData(p => ({ ...p, expiry_date: e.target.value }))} />
                </div>
              </div>

              {/* Medications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Medications</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />Add
                  </Button>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                    <div className="col-span-4">
                      <Label className="text-xs">Medication *</Label>
                      <Input value={item.medication_name} onChange={(e) => updateItem(index, 'medication_name', e.target.value)} placeholder="Name" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Dosage</Label>
                      <Input value={item.dosage} onChange={(e) => updateItem(index, 'dosage', e.target.value)} placeholder="e.g., 500mg" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Frequency</Label>
                      <Input value={item.frequency} onChange={(e) => updateItem(index, 'frequency', e.target.value)} placeholder="e.g., 3x/day" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Duration</Label>
                      <Input value={item.duration} onChange={(e) => updateItem(index, 'duration', e.target.value)} placeholder="e.g., 7 days" />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={formData.items.length === 1}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." />
              </div>

              <Button type="submit" className="w-full" disabled={savePrescriptionMutation.isPending || !formData.patient_id}>
                {savePrescriptionMutation.isPending ? "Creating..." : "Create Prescription"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Prescriptions</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{prescriptions?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-600">{prescriptions?.filter((p: any) => p.status === 'pending').length || 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Dispensed Today</CardTitle></CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">
              {prescriptions?.filter((p: any) => p.status === 'dispensed' && p.dispensed_at?.startsWith(format(new Date(), "yyyy-MM-dd"))).length || 0}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">This Month</CardTitle></CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {prescriptions?.filter((p: any) => new Date(p.created_at).getMonth() === new Date().getMonth()).length || 0}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by RX number, patient, or doctor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 max-w-md" />
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Prescription Records</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : !filteredPrescriptions?.length ? (
            <div className="text-center py-8">
              <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No prescriptions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RX Number</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrescriptions.map((rx: any) => (
                  <TableRow key={rx.id}>
                    <TableCell className="font-mono text-sm">{rx.prescription_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rx.patients?.full_name}</p>
                        {rx.patients?.phone && <p className="text-xs text-muted-foreground">{rx.patients.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {rx.doctor_name || <span className="text-muted-foreground">-</span>}
                      {rx.hospital_clinic && <p className="text-xs text-muted-foreground">{rx.hospital_clinic}</p>}
                    </TableCell>
                    <TableCell>{format(new Date(rx.prescription_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{getStatusBadge(rx.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {rx.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: rx.id, status: 'dispensed' })}>
                            <CheckCircle className="h-4 w-4 mr-1" />Dispense
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => setViewingPrescription(rx)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewingPrescription} onOpenChange={() => setViewingPrescription(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>{viewingPrescription?.prescription_number}</DialogDescription>
          </DialogHeader>
          {viewingPrescription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Patient:</strong> {viewingPrescription.patients?.full_name}</div>
                <div><strong>Date:</strong> {format(new Date(viewingPrescription.prescription_date), "MMM d, yyyy")}</div>
                <div><strong>Doctor:</strong> {viewingPrescription.doctor_name || "-"}</div>
                <div><strong>Hospital:</strong> {viewingPrescription.hospital_clinic || "-"}</div>
              </div>
              {viewingPrescription.notes && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <strong>Notes:</strong> {viewingPrescription.notes}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Status: {getStatusBadge(viewingPrescription.status)}</span>
                {viewingPrescription.status === 'pending' && (
                  <Button onClick={() => { updateStatusMutation.mutate({ id: viewingPrescription.id, status: 'dispensed' }); setViewingPrescription(null); }}>
                    Mark as Dispensed
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Prescriptions;
