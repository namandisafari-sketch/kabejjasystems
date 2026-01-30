import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  GraduationCap, 
  Search, 
  Download, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  RefreshCw,
  Settings
} from "lucide-react";

interface UNEBCandidate {
  id: string;
  student_id: string;
  academic_year: number;
  exam_type: 'UCE' | 'UACE';
  registration_status: string;
  index_number: string | null;
  subjects: any[];
  registration_fee: number;
  fee_paid: boolean;
  passport_photo_submitted: boolean;
  student: {
    full_name: string;
    admission_number: string;
    gender: string;
    class: {
      name: string;
    } | null;
  };
}

interface UNEBSettings {
  id: string;
  center_number: string | null;
  center_name: string | null;
  uce_registration_fee: number;
  uace_registration_fee: number;
  current_academic_year: number;
  registration_open: boolean;
  registration_deadline_uce: string | null;
  registration_deadline_uace: string | null;
}

export default function UNEBCandidates() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<UNEBCandidate | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Fetch UNEB settings
  const { data: settings } = useQuery({
    queryKey: ['uneb-settings', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uneb_school_settings')
        .select('*')
        .eq('tenant_id', tenantId!)
        .maybeSingle();
      
      if (error) throw error;
      return data as UNEBSettings | null;
    },
  });

  // Fetch UNEB candidates
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['uneb-candidates', tenantId, examTypeFilter, statusFilter],
    enabled: !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from('uneb_candidate_registrations')
        .select(`
          *,
          student:students(
            full_name,
            admission_number,
            gender,
            class:school_classes(name)
          )
        `)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });

      if (examTypeFilter !== 'all') {
        query = query.eq('exam_type', examTypeFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('registration_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UNEBCandidate[];
    },
  });

  // Update registration status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status, indexNumber }: { id: string; status: string; indexNumber?: string }) => {
      const updates: any = { registration_status: status };
      if (status === 'registered' && indexNumber) {
        updates.index_number = indexNumber;
        updates.registered_at = new Date().toISOString();
      }
      if (status === 'submitted') {
        updates.submitted_to_uneb_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('uneb_candidate_registrations')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uneb-candidates'] });
      toast.success("Registration status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // Mark fee as paid
  const markFeePaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('uneb_candidate_registrations')
        .update({ 
          fee_paid: true, 
          fee_paid_date: new Date().toISOString().split('T')[0] 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uneb-candidates'] });
      toast.success("Payment recorded");
    },
  });

  // Filter candidates by search
  const filteredCandidates = candidates.filter(c => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      c.student?.full_name?.toLowerCase().includes(search) ||
      c.student?.admission_number?.toLowerCase().includes(search) ||
      c.index_number?.toLowerCase().includes(search)
    );
  });

  // Statistics
  const stats = {
    total: candidates.length,
    pending: candidates.filter(c => c.registration_status === 'pending').length,
    submitted: candidates.filter(c => c.registration_status === 'submitted').length,
    registered: candidates.filter(c => c.registration_status === 'registered').length,
    feePaid: candidates.filter(c => c.fee_paid).length,
    uce: candidates.filter(c => c.exam_type === 'UCE').length,
    uace: candidates.filter(c => c.exam_type === 'UACE').length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { 
      style: 'currency', 
      currency: 'UGX', 
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'submitted':
        return <Badge variant="outline" className="border-primary text-primary"><Upload className="h-3 w-3 mr-1" /> Submitted</Badge>;
      case 'registered':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Registered</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">UNEB Settings Not Configured</h2>
            <p className="text-muted-foreground mb-4">
              Please configure your school's UNEB center details before managing candidates.
            </p>
            <Button onClick={() => setShowSettingsDialog(true)}>
              <Settings className="h-4 w-4 mr-2" /> Configure UNEB Settings
            </Button>
          </CardContent>
        </Card>
        
        <UNEBSettingsDialog 
          open={showSettingsDialog} 
          onOpenChange={setShowSettingsDialog}
          tenantId={tenantId || ''}
          existingSettings={settings}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            UNEB Candidates ({settings.current_academic_year})
          </h1>
          <p className="text-muted-foreground">
            Center: {settings.center_number || 'Not set'} • {settings.center_name || 'Configure in settings'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4 mr-2" /> Settings
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export List
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.uce}</p>
            <p className="text-xs text-muted-foreground">UCE (S.4)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.uace}</p>
            <p className="text-xs text-muted-foreground">UACE (S.6)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.submitted}</p>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.registered}</p>
            <p className="text-xs text-muted-foreground">Registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.feePaid}</p>
            <p className="text-xs text-muted-foreground">Fees Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, admission no, or index no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Exam Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="UCE">UCE (O-Level)</SelectItem>
                <SelectItem value="UACE">UACE (A-Level)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Candidates List ({filteredCandidates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Loading candidates...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No UNEB candidates found.</p>
              <p className="text-sm">Enroll S.4 or S.6 students to add them as candidates.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Index No.</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{candidate.student?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{candidate.student?.admission_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>{candidate.student?.class?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={candidate.exam_type === 'UCE' ? 'secondary' : 'outline'}>
                        {candidate.exam_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {candidate.index_number || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {candidate.fee_paid ? (
                        <Badge variant="default" className="bg-green-600">Paid</Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => markFeePaid.mutate(candidate.id)}
                        >
                          {formatCurrency(candidate.registration_fee)}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {candidate.passport_photo_submitted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(candidate.registration_status)}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setSelectedCandidate(candidate)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <UNEBSettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={setShowSettingsDialog}
        tenantId={tenantId || ''}
        existingSettings={settings}
      />
    </div>
  );
}

// UNEB Settings Dialog Component
function UNEBSettingsDialog({ 
  open, 
  onOpenChange, 
  tenantId,
  existingSettings 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  existingSettings: UNEBSettings | null;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    center_number: existingSettings?.center_number || '',
    center_name: existingSettings?.center_name || '',
    uce_registration_fee: existingSettings?.uce_registration_fee || 80000,
    uace_registration_fee: existingSettings?.uace_registration_fee || 120000,
    current_academic_year: existingSettings?.current_academic_year || new Date().getFullYear(),
    registration_open: existingSettings?.registration_open || false,
    registration_deadline_uce: existingSettings?.registration_deadline_uce || '',
    registration_deadline_uace: existingSettings?.registration_deadline_uace || '',
  });

  const saveSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('uneb_school_settings')
        .upsert({
          tenant_id: tenantId,
          ...formData,
        }, { onConflict: 'tenant_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uneb-settings'] });
      toast.success("UNEB settings saved");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> UNEB School Settings
          </DialogTitle>
          <DialogDescription>
            Configure your school's UNEB center details and registration fees
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Center Number</Label>
              <Input
                value={formData.center_number}
                onChange={(e) => setFormData(prev => ({ ...prev, center_number: e.target.value }))}
                placeholder="e.g., U0001"
              />
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input
                type="number"
                value={formData.current_academic_year}
                onChange={(e) => setFormData(prev => ({ ...prev, current_academic_year: parseInt(e.target.value) }))}
              />
            </div>
          </div>
          
          <div>
            <Label>Center Name (Official UNEB Name)</Label>
            <Input
              value={formData.center_name}
              onChange={(e) => setFormData(prev => ({ ...prev, center_name: e.target.value }))}
              placeholder="School name as registered with UNEB"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>UCE Registration Fee (UGX)</Label>
              <Input
                type="number"
                value={formData.uce_registration_fee}
                onChange={(e) => setFormData(prev => ({ ...prev, uce_registration_fee: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label>UACE Registration Fee (UGX)</Label>
              <Input
                type="number"
                value={formData.uace_registration_fee}
                onChange={(e) => setFormData(prev => ({ ...prev, uace_registration_fee: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>UCE Registration Deadline</Label>
              <Input
                type="date"
                value={formData.registration_deadline_uce}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_deadline_uce: e.target.value }))}
              />
            </div>
            <div>
              <Label>UACE Registration Deadline</Label>
              <Input
                type="date"
                value={formData.registration_deadline_uace}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_deadline_uace: e.target.value }))}
              />
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              These settings apply to all UNEB candidate registrations for your school. 
              Make sure the center number matches your official UNEB registration.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
