import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertTriangle, CheckCircle, Eye, Search } from "lucide-react";

interface DisciplineCase {
  id: string;
  case_number: string;
  student_id: string;
  offense_type: string;
  severity: string;
  status: string;
  is_active: boolean;
  incident_date: string;
  description: string;
  students?: { full_name: string; admission_number: string };
}

interface DisciplineRule {
  id: string;
  rule_name: string;
  offense_type: string;
  severity: string;
  blocks_portal_login: boolean;
  description: string;
}

interface DisciplineAppeal {
  id: string;
  case_id: string;
  student_id: string;
  appeal_reason: string;
  supporting_evidence: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  appeal_decision: string | null;
  cases?: { case_number: string };
  students?: { full_name: string; admission_number: string };
}

export default function BusinessDisciplineAppeals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [tenantId, setTenantId] = useState<string>("");
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [newRuleOpen, setNewRuleOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("cases");
  
  // Form states
  const [caseForm, setCaseForm] = useState({
    admission_number: "",
    offense_type: "",
    severity: "medium",
    incident_date: "",
    description: ""
  });
  
  const [ruleForm, setRuleForm] = useState({
    rule_name: "",
    offense_type: "",
    severity: "medium",
    blocks_portal_login: false,
    description: ""
  });

  // Get tenant ID
  useEffect(() => {
    const getTenantId = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.id) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("tenant_id")
          .eq("user_id", userData.user.id)
          .single();
        
        if (staffData?.tenant_id) {
          setTenantId(staffData.tenant_id);
        }
      }
    };
    getTenantId();
  }, []);

  // Fetch discipline cases
  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: ["discipline-cases", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_discipline_cases")
        .select("*, students(full_name, admission_number)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) || [];
    }
  });

  // Fetch discipline rules
  const { data: rules } = useQuery({
    queryKey: ["discipline-rules", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_discipline_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("severity", { ascending: false });

      if (error) throw error;
      return (data as any[]) || [];
    }
  });

  // Fetch appeals
  const { data: appeals } = useQuery({
    queryKey: ["discipline-appeals", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_discipline_appeals")
        .select("*, cases:student_discipline_cases(case_number), students(full_name, admission_number)")
        .eq("tenant_id", tenantId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) || [];
    }
  });

  // Create case mutation
  const createCaseMutation = useMutation({
    mutationFn: async () => {
      // Get student by admission number
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("admission_number", caseForm.admission_number)
        .eq("tenant_id", tenantId)
        .single();

      if (studentError) throw new Error("Student not found");

      const caseNumber = `${tenantId.slice(0, 8).toUpperCase()}-${caseForm.admission_number}-${caseForm.incident_date}`;

      const { error } = await supabase
        .from("student_discipline_cases")
        .insert([{
          tenant_id: tenantId,
          student_id: student.id,
          case_number: caseNumber,
          offense_type: caseForm.offense_type,
          severity: caseForm.severity,
          incident_date: caseForm.incident_date,
          description: caseForm.description,
          status: "open",
          is_active: true,
          can_appeal: true
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Case created successfully" });
      setNewCaseOpen(false);
      setCaseForm({ admission_number: "", offense_type: "", severity: "medium", incident_date: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["discipline-cases"] });
    },
    onError: (error: any) => {
      toast({ title: "Error creating case", description: error.message, variant: "destructive" });
    }
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("school_discipline_rules")
        .insert([{
          tenant_id: tenantId,
          rule_name: ruleForm.rule_name,
          offense_type: ruleForm.offense_type,
          severity: ruleForm.severity,
          blocks_portal_login: ruleForm.blocks_portal_login,
          description: ruleForm.description
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rule created successfully" });
      setNewRuleOpen(false);
      setRuleForm({ rule_name: "", offense_type: "", severity: "medium", blocks_portal_login: false, description: "" });
      queryClient.invalidateQueries({ queryKey: ["discipline-rules"] });
    },
    onError: (error: any) => {
      toast({ title: "Error creating rule", description: error.message, variant: "destructive" });
    }
  });

  // Approve appeal mutation
  const approveAppealMutation = useMutation({
    mutationFn: async (appealId: string) => {
      const { error } = await supabase
        .from("student_discipline_appeals")
        .update({ 
          status: "approved",
          reviewed_at: new Date().toISOString(),
          appeal_decision: "Approved by admin"
        })
        .eq("id", appealId);

      if (error) throw error;

      // Deactivate the case
      const appeal = appeals?.find((a: any) => a.id === appealId);
      if (appeal?.discipline_case_id) {
        await supabase
          .from("student_discipline_cases")
          .update({ is_active: false })
          .eq("id", appeal.discipline_case_id);
      }
    },
    onSuccess: () => {
      toast({ title: "Appeal approved" });
      queryClient.invalidateQueries({ queryKey: ["discipline-appeals"] });
      queryClient.invalidateQueries({ queryKey: ["discipline-cases"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Reject appeal mutation
  const rejectAppealMutation = useMutation({
    mutationFn: async (appealId: string) => {
      const { error } = await supabase
        .from("student_discipline_appeals")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          appeal_decision: "Rejected by admin"
        })
        .eq("id", appealId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Appeal rejected" });
      queryClient.invalidateQueries({ queryKey: ["discipline-appeals"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-800";
      case "under_review": return "bg-yellow-100 text-yellow-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "appealed": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Discipline & Appeals Management</h1>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="cases">Discipline Cases</TabsTrigger>
          <TabsTrigger value="rules">Portal Access Rules</TabsTrigger>
          <TabsTrigger value="appeals">Appeals</TabsTrigger>
        </TabsList>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Discipline Cases</CardTitle>
              <Dialog open={newCaseOpen} onOpenChange={setNewCaseOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Case
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Discipline Case</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Student Admission Number</Label>
                      <Input
                        placeholder="e.g., 670033"
                        value={caseForm.admission_number}
                        onChange={(e) => setCaseForm({ ...caseForm, admission_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Offense Type</Label>
                      <Select value={caseForm.offense_type} onValueChange={(value) => setCaseForm({ ...caseForm, offense_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="violence">Violence</SelectItem>
                          <SelectItem value="bullying">Bullying</SelectItem>
                          <SelectItem value="academic_dishonesty">Academic Dishonesty</SelectItem>
                          <SelectItem value="drugs">Drugs</SelectItem>
                          <SelectItem value="sexual_assault">Sexual Assault</SelectItem>
                          <SelectItem value="theft">Theft</SelectItem>
                          <SelectItem value="insubordination">Insubordination</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Severity</Label>
                      <Select value={caseForm.severity} onValueChange={(value) => setCaseForm({ ...caseForm, severity: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Incident Date</Label>
                      <Input
                        type="date"
                        value={caseForm.incident_date}
                        onChange={(e) => setCaseForm({ ...caseForm, incident_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe the incident"
                        value={caseForm.description}
                        onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
                      />
                    </div>
                    <Button onClick={() => createCaseMutation.mutate()} disabled={createCaseMutation.isPending}>
                      {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <div className="text-center text-gray-500">Loading cases...</div>
              ) : cases && cases.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case #</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Offense</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Blocks Portal</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((c: DisciplineCase) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-bold">{c.case_number}</TableCell>
                        <TableCell>
                          <div>
                            <div>{c.students?.full_name}</div>
                            <div className="text-sm text-gray-500">#{c.students?.admission_number}</div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{c.offense_type}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(c.severity)}>{c.severity}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {c.is_active ? (
                            <Badge className="bg-red-100 text-red-800">BLOCKED</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(c.incident_date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-gray-500 py-8">No discipline cases</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Portal Access Rules</CardTitle>
              <Dialog open={newRuleOpen} onOpenChange={setNewRuleOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Portal Access Rule</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Rule Name</Label>
                      <Input
                        placeholder="e.g., Violence Policy"
                        value={ruleForm.rule_name}
                        onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Offense Type</Label>
                      <Select value={ruleForm.offense_type} onValueChange={(value) => setRuleForm({ ...ruleForm, offense_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="violence">Violence</SelectItem>
                          <SelectItem value="bullying">Bullying</SelectItem>
                          <SelectItem value="academic_dishonesty">Academic Dishonesty</SelectItem>
                          <SelectItem value="drugs">Drugs</SelectItem>
                          <SelectItem value="sexual_assault">Sexual Assault</SelectItem>
                          <SelectItem value="theft">Theft</SelectItem>
                          <SelectItem value="insubordination">Insubordination</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Severity</Label>
                      <Select value={ruleForm.severity} onValueChange={(value) => setRuleForm({ ...ruleForm, severity: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe this rule"
                        value={ruleForm.description}
                        onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={ruleForm.blocks_portal_login}
                        onChange={(e) => setRuleForm({ ...ruleForm, blocks_portal_login: e.target.checked })}
                      />
                      <Label>Blocks Student Portal Login</Label>
                    </div>
                    <Button onClick={() => createRuleMutation.mutate()} disabled={createRuleMutation.isPending}>
                      {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {rules && rules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Offense</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Blocks Portal</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((r: DisciplineRule) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-semibold">{r.rule_name}</TableCell>
                        <TableCell className="capitalize">{r.offense_type}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(r.severity)}>{r.severity}</Badge>
                        </TableCell>
                        <TableCell>
                          {r.blocks_portal_login ? (
                            <Badge className="bg-red-100 text-red-800">YES</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">NO</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{r.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-gray-500 py-8">No rules configured</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appeals Tab */}
        <TabsContent value="appeals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Appeals</CardTitle>
            </CardHeader>
            <CardContent>
              {appeals && appeals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case #</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appeals.map((a: DisciplineAppeal) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono font-bold">{a.cases?.case_number}</TableCell>
                        <TableCell>
                          <div>
                            <div>{a.students?.full_name}</div>
                            <div className="text-sm text-gray-500">#{a.students?.admission_number}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">{a.appeal_reason}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(a.status === 'submitted' ? 'open' : a.status)}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(a.submitted_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {a.status === "submitted" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveAppealMutation.mutate(a.id)}
                                disabled={approveAppealMutation.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectAppealMutation.mutate(a.id)}
                                disabled={rejectAppealMutation.isPending}
                              >
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-gray-500 py-8">No appeals submitted</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
