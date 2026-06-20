import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pill, Search, Eye, CheckCircle, Clock, XCircle, FileText, Printer, Download, Calendar, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PrescriptionItem {
  medication_name: string;
  product_id: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  unit_price: number;
  total_price: number;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  unit_price: number;
  stock_quantity: number;
  unit_of_measure: string | null;
  expiry_date: string | null;
  batch_no: string | null;
}

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
    items: [{ medication_name: "", product_id: "", dosage: "", frequency: "", duration: "", quantity: "1", unit_price: 0, total_price: 0 }] as PrescriptionItem[],
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

  const { data: products = [] } = useQuery({
    queryKey: ['products-for-rx', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, unit_price, stock_quantity, unit_of_measure, expiry_date, batch_no')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('expiry_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as Product[];
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ['prescriptions', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await (supabase.from('prescriptions') as any)
        .select('*, patients(full_name, phone), prescription_items(*)')
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

      const items = data.items.filter(i => i.medication_name.trim());
      if (items.length > 0) {
        const { error: itemsError } = await (supabase.from('prescription_items') as any)
          .insert(items.map(item => ({
            prescription_id: prescription.id,
            medication_name: item.medication_name,
            product_id: item.product_id || null,
            dosage: item.dosage || null,
            frequency: item.frequency || null,
            duration: item.duration || null,
            quantity: parseInt(item.quantity) || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || 0,
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

        const { data: rx } = await (supabase.from('prescriptions') as any)
          .select('*, prescription_items(*)')
          .eq('id', id)
          .single();

        if (rx?.prescription_items) {
          for (const item of rx.prescription_items) {
            if (item.product_id) {
              const { data: product } = await supabase
                .from('products')
                .select('stock_quantity, name, batch_no, expiry_date')
                .eq('id', item.product_id)
                .single();

              if (product && product.stock_quantity != null) {
                let remaining = item.quantity || 0;

                // FEFO: find all batches of same product, deduct from soonest-expiring first
                const { data: sameProducts } = await supabase
                  .from('products')
                  .select('id, stock_quantity, expiry_date, batch_no')
                  .eq('tenant_id', profile!.tenant_id)
                  .eq('name', product.name)
                  .gt('stock_quantity', 0)
                  .not('expiry_date', 'is', null)
                  .order('expiry_date', { ascending: true });

                const batches = sameProducts?.filter(p => p.expiry_date && new Date(p.expiry_date) >= new Date()) || [];

                for (const batch of batches) {
                  if (remaining <= 0) break;
                  const deduct = Math.min(remaining, batch.stock_quantity);
                  await supabase
                    .from('products')
                    .update({ stock_quantity: batch.stock_quantity - deduct })
                    .eq('id', batch.id);
                  remaining -= deduct;
                }

                if (remaining > 0) {
                  const newQty = Math.max(0, product.stock_quantity - (item.quantity || 0));
                  await supabase
                    .from('products')
                    .update({ stock_quantity: newQty })
                    .eq('id', item.product_id);
                }
              }
            }
          }
        }
      }
      const { error } = await (supabase.from('prescriptions') as any)
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products-stock'] });
      toast({ title: "Status Updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      items: [{ medication_name: "", product_id: "", dosage: "", frequency: "", duration: "", quantity: "1", unit_price: 0, total_price: 0 }],
    });
  };

  const addItem = () => {
    setFormData(p => ({
      ...p,
      items: [...p.items, { medication_name: "", product_id: "", dosage: "", frequency: "", duration: "", quantity: "1", unit_price: 0, total_price: 0 }],
    }));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setFormData(p => {
      const newItems = p.items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };

        if (field === 'product_id') {
          const product = products.find(pr => pr.id === value);
          if (product) {
            updated.medication_name = product.name;
            updated.unit_price = product.unit_price;
            updated.total_price = product.unit_price * (parseInt(updated.quantity) || 1);
          }
        }

        if (field === 'quantity') {
          updated.total_price = updated.unit_price * (parseInt(value as string) || 1);
        }

        return updated;
      });
      return { ...p, items: newItems };
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'verified': return <Badge variant="default" className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'dispensed': return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Dispensed</Badge>;
      case 'cancelled': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const printPrescription = (rx: any) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const items = rx.prescription_items || [];
    const total = items.reduce((sum: number, i: any) => sum + (Number(i.total_price) || i.unit_price * i.quantity || 0), 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - ${rx.prescription_number}</title>
        <style>
          @page { margin: 15mm; size: A5 landscape; }
          body { font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.4; color: #000; margin: 0; padding: 0; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
          .header h1 { font-size: 16px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
          .header p { margin: 2px 0; font-size: 10px; }
          .rx-number { font-size: 14px; font-weight: bold; text-align: center; margin: 8px 0; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 10px; }
          .info-grid div { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
          th { border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 9px; text-transform: uppercase; }
          td { border-bottom: 1px dotted #ccc; padding: 4px 6px; }
          .total-row td { border-top: 2px solid #000; font-weight: bold; border-bottom: none; }
          .footer { margin-top: 16px; border-top: 1px solid #000; padding-top: 8px; font-size: 9px; text-align: center; }
          .notes { margin-top: 8px; padding: 6px; border: 1px dashed #999; font-size: 9px; }
          .status-badge { display: inline-block; padding: 2px 8px; border: 1px solid #000; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
          @media print {
            body { margin: 0; padding: 10mm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Prescription</h1>
          <p>${rx.hospital_clinic || 'Pharmacy'}</p>
        </div>
        <div class="rx-number">#${rx.prescription_number}</div>
        <div class="info-grid">
          <div>
            <strong>Patient:</strong> ${rx.patients?.full_name || 'N/A'}<br>
            ${rx.patients?.phone ? `<strong>Phone:</strong> ${rx.patients.phone}<br>` : ''}
          </div>
          <div style="text-align: right;">
            <strong>Date:</strong> ${new Date(rx.prescription_date).toLocaleDateString('en-GB')}<br>
            ${rx.doctor_name ? `<strong>Doctor:</strong> Dr. ${rx.doctor_name}<br>` : ''}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:5%">#</th>
              <th style="width:30%">Medication</th>
              <th style="width:15%">Dosage</th>
              <th style="width:15%">Frequency</th>
              <th style="width:10%">Duration</th>
              <th style="width:8%;text-align:right">Qty</th>
              <th style="width:17%;text-align:right">Price</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.medication_name}</td>
                <td>${item.dosage || '-'}</td>
                <td>${item.frequency || '-'}</td>
                <td>${item.duration || '-'}</td>
                <td style="text-align:right">${item.quantity}</td>
                <td style="text-align:right">${formatCurrency(item.unit_price * item.quantity)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="6" style="text-align:right">Total:</td>
              <td style="text-align:right">${formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span class="status-badge">${rx.status.toUpperCase()}</span>
          ${rx.expiry_date ? `<span style="font-size:9px;">Valid until: ${new Date(rx.expiry_date).toLocaleDateString('en-GB')}</span>` : ''}
        </div>
        ${rx.notes ? `<div class="notes"><strong>Notes:</strong> ${rx.notes}</div>` : ''}
        ${rx.dispensed_at ? `<div style="margin-top:6px;font-size:9px;">Dispensed: ${new Date(rx.dispensed_at).toLocaleString('en-GB')}</div>` : ''}
        <div class="footer">
          <p>This is a computer-generated prescription</p>
          <p style="font-size:8px;color:#666;">TennaHub Pharmacy System &bull; Generated ${new Date().toLocaleString('en-GB')}</p>
        </div>
        <div class="no-print" style="text-align:center;margin-top:20px;">
          <button onclick="window.print();window.close();" style="padding:8px 24px;font-size:14px;cursor:pointer;">
            Print Prescription
          </button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Label className="text-xs">Product *</Label>
                        <Select
                          value={item.product_id}
                          onValueChange={(v) => updateItem(index, 'product_id', v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                           <SelectContent>
                             {products.map((pr) => (
                               <SelectItem key={pr.id} value={pr.id} disabled={pr.stock_quantity <= 0}>
                                 {pr.name}{pr.batch_no ? ` (${pr.batch_no})` : ""}{pr.expiry_date ? ` [Exp: ${format(new Date(pr.expiry_date), "MMM yy")}]` : ""} - {pr.stock_quantity}
                               </SelectItem>
                             ))}
                           </SelectContent>
                        </Select>
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
                        <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={formData.items.length === 1}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {item.product_id && (
                      <div className="text-xs text-muted-foreground flex gap-4">
                        <span>Unit Price: {formatCurrency(item.unit_price)}</span>
                        <span>Total: {formatCurrency(item.total_price)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." />
              </div>

              {formData.items.some(i => i.product_id) && (
                <div className="bg-muted p-3 rounded-lg text-sm flex justify-between">
                  <span className="font-medium">Estimated Total:</span>
                  <span className="font-bold">{formatCurrency(formData.items.reduce((sum, i) => sum + i.total_price, 0))}</span>
                </div>
              )}

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
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
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
                    <TableCell>{rx.prescription_items?.length || 0} items</TableCell>
                    <TableCell className="font-medium">
                      {rx.prescription_items?.length > 0
                        ? formatCurrency(rx.prescription_items.reduce((sum: number, i: any) => sum + (i.total_price || 0), 0))
                        : "-"}
                    </TableCell>
                    <TableCell>{format(new Date(rx.prescription_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{getStatusBadge(rx.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {rx.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: rx.id, status: 'verified' })}>
                            <CheckCircle className="h-4 w-4 mr-1" />Verify
                          </Button>
                        )}
                        {rx.status === 'verified' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: rx.id, status: 'dispensed' })}>
                            <CheckCircle className="h-4 w-4 mr-1" />Dispense
                          </Button>
                        )}
                        {rx.status === 'pending' && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatusMutation.mutate({ id: rx.id, status: 'cancelled' })}>
                            <XCircle className="h-4 w-4 mr-1" />Cancel
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => printPrescription(rx)} title="Print">
                          <Printer className="h-4 w-4" />
                        </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>{viewingPrescription?.prescription_number}</DialogDescription>
          </DialogHeader>
          {viewingPrescription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Patient:</strong> {viewingPrescription.patients?.full_name}</div>
                <div><strong>Date:</strong> {format(new Date(viewingPrescription.prescription_date), "MMM d, yyyy")}</div>
                <div><strong>Doctor:</strong> {viewingPrescription.doctor_name || "-"}</div>
                <div><strong>Hospital:</strong> {viewingPrescription.hospital_clinic || "-"}</div>
              </div>

              {viewingPrescription.prescription_items?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Medications</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Freq</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingPrescription.prescription_items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.medication_name}</TableCell>
                          <TableCell>{item.dosage || "-"}</TableCell>
                          <TableCell>{item.frequency || "-"}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit_price ? formatCurrency(item.unit_price * item.quantity) : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between mt-2 text-sm font-bold">
                    <span>Total:</span>
                    <span>
                      {formatCurrency(viewingPrescription.prescription_items.reduce((sum: number, i: any) => sum + (i.total_price || i.unit_price * i.quantity || 0), 0))}
                    </span>
                  </div>
                </div>
              )}

              {viewingPrescription.notes && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <strong>Notes:</strong> {viewingPrescription.notes}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>Status: {getStatusBadge(viewingPrescription.status)}</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => printPrescription(viewingPrescription)}>
                    <Printer className="h-4 w-4 mr-1" />Print
                  </Button>
                  {viewingPrescription.status === 'pending' && (
                    <Button onClick={() => { updateStatusMutation.mutate({ id: viewingPrescription.id, status: 'verified' }); setViewingPrescription(null); }}>
                      <CheckCircle className="h-4 w-4 mr-1" />Verify
                    </Button>
                  )}
                  {viewingPrescription.status === 'verified' && (
                    <Button onClick={() => { updateStatusMutation.mutate({ id: viewingPrescription.id, status: 'dispensed' }); setViewingPrescription(null); }}>
                      <CheckCircle className="h-4 w-4 mr-1" />Dispense
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Prescriptions;
