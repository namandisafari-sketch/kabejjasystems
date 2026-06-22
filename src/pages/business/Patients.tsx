import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/i18n";
import { Plus, HeartPulse, Search, Edit, Trash2, User, Phone, Calendar, FileText, Pill, Clock, CheckCircle, XCircle, Eye, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import PrescriptionUpload from "@/components/business/PrescriptionUpload";

interface Prescription {
  id: string;
  prescription_number: string;
  doctor_name: string | null;
  hospital_clinic: string | null;
  prescription_date: string;
  status: string;
  total_cost: number;
  created_at: string;
  prescription_items: Array<{
    id: string;
    medication_name: string;
    dosage: string | null;
    frequency: string | null;
    quantity: number;
    unit_price: number;
  }>;
}

const Patients = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [viewingHistoryPatient, setViewingHistoryPatient] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
    allergies: "",
    medical_notes: "",
    insurance_provider: "",
    insurance_number: "",
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile-patients'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      return data;
    },
  });

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await (supabase.from('patients') as any)
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const filteredPatients = patients?.filter((patient: any) =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm)
  );

  const savePatientMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (editingPatient) {
        const { error } = await (supabase.from('patients') as any)
          .update({ ...data, date_of_birth: data.date_of_birth || null })
          .eq('id', editingPatient.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('patients') as any)
          .insert([{ ...data, date_of_birth: data.date_of_birth || null, tenant_id: profile!.tenant_id, created_by: user.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsDialogOpen(false);
      setEditingPatient(null);
      resetForm();
      toast({ title: editingPatient ? t.messages.toastTitles[820] : t.messages.toastTitles[820], description: t.messages.toastDescriptions.patientSaved });
    },
    onError: (error: any) => {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('patients') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({ title: t.messages.toastTitles[820] });
    },
  });

  const resetForm = () => {
    setFormData({
      full_name: "", phone: "", email: "", date_of_birth: "", gender: "", address: "",
      emergency_contact: "", emergency_phone: "", allergies: "", medical_notes: "",
      insurance_provider: "", insurance_number: "",
    });
  };

  const handleEdit = (patient: any) => {
    setEditingPatient(patient);
    setFormData({
      full_name: patient.full_name, phone: patient.phone || "", email: patient.email || "",
      date_of_birth: patient.date_of_birth || "", gender: patient.gender || "", address: patient.address || "",
      emergency_contact: patient.emergency_contact || "", emergency_phone: patient.emergency_phone || "",
      allergies: patient.allergies || "", medical_notes: patient.medical_notes || "",
      insurance_provider: patient.insurance_provider || "", insurance_number: patient.insurance_number || "",
    });
    setIsDialogOpen(true);
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t.fees.pending}</Badge>;
      case 'dispensed': return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Dispensed</Badge>;
      case 'cancelled': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t.common.cancel}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t.navigation.moduleRoutes.patients}</h1>
          <p className="text-muted-foreground">{t.common.description}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingPatient(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t.common.add}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPatient ? t.common.edit : t.common.add}</DialogTitle>
              <DialogDescription>{t.common.description}</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); savePatientMutation.mutate(formData); }} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Full Name *</Label><Input value={formData.full_name} onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))} required /></div>
                <div><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label>Date of Birth</Label><Input type="date" value={formData.date_of_birth} onChange={(e) => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} /></div>
                <div>
                  <Label>Gender</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} /></div>
              </div>
              <div><Label>Address</Label><Input value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Emergency Contact</Label><Input value={formData.emergency_contact} onChange={(e) => setFormData(p => ({ ...p, emergency_contact: e.target.value }))} /></div>
                <div><Label>Emergency Phone</Label><Input value={formData.emergency_phone} onChange={(e) => setFormData(p => ({ ...p, emergency_phone: e.target.value }))} /></div>
              </div>
              <div><Label>Known Allergies</Label><Textarea value={formData.allergies} onChange={(e) => setFormData(p => ({ ...p, allergies: e.target.value }))} placeholder="List any known allergies..." rows={2} /></div>
              <div><Label>Medical Notes</Label><Textarea value={formData.medical_notes} onChange={(e) => setFormData(p => ({ ...p, medical_notes: e.target.value }))} placeholder="Medical history, conditions..." rows={2} /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Insurance Provider</Label><Input value={formData.insurance_provider} onChange={(e) => setFormData(p => ({ ...p, insurance_provider: e.target.value }))} /></div>
                <div><Label>Insurance Number</Label><Input value={formData.insurance_number} onChange={(e) => setFormData(p => ({ ...p, insurance_number: e.target.value }))} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={savePatientMutation.isPending}>
                {savePatientMutation.isPending ? "Saving..." : (editingPatient ? "Update Patient" : "Add Patient")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.common.total}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{patients?.length || 0}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">With Allergies</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold text-amber-600">{patients?.filter((p: any) => p.allergies).length || 0}</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Insured</CardTitle></CardHeader><CardContent><span className="text-2xl font-bold text-green-600">{patients?.filter((p: any) => p.insurance_provider).length || 0}</span></CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t.common.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 max-w-sm" />
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>{t.navigation.moduleRoutes.patients}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">{t.common.loading}</p>
          ) : !filteredPatients?.length ? (
            <div className="text-center py-8">
              <HeartPulse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t.common.noResults}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPatients.map((patient: any) => (
                <Card key={patient.id} className="p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{patient.full_name}</p>
                    </div>
                    {patient.gender && <Badge variant="outline">{patient.gender}</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {patient.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{patient.phone}</div>}
                    {patient.date_of_birth && <p>Age: {calculateAge(patient.date_of_birth)} yrs</p>}
                    {patient.allergies ? (
                      <Badge variant="destructive" className="text-xs">{patient.allergies.substring(0, 30)}...</Badge>
                    ) : <p>Allergies: None</p>}
                    {patient.insurance_provider && <Badge variant="secondary">{patient.insurance_provider}</Badge>}
                  </div>
                  <div className="flex justify-end gap-1 mt-3">
                    <Button size="sm" variant="ghost" onClick={() => setViewingHistoryPatient(patient)}>
                      <FileText className="h-4 w-4 mr-1" />{t.common.details}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(patient)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deletePatientMutation.mutate(patient.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescription History Dialog */}
      <Dialog open={!!viewingHistoryPatient} onOpenChange={() => setViewingHistoryPatient(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingHistoryPatient?.full_name}
            </DialogTitle>
            <DialogDescription>{t.common.details}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="history">
            <TabsList className="w-full">
              <TabsTrigger value="history" className="flex-1">{t.exams.title}</TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">
                <Camera className="h-4 w-4 mr-1" />{t.common.upload}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="history">
              <PrescriptionHistory patientId={viewingHistoryPatient?.id} tenantId={profile?.tenant_id} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
            </TabsContent>
            <TabsContent value="upload">
              {profile?.tenant_id && (
                <PrescriptionUpload
                  patientId={viewingHistoryPatient?.id}
                  tenantId={profile.tenant_id}
                  onUploadComplete={() => {
                    queryClient.invalidateQueries({ queryKey: ['patient-prescriptions'] });
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PrescriptionHistory = ({ patientId, tenantId, formatCurrency, getStatusBadge }: {
  patientId: string;
  tenantId: string;
  formatCurrency: (n: number) => string;
  getStatusBadge: (s: string) => any;
}) => {
  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ['patient-prescriptions', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await (supabase.from('prescriptions') as any)
        .select('*, prescription_items(*)')
        .eq('patient_id', patientId)
        .order('prescription_date', { ascending: false });
      if (error) throw error;
      return (data || []) as Prescription[];
    },
    enabled: !!patientId,
  });

  const [expandedRx, setExpandedRx] = useState<string | null>(null);

  if (isLoading) return <p className="text-center py-8 text-muted-foreground">{t.common.loading}</p>;

  if (!prescriptions?.length) {
    return (
      <div className="text-center py-8">
        <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t.common.noResults}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{prescriptions.length} total prescription(s)</p>
      {prescriptions.map((rx) => {
        const total = rx.prescription_items?.reduce((s, i) => s + (i.unit_price * i.quantity), 0) || 0;
        return (
          <Card key={rx.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-mono text-sm font-medium">{rx.prescription_number}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(rx.prescription_date), "MMM d, yyyy")}
                  {rx.doctor_name && ` — Dr. ${rx.doctor_name}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(rx.status)}
                <Button size="icon" variant="ghost" onClick={() => setExpandedRx(expandedRx === rx.id ? null : rx.id)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {expandedRx === rx.id && (
              <div className="mt-3 border-t pt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Freq</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rx.prescription_items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.medication_name}</TableCell>
                        <TableCell>{item.dosage || "-"}</TableCell>
                        <TableCell>{item.frequency || "-"}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price * item.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between mt-2 text-sm font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                {rx.hospital_clinic && <p className="text-xs text-muted-foreground mt-1">Hospital: {rx.hospital_clinic}</p>}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default Patients;
