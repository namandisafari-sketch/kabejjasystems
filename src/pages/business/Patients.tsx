import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, HeartPulse, Search, Edit, Trash2, User, Phone, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const Patients = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
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
      const { data } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await (supabase
        .from('patients') as any)
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
          .update({
            ...data,
            date_of_birth: data.date_of_birth || null,
          })
          .eq('id', editingPatient.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('patients') as any)
          .insert([{
            ...data,
            date_of_birth: data.date_of_birth || null,
            tenant_id: profile!.tenant_id,
            created_by: user.id,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsDialogOpen(false);
      setEditingPatient(null);
      resetForm();
      toast({ title: editingPatient ? "Patient Updated" : "Patient Added", description: "Patient record saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('patients') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast({ title: "Patient Deleted" });
    },
  });

  const resetForm = () => {
    setFormData({
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
  };

  const handleEdit = (patient: any) => {
    setEditingPatient(patient);
    setFormData({
      full_name: patient.full_name,
      phone: patient.phone || "",
      email: patient.email || "",
      date_of_birth: patient.date_of_birth || "",
      gender: patient.gender || "",
      address: patient.address || "",
      emergency_contact: patient.emergency_contact || "",
      emergency_phone: patient.emergency_phone || "",
      allergies: patient.allergies || "",
      medical_notes: patient.medical_notes || "",
      insurance_provider: patient.insurance_provider || "",
      insurance_number: patient.insurance_number || "",
    });
    setIsDialogOpen(true);
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Patients</h1>
          <p className="text-muted-foreground">Manage patient records and medical history</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingPatient(null); resetForm(); }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Patient</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPatient ? "Edit Patient" : "Add New Patient"}</DialogTitle>
              <DialogDescription>Enter patient details and medical information</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); savePatientMutation.mutate(formData); }} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={formData.full_name} onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={formData.date_of_birth} onChange={(e) => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} />
                </div>
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
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Emergency Contact</Label>
                  <Input value={formData.emergency_contact} onChange={(e) => setFormData(p => ({ ...p, emergency_contact: e.target.value }))} />
                </div>
                <div>
                  <Label>Emergency Phone</Label>
                  <Input value={formData.emergency_phone} onChange={(e) => setFormData(p => ({ ...p, emergency_phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Known Allergies</Label>
                <Textarea value={formData.allergies} onChange={(e) => setFormData(p => ({ ...p, allergies: e.target.value }))} placeholder="List any known allergies..." rows={2} />
              </div>
              <div>
                <Label>Medical Notes</Label>
                <Textarea value={formData.medical_notes} onChange={(e) => setFormData(p => ({ ...p, medical_notes: e.target.value }))} placeholder="Medical history, conditions..." rows={2} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Insurance Provider</Label>
                  <Input value={formData.insurance_provider} onChange={(e) => setFormData(p => ({ ...p, insurance_provider: e.target.value }))} />
                </div>
                <div>
                  <Label>Insurance Number</Label>
                  <Input value={formData.insurance_number} onChange={(e) => setFormData(p => ({ ...p, insurance_number: e.target.value }))} />
                </div>
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
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Patients</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{patients?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">With Allergies</CardTitle></CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-600">{patients?.filter((p: any) => p.allergies).length || 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Insured</CardTitle></CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">{patients?.filter((p: any) => p.insurance_provider).length || 0}</span>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search patients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 max-w-sm" />
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Patient Records</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : !filteredPatients?.length ? (
            <div className="text-center py-8">
              <HeartPulse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No patients found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Age/Gender</TableHead>
                  <TableHead>Allergies</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient: any) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{patient.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {patient.phone && <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{patient.phone}</div>}
                    </TableCell>
                    <TableCell>
                      {patient.date_of_birth && <span>{calculateAge(patient.date_of_birth)} yrs</span>}
                      {patient.gender && <Badge variant="outline" className="ml-2">{patient.gender}</Badge>}
                    </TableCell>
                    <TableCell>
                      {patient.allergies ? (
                        <Badge variant="destructive" className="text-xs">{patient.allergies.substring(0, 20)}...</Badge>
                      ) : <span className="text-muted-foreground">None</span>}
                    </TableCell>
                    <TableCell>
                      {patient.insurance_provider ? (
                        <Badge variant="secondary">{patient.insurance_provider}</Badge>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(patient)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deletePatientMutation.mutate(patient.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Patients;
