import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, AlertTriangle, CheckCircle, Eye } from "lucide-react";

interface DisciplineCase {
  id: string;
  case_number: string;
  student_id: string;
  offense_type: string;
  severity: string;
  status: string;
  is_active: boolean;
  incident_date: string;
  students?: { full_name: string; admission_number: string };
}

interface DisciplineRule {
  id: string;
  rule_name: string;
  offense_type: string;
  severity: string;
  blocks_portal_login: boolean;
}

export default function AdminDiscipline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [newRuleOpen, setNewRuleOpen] = useState(false);
  const [tenantId, setTenantId] = useState<string>("");

  // Get tenant ID
  useEffect(() => {
    const getTenantId = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.id) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("tenant_id")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (staffData) setTenantId(staffData.tenant_id);
      }
    };
    getTenantId();
  }, []);

  // Fetch discipline cases
  const { data: cases } = useQuery({
    queryKey: ["discipline-cases", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_discipline_cases")
        .select("*, students(full_name, admission_number)")
        .eq("tenant_id", tenantId)
        .order("incident_date", { ascending: false });
      if (error) throw error;
      return data as DisciplineCase[];
    },
    enabled: !!tenantId,
  });

  // Fetch discipline rules
  const { data: rules } = useQuery({
    queryKey: ["discipline-rules", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_discipline_rules")
        .select("*")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data as DisciplineRule[];
    },
    enabled: !!tenantId,
  });

  // Create case mutation
  const createCaseMutation = useMutation({
    mutationFn: async (caseData: any) => {
      const { data, error } = await supabase
        .from("student_discipline_cases")
        .insert({
          ...caseData,
          tenant_id: tenantId,
        })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Discipline case created" });
      queryClient.invalidateQueries({ queryKey: ["discipline-cases", tenantId] });
      setNewCaseOpen(false);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: any) => {
      const { data, error } = await supabase
        .from("school_discipline_rules")
        .insert({
          ...ruleData,
          tenant_id: tenantId,
        })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Discipline rule created" });
      queryClient.invalidateQueries({ queryKey: ["discipline-rules", tenantId] });
      setNewRuleOpen(false);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "secondary";
      case "medium":
        return "outline";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Student Discipline Management</h1>
          <p className="text-muted-foreground">Manage discipline cases and portal access rules</p>
        </div>
      </div>

      {/* Discipline Rules Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Portal Access Rules</CardTitle>
          <Dialog open={newRuleOpen} onOpenChange={setNewRuleOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" /> New Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Discipline Rule</DialogTitle>
              </DialogHeader>
              <NewRuleForm
                onSubmit={(data) => createRuleMutation.mutate(data)}
                isLoading={createRuleMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules?.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-semibold">{rule.rule_name}</p>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getSeverityColor(rule.severity)}>{rule.severity}</Badge>
                  {rule.blocks_portal_login && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> Blocks Login
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Discipline Cases */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Cases</CardTitle>
          <Dialog open={newCaseOpen} onOpenChange={setNewCaseOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" /> New Case
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Discipline Case</DialogTitle>
              </DialogHeader>
              <NewCaseForm
                tenantId={tenantId}
                onSubmit={(data) => createCaseMutation.mutate(data)}
                isLoading={createCaseMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Offense</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Portal Block</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases?.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-mono text-sm">{caseItem.case_number}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-semibold">{(caseItem.students as any)?.full_name}</p>
                        <p className="text-muted-foreground">{(caseItem.students as any)?.admission_number}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {caseItem.offense_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(caseItem.severity)}>
                        {caseItem.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{caseItem.status}</TableCell>
                    <TableCell>
                      {caseItem.is_active ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Blocked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3" /> Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(caseItem.incident_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewCaseForm({
  tenantId,
  onSubmit,
  isLoading,
}: {
  tenantId: string;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [studentAdmission, setStudentAdmission] = useState("");
  const [offenseType, setOffenseType] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentAdmission || !offenseType || !severity || !incidentDate) {
      alert("Please fill all required fields");
      return;
    }

    // Get student by admission number
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("admission_number", studentAdmission)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!student) {
      alert("Student not found");
      return;
    }

    const caseNumber = `${new Date().toISOString().split("T")[0]}-${studentAdmission}`;

    onSubmit({
      student_id: student.id,
      case_number: caseNumber,
      offense_type: offenseType,
      severity: severity,
      description: description,
      incident_date: incidentDate,
      is_active: true,
      status: "open",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Student Admission Number *</Label>
        <Input
          value={studentAdmission}
          onChange={(e) => setStudentAdmission(e.target.value)}
          placeholder="e.g., 670033"
        />
      </div>
      <div>
        <Label>Offense Type *</Label>
        <Select value={offenseType} onValueChange={setOffenseType}>
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
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Severity *</Label>
        <Select value={severity} onValueChange={setSeverity}>
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
        <Label>Incident Date *</Label>
        <Input
          type="date"
          value={incidentDate}
          onChange={(e) => setIncidentDate(e.target.value)}
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the incident..."
          rows={3}
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Creating..." : "Create Case"}
      </Button>
    </form>
  );
}

function NewRuleForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [ruleName, setRuleName] = useState("");
  const [offenseType, setOffenseType] = useState("");
  const [severity, setSeverity] = useState("");
  const [blocksLogin, setBlocksLogin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !offenseType || !severity) {
      alert("Please fill all required fields");
      return;
    }

    onSubmit({
      rule_name: ruleName,
      offense_type: offenseType,
      severity: severity,
      blocks_portal_login: blocksLogin,
      description: `${offenseType} - ${severity} severity`,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Rule Name *</Label>
        <Input
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          placeholder="e.g., Violence Policy"
        />
      </div>
      <div>
        <Label>Offense Type *</Label>
        <Select value={offenseType} onValueChange={setOffenseType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="violence">Violence</SelectItem>
            <SelectItem value="bullying">Bullying</SelectItem>
            <SelectItem value="academic_dishonesty">Academic Dishonesty</SelectItem>
            <SelectItem value="drugs">Drugs</SelectItem>
            <SelectItem value="sexual_assault">Sexual Assault</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Severity *</Label>
        <Select value={severity} onValueChange={setSeverity}>
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
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="blocksLogin"
          checked={blocksLogin}
          onChange={(e) => setBlocksLogin(e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="blocksLogin">Blocks Student Portal Login</Label>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Creating..." : "Create Rule"}
      </Button>
    </form>
  );
}
