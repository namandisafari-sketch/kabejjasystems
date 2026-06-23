import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCopy, ExternalLink, FileSignature, Check, X, FileText, Users, UserPlus, Loader2, Search, Eye, EyeOff, Copy, Link2, Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import LeaseSigningDialog from "@/components/rental/LeaseSigningDialog";

export default function RentalELeasing() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("applications");

  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [screeningNotes, setScreeningNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [createTenantDialog, setCreateTenantDialog] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    occupation: "",
    employer: "",
    monthly_income: "",
  });
  const [tenantCreatedId, setTenantCreatedId] = useState<string | null>(null);

  const [signingLease, setSigningLease] = useState<any>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);

  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("__any__");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: properties = [] } = useQuery({
    queryKey: ["rental-properties", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_properties")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["rental-units-list", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_units")
        .select("*, rental_properties(name)")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const filteredUnits = selectedProperty
    ? units.filter((u: any) => u.property_id === selectedProperty)
    : units;

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ["rental-applications", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_applications")
        .select("*, rental_properties(name), rental_units(unit_number)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: leases = [] } = useQuery({
    queryKey: ["leases-signature", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("*, rental_units(unit_number, rental_properties(name)), rental_tenants(full_name)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allSignatures = [] } = useQuery({
    queryKey: ["all-lease-signatures"],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lease_signatures")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: appLinks = [] } = useQuery({
    queryKey: ["rental-application-links", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_application_links")
        .select("*, rental_properties(name), rental_units(unit_number)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updateData: any = { status };
      if (notes) updateData.screening_notes = notes;
      if (status === "approved" || status === "rejected") {
        updateData.reviewed_by = (await supabase.auth.getUser()).data.user?.id;
        updateData.reviewed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("rental_applications")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-applications"] });
      toast({ title: "Application status updated" });
      setProcessingId(null);
      setScreeningNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setProcessingId(null);
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      const linkId = Math.random().toString(36).substring(2, 10);
      const baseUrl = window.location.origin;
      const { error } = await supabase.from("rental_application_links").insert({
        tenant_id: tenantId,
        property_id: selectedProperty,
        unit_id: selectedUnit === "__any__" ? null : selectedUnit,
        application_link_id: linkId,
        share_url: `${baseUrl}/apply/${linkId}`,
        status: "active",
      });
      if (error) throw error;
      return linkId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-application-links"] });
      setSelectedProperty("");
      setSelectedUnit("");
      toast({ title: "Application link created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rental_tenants").insert({
        tenant_id: tenantId,
        full_name: tenantForm.full_name,
        email: tenantForm.email || null,
        phone: tenantForm.phone || null,
        emergency_contact_name: tenantForm.emergency_contact_name || null,
        emergency_contact_phone: tenantForm.emergency_contact_phone || null,
        occupation: tenantForm.occupation || null,
        employer: tenantForm.employer || null,
        monthly_income: tenantForm.monthly_income ? parseFloat(tenantForm.monthly_income) : null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-tenants"] });
      toast({ title: "Tenant created successfully" });
      setCreateTenantDialog(false);
      setDetailOpen(false);
      setSelectedApplication(null);
      setTenantCreatedId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusUpdate = (id: string, status: string) => {
    setProcessingId(id);
    updateStatusMutation.mutate({ id, status, notes: status === "screening" ? screeningNotes : undefined });
  };

  const handleApprove = (app: any) => {
    setProcessingId(app.id);
    updateStatusMutation.mutate({
      id: app.id,
      status: "approved",
      notes: screeningNotes || undefined,
    });
  };

  const handleReject = (app: any) => {
    setProcessingId(app.id);
    updateStatusMutation.mutate({
      id: app.id,
      status: "rejected",
      notes: screeningNotes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "screening":
        return <Badge className="bg-blue-500">Screening</Badge>;
      case "approved":
        return <Badge className="bg-emerald-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSignatureStatus = (lease: any) => {
    const sigs = allSignatures.filter((s: any) => s.lease_id === lease.id);
    const managerSigned = sigs.some((s: any) => s.signer_type === "manager");
    const tenantSigned = sigs.some((s: any) => s.signer_type === "tenant");
    if (managerSigned && tenantSigned) return "fully_signed";
    if (managerSigned) return "partially_signed";
    return "unsigned";
  };

  const getSignatureBadge = (lease: any) => {
    const status = getSignatureStatus(lease);
    switch (status) {
      case "fully_signed":
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-emerald-500">Fully Signed</Badge>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          </div>
        );
      case "partially_signed":
        return <Badge className="bg-amber-500">Partially Signed</Badge>;
      default:
        return <Badge variant="outline">Unsigned</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const openDetail = async (app: any) => {
    setSelectedApplication(app);
    setScreeningNotes(app.screening_notes || "");
    setDetailOpen(true);
  };

  const prepareCreateTenant = (app: any) => {
    const parsedEmployment = app.employment_info ? (typeof app.employment_info === "string" ? JSON.parse(app.employment_info) : app.employment_info) : {};
    const parsedIncome = app.income_info ? (typeof app.income_info === "string" ? JSON.parse(app.income_info) : app.income_info) : {};
    const parsedEmergency = app.emergency_contact ? (typeof app.emergency_contact === "string" ? JSON.parse(app.emergency_contact) : app.emergency_contact) : {};
    setTenantForm({
      full_name: app.applicant_name || "",
      email: app.applicant_email || "",
      phone: app.applicant_phone || "",
      emergency_contact_name: parsedEmergency?.name || "",
      emergency_contact_phone: parsedEmergency?.phone || "",
      occupation: parsedEmployment?.occupation || "",
      employer: parsedEmployment?.employer || "",
      monthly_income: parsedIncome?.monthly_income?.toString() || "",
    });
    setCreateTenantDialog(true);
  };

  const totalApplications = applications.length;
  const pendingReview = applications.filter((a: any) => a.status === "pending" || a.status === "screening").length;
  const approvedThisMonth = applications.filter((a: any) => {
    if (a.status !== "approved") return false;
    const now = new Date();
    const reviewed = a.reviewed_at ? new Date(a.reviewed_at) : null;
    return reviewed && reviewed.getMonth() === now.getMonth() && reviewed.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">e-Leasing</h1>
        <p className="text-muted-foreground">Manage rental applications, signatures, and listing links</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="signatures">eSignature</TabsTrigger>
          <TabsTrigger value="links">Listing Links</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalApplications}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{pendingReview}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{approvedThisMonth}</div>
              </CardContent>
            </Card>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applications..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Property / Unit</TableHead>
                    <TableHead className="hidden sm:table-cell">Applied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications
                    .filter((a: any) =>
                      !searchQuery ||
                      a.applicant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      a.applicant_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      a.applicant_phone?.includes(searchQuery)
                    )
                    .map((app: any) => (
                      <TableRow key={app.id} className="cursor-pointer" onClick={() => openDetail(app)}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.applicant_name}</p>
                            <p className="text-xs text-muted-foreground block md:hidden">{app.applicant_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm space-y-0.5">
                            <p>{app.applicant_phone}</p>
                            <p className="text-muted-foreground">{app.applicant_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm">
                            <p>{app.rental_properties?.name}</p>
                            <p className="text-muted-foreground">Unit {app.rental_units?.unit_number}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {app.submitted_at ? format(new Date(app.submitted_at), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(app); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {applications.length === 0 && !appsLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No applications yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signatures" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="hidden md:table-cell">Unit</TableHead>
                    <TableHead className="hidden lg:table-cell">Lease Period</TableHead>
                    <TableHead className="hidden sm:table-cell">Rent</TableHead>
                    <TableHead>Signature Status</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leases.map((lease: any) => {
                    const sigStatus = getSignatureStatus(lease);
                    const sigs = allSignatures.filter((s: any) => s.lease_id === lease.id);
                    return (
                      <TableRow key={lease.id}>
                        <TableCell className="font-medium">
                          {lease.rental_tenants?.full_name || "N/A"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">
                            <p>{lease.rental_units?.rental_properties?.name}</p>
                            <p className="text-muted-foreground">Unit {lease.rental_units?.unit_number}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {format(new Date(lease.start_date), "MMM d, yyyy")} - {format(new Date(lease.end_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-medium">
                          UGX {Number(lease.monthly_rent).toLocaleString()}
                        </TableCell>
                        <TableCell>{getSignatureBadge(lease)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSigningLease(lease);
                                setSignDialogOpen(true);
                              }}
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            >
                              <FileSignature className="h-3.5 w-3.5 mr-1" />
                              Sign
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {leases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No leases found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Application Link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Property</Label>
                  <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unit (optional)</Label>
                  <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any Unit</SelectItem>
                      {filteredUnits.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {(u.rental_properties as any)?.name} - {u.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => createLinkMutation.mutate()}
                    disabled={!selectedProperty || createLinkMutation.isPending}
                    className="w-full"
                  >
                    {createLinkMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <Link2 className="h-4 w-4 mr-2" />
                    Generate Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Links</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property / Unit</TableHead>
                    <TableHead className="hidden sm:table-cell">Share URL</TableHead>
                    <TableHead className="hidden md:table-cell">Clicks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Copy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appLinks.map((link: any) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="text-sm">
                          <p>{link.rental_properties?.name}</p>
                          {link.rental_units && (
                            <p className="text-muted-foreground">Unit {link.rental_units?.unit_number}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px] block">
                          {link.share_url}
                        </code>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {link.click_count || 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant={link.status === "active" ? "default" : "secondary"}>
                          {link.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(link.share_url)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {appLinks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No links generated yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Application Details
            </DialogTitle>
            {selectedApplication && (
              <DialogDescription>
                Submitted {selectedApplication.submitted_at ? format(new Date(selectedApplication.submitted_at), "MMMM d, yyyy 'at' h:mm a") : "N/A"}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Personal Information</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedApplication.applicant_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p>{selectedApplication.applicant_email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p>{selectedApplication.applicant_phone || "-"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Property Details</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Property</p>
                    <p className="font-medium">{selectedApplication.rental_properties?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unit</p>
                    <p>{selectedApplication.rental_units?.unit_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-0.5">{getStatusBadge(selectedApplication.status)}</div>
                  </div>
                </div>
              </div>

              {selectedApplication.employment_info && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Employment Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted rounded-lg">
                    {(() => {
                      const emp = typeof selectedApplication.employment_info === "string"
                        ? JSON.parse(selectedApplication.employment_info)
                        : selectedApplication.employment_info;
                      return (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Occupation</p>
                            <p className="text-sm font-medium">{emp?.occupation || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Employer</p>
                            <p className="text-sm font-medium">{emp?.employer || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Years Employed</p>
                            <p className="text-sm font-medium">{emp?.years_employed || "-"}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {selectedApplication.income_info && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Income Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted rounded-lg">
                    {(() => {
                      const inc = typeof selectedApplication.income_info === "string"
                        ? JSON.parse(selectedApplication.income_info)
                        : selectedApplication.income_info;
                      return (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly Income</p>
                            <p className="text-sm font-medium">
                              {inc?.monthly_income ? `UGX ${Number(inc.monthly_income).toLocaleString()}` : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Income Source</p>
                            <p className="text-sm font-medium">{inc?.source || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Employment Status</p>
                            <p className="text-sm font-medium capitalize">{inc?.employment_status || "-"}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {selectedApplication.emergency_contact && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
                    {(() => {
                      const ec = typeof selectedApplication.emergency_contact === "string"
                        ? JSON.parse(selectedApplication.emergency_contact)
                        : selectedApplication.emergency_contact;
                      return (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Name</p>
                            <p className="text-sm font-medium">{ec?.name || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="text-sm font-medium">{ec?.phone || "-"}</p>
                          </div>
                          {ec?.relationship && (
                            <div>
                              <p className="text-xs text-muted-foreground">Relationship</p>
                              <p className="text-sm font-medium">{ec.relationship}</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Screening Notes</h3>
                <Textarea
                  value={screeningNotes}
                  onChange={e => setScreeningNotes(e.target.value)}
                  placeholder="Add screening notes..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pt-2 border-t">
                <div className="flex gap-2">
                  {selectedApplication.status !== "approved" && selectedApplication.status !== "rejected" && selectedApplication.status !== "cancelled" && (
                    <>
                      <Button
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleApprove(selectedApplication)}
                        disabled={processingId === selectedApplication.id}
                      >
                        {processingId === selectedApplication.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(selectedApplication)}
                        disabled={processingId === selectedApplication.id}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      {selectedApplication.status === "pending" && (
                        <Button
                          variant="outline"
                          className="border-blue-300 text-blue-600"
                          onClick={() => handleStatusUpdate(selectedApplication.id, "screening")}
                          disabled={processingId === selectedApplication.id}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Screen
                        </Button>
                      )}
                    </>
                  )}
                </div>
                {selectedApplication.status === "approved" && (
                  <Button onClick={() => prepareCreateTenant(selectedApplication)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Tenant
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createTenantDialog} onOpenChange={setCreateTenantDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Tenant Record</DialogTitle>
            <DialogDescription>
              Pre-filled from the approved application. Adjust as needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Full Name</Label>
                <Input
                  value={tenantForm.full_name}
                  onChange={e => setTenantForm({ ...tenantForm, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={tenantForm.phone}
                  onChange={e => setTenantForm({ ...tenantForm, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={tenantForm.email}
                  onChange={e => setTenantForm({ ...tenantForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Emergency Contact Name</Label>
                <Input
                  value={tenantForm.emergency_contact_name}
                  onChange={e => setTenantForm({ ...tenantForm, emergency_contact_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Emergency Contact Phone</Label>
                <Input
                  value={tenantForm.emergency_contact_phone}
                  onChange={e => setTenantForm({ ...tenantForm, emergency_contact_phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Occupation</Label>
                <Input
                  value={tenantForm.occupation}
                  onChange={e => setTenantForm({ ...tenantForm, occupation: e.target.value })}
                />
              </div>
              <div>
                <Label>Employer</Label>
                <Input
                  value={tenantForm.employer}
                  onChange={e => setTenantForm({ ...tenantForm, employer: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Monthly Income (UGX)</Label>
                <Input
                  type="number"
                  value={tenantForm.monthly_income}
                  onChange={e => setTenantForm({ ...tenantForm, monthly_income: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTenantDialog(false)}>Cancel</Button>
            <Button onClick={() => createTenantMutation.mutate()} disabled={!tenantForm.full_name || createTenantMutation.isPending}>
              {createTenantMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Users className="h-4 w-4 mr-2" />
              Create Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LeaseSigningDialog lease={signingLease} open={signDialogOpen} onOpenChange={setSignDialogOpen} />
    </div>
  );
}
