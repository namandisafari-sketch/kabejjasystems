import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, CheckCircle, Clock, Eye, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface StudentData {
  full_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  religion: string;
  home_address: string;
  previous_school: string;
  applying_for_class: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  parent_occupation: string;
  parent_relationship: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_conditions: string;
  allergies: string;
}

interface AdmissionConfirmation {
  id: string;
  confirmation_code: string;
  student_data: StudentData;
  agreed_to_terms: boolean;
  terms_agreed_at: string;
  verified_at: string | null;
  created_at: string;
}

export default function AdmissionConfirmations() {
  const { data: tenant, isLoading: tenantLoading } = useTenant();
  const queryClient = useQueryClient();
  const [searchCode, setSearchCode] = useState("");
  const [selectedConfirmation, setSelectedConfirmation] = useState<AdmissionConfirmation | null>(null);

  const { data: confirmations, isLoading } = useQuery({
    queryKey: ["admission-confirmations", tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from("admission_confirmations")
        .select("*")
        .eq("tenant_id", tenant.tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as AdmissionConfirmation[];
    },
    enabled: !!tenant?.tenantId,
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("admission_confirmations")
        .update({
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-confirmations", tenant?.tenantId] });
      toast({ title: "Verified", description: "Admission confirmation has been verified." });
      setSelectedConfirmation(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredConfirmations = confirmations?.filter((c) =>
    searchCode ? c.confirmation_code.toLowerCase().includes(searchCode.toLowerCase()) : true
  );

  if (tenantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admission Confirmations</h1>
          <p className="text-muted-foreground">
            Verify self-registration submissions when parents visit
          </p>
        </div>
      </div>

      {/* Quick Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Verify by Code
          </CardTitle>
          <CardDescription>
            Enter the confirmation code provided by the parent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-md">
            <Input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              placeholder="Enter confirmation code (e.g., ADM-XXXXXXXX)"
              className="font-mono"
            />
            <Button variant="outline" onClick={() => setSearchCode("")}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmations List */}
      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
          <CardDescription>
            {filteredConfirmations?.length || 0} admission submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredConfirmations && filteredConfirmations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfirmations.map((conf) => {
                  const studentData = conf.student_data as StudentData;
                  return (
                    <TableRow key={conf.id}>
                      <TableCell className="font-mono font-medium">
                        {conf.confirmation_code}
                      </TableCell>
                      <TableCell>{studentData.full_name}</TableCell>
                      <TableCell>{studentData.applying_for_class}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{studentData.parent_name}</p>
                          <p className="text-muted-foreground">{studentData.parent_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(conf.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {conf.verified_at ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedConfirmation(conf)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No admission submissions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedConfirmation} onOpenChange={() => setSelectedConfirmation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Admission Details</DialogTitle>
            <DialogDescription>
              Confirmation Code: <span className="font-mono font-bold">{selectedConfirmation?.confirmation_code}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedConfirmation && (
            <div className="space-y-6">
              {/* Student Info */}
              <div>
                <h3 className="font-semibold mb-3">Student Information</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Full Name:</span>
                    <span className="font-medium">{(selectedConfirmation.student_data as StudentData).full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date of Birth:</span>
                    <span>{(selectedConfirmation.student_data as StudentData).date_of_birth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="capitalize">{(selectedConfirmation.student_data as StudentData).gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Applying for:</span>
                    <span>{(selectedConfirmation.student_data as StudentData).applying_for_class}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Previous School:</span>
                    <span>{(selectedConfirmation.student_data as StudentData).previous_school || "N/A"}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Parent Info */}
              <div>
                <h3 className="font-semibold mb-3">Parent/Guardian Information</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{(selectedConfirmation.student_data as StudentData).parent_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Relationship:</span>
                    <span className="capitalize">{(selectedConfirmation.student_data as StudentData).parent_relationship}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{(selectedConfirmation.student_data as StudentData).parent_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{(selectedConfirmation.student_data as StudentData).parent_email || "N/A"}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Submission Info */}
              <div>
                <h3 className="font-semibold mb-3">Submission Details</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted:</span>
                    <span>{format(new Date(selectedConfirmation.created_at), "MMM d, yyyy h:mm a")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Agreed to Terms:</span>
                    <span>{selectedConfirmation.agreed_to_terms ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span>
                      {selectedConfirmation.verified_at ? (
                        <Badge variant="default" className="bg-green-600">Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Pending Verification</Badge>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!selectedConfirmation.verified_at && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    onClick={() => verifyMutation.mutate(selectedConfirmation.id)}
                    disabled={verifyMutation.isPending}
                  >
                    {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verify & Confirm
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
