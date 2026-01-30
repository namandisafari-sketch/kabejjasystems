import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, TrendingUp, Users, Settings, CheckCircle, XCircle, AlertTriangle, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

interface PromotionRule {
  id: string;
  rule_name: string;
  rule_type: string;
  class_id: string | null;
  term_id: string | null;
  minimum_gpa: number | null;
  gpa_scale: number | null;
  minimum_aggregate_percentage: number | null;
  max_failed_subjects: number | null;
  non_qualifying_action: string;
  is_active: boolean;
  apply_to_all_classes: boolean;
}

export default function PromotionRules() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("rules");
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PromotionRule | null>(null);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<any>(null);

  // Form state for new/edit rule
  const [ruleForm, setRuleForm] = useState({
    rule_name: "",
    rule_type: "gpa_threshold",
    class_id: "",
    minimum_gpa: 2.5,
    gpa_scale: 5.0,
    minimum_aggregate_percentage: 50,
    max_failed_subjects: 2,
    non_qualifying_action: "manual_decision",
    is_active: true,
    apply_to_all_classes: false,
  });

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ["classes", tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_classes")
        .select("*")
        .eq("tenant_id", tenantData!.tenantId)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch current term
  const { data: currentTerm } = useQuery({
    queryKey: ["current-term", tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("tenant_id", tenantData!.tenantId)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch promotion rules
  const { data: rules = [] } = useQuery({
    queryKey: ["promotion-rules", tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotion_rules")
        .select(`
          *,
          school_classes!class_id (name),
          academic_terms (name)
        `)
        .eq("tenant_id", tenantData!.tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch promotion decisions
  const { data: decisions = [] } = useQuery({
    queryKey: ["promotion-decisions", tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotion_decisions")
        .select(`
          *,
          students (full_name, admission_number),
          from_class:school_classes!promotion_decisions_from_class_id_fkey (name),
          to_class:school_classes!promotion_decisions_to_class_id_fkey (name),
          academic_terms (name)
        `)
        .eq("tenant_id", tenantData!.tenantId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Pending decisions count
  const pendingDecisions = decisions.filter(d => 
    d.decision_type === "pending_review" || d.decision_type === "pending_parent_meeting"
  );

  // Save rule
  const saveRuleMutation = useMutation({
    mutationFn: async (data: typeof ruleForm) => {
      const { data: user } = await supabase.auth.getUser();
      const payload = {
        tenant_id: tenantData!.tenantId,
        rule_name: data.rule_name,
        rule_type: data.rule_type,
        class_id: data.class_id || null,
        term_id: currentTerm?.id || null,
        minimum_gpa: data.rule_type === "gpa_threshold" ? data.minimum_gpa : null,
        gpa_scale: data.rule_type === "gpa_threshold" ? data.gpa_scale : null,
        minimum_aggregate_percentage: data.rule_type === "aggregate_score" ? data.minimum_aggregate_percentage : null,
        max_failed_subjects: data.rule_type === "subject_failure_count" ? data.max_failed_subjects : null,
        non_qualifying_action: data.non_qualifying_action,
        is_active: data.is_active,
        apply_to_all_classes: data.apply_to_all_classes,
        created_by: user.user?.id,
      };

      if (selectedRule) {
        const { error } = await supabase
          .from("promotion_rules")
          .update(payload)
          .eq("id", selectedRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("promotion_rules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotion-rules"] });
      setRuleDialogOpen(false);
      setSelectedRule(null);
      resetRuleForm();
      toast({ title: "Rule saved", description: "Promotion rule has been saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete rule
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("promotion_rules")
        .delete()
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotion-rules"] });
      toast({ title: "Rule deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update decision
  const updateDecisionMutation = useMutation({
    mutationFn: async ({ decisionId, updates }: { decisionId: string; updates: any }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("promotion_decisions")
        .update({
          ...updates,
          decided_by: user.user?.id,
          decided_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", decisionId);
      if (error) throw error;

      // If promoted, update student's class
      if (updates.decision_type === "promoted" && updates.to_class_id) {
        const decision = decisions.find(d => d.id === decisionId);
        if (decision) {
          const { error: studentError } = await supabase
            .from("students")
            .update({
              class_id: updates.to_class_id,
              promoted_from_class_id: decision.from_class_id,
              promotion_status: "promoted",
              updated_at: new Date().toISOString(),
            })
            .eq("id", decision.student_id);
          if (studentError) throw studentError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotion-decisions"] });
      setDecisionDialogOpen(false);
      setSelectedDecision(null);
      toast({ title: "Decision updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetRuleForm = () => {
    setRuleForm({
      rule_name: "",
      rule_type: "gpa_threshold",
      class_id: "",
      minimum_gpa: 2.5,
      gpa_scale: 5.0,
      minimum_aggregate_percentage: 50,
      max_failed_subjects: 2,
      non_qualifying_action: "manual_decision",
      is_active: true,
      apply_to_all_classes: false,
    });
  };

  const openEditRule = (rule: any) => {
    setSelectedRule(rule);
    setRuleForm({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      class_id: rule.class_id || "",
      minimum_gpa: rule.minimum_gpa || 2.5,
      gpa_scale: rule.gpa_scale || 5.0,
      minimum_aggregate_percentage: rule.minimum_aggregate_percentage || 50,
      max_failed_subjects: rule.max_failed_subjects || 2,
      non_qualifying_action: rule.non_qualifying_action,
      is_active: rule.is_active,
      apply_to_all_classes: rule.apply_to_all_classes,
    });
    setRuleDialogOpen(true);
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case "gpa_threshold": return "GPA Threshold";
      case "subject_based": return "Subject-Based";
      case "aggregate_score": return "Aggregate Score";
      case "subject_failure_count": return "Subject Failure Count";
      default: return type;
    }
  };

  const getDecisionBadgeVariant = (type: string) => {
    switch (type) {
      case "promoted": return "default";
      case "retained": return "secondary";
      case "conditional_promotion": return "outline";
      case "withdrawn": return "destructive";
      case "pending_review": return "secondary";
      case "pending_parent_meeting": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promotion & Retention</h1>
          <p className="text-muted-foreground">
            Configure promotion rules and manage student advancement decisions
          </p>
        </div>
        {pendingDecisions.length > 0 && (
          <Badge variant="destructive" className="text-sm">
            {pendingDecisions.length} Pending Decision{pendingDecisions.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">
            <Settings className="h-4 w-4 mr-2" />
            Promotion Rules ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="decisions">
            <Users className="h-4 w-4 mr-2" />
            Student Decisions ({decisions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              resetRuleForm();
              setSelectedRule(null);
              setRuleDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Promotion Rules</CardTitle>
              <CardDescription>
                Rules that determine whether students are promoted or retained
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No promotion rules configured yet. Create your first rule to get started.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Criteria</TableHead>
                      <TableHead>Non-Qualifying Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.rule_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRuleTypeLabel(rule.rule_type)}</Badge>
                        </TableCell>
                        <TableCell>
                          {rule.apply_to_all_classes 
                            ? "All Classes" 
                            : (rule.school_classes as any)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {rule.rule_type === "gpa_threshold" && `Min GPA: ${rule.minimum_gpa}/${rule.gpa_scale}`}
                          {rule.rule_type === "aggregate_score" && `Min: ${rule.minimum_aggregate_percentage}%`}
                          {rule.rule_type === "subject_failure_count" && `Max ${rule.max_failed_subjects} failed`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {rule.non_qualifying_action.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditRule(rule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Promotion Decisions</CardTitle>
              <CardDescription>
                Review and finalize promotion decisions for each student
              </CardDescription>
            </CardHeader>
            <CardContent>
              {decisions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No promotion decisions yet. Run the promotion process after exams to generate decisions.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>From Class</TableHead>
                      <TableHead>To Class</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decisions.map((decision) => (
                      <TableRow key={decision.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{(decision.students as any)?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(decision.students as any)?.admission_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{(decision.from_class as any)?.name || "-"}</TableCell>
                        <TableCell>{(decision.to_class as any)?.name || "-"}</TableCell>
                        <TableCell>{(decision.academic_terms as any)?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getDecisionBadgeVariant(decision.decision_type)}>
                            {decision.decision_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {decision.decision_reason || "-"}
                        </TableCell>
                        <TableCell>
                          {(decision.decision_type === "pending_review" || 
                            decision.decision_type === "pending_parent_meeting") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDecision(decision);
                                setDecisionDialogOpen(true);
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRule ? "Edit Rule" : "Add Promotion Rule"}</DialogTitle>
            <DialogDescription>
              Define criteria for student promotion or retention
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={ruleForm.rule_name}
                onChange={(e) => setRuleForm(p => ({ ...p, rule_name: e.target.value }))}
                placeholder="e.g., Minimum GPA for S.1 to S.2"
              />
            </div>

            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select
                value={ruleForm.rule_type}
                onValueChange={(v) => setRuleForm(p => ({ ...p, rule_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpa_threshold">GPA Threshold</SelectItem>
                  <SelectItem value="aggregate_score">Aggregate Score</SelectItem>
                  <SelectItem value="subject_failure_count">Subject Failure Count</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ruleForm.rule_type === "gpa_threshold" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum GPA</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max={ruleForm.gpa_scale}
                    value={ruleForm.minimum_gpa}
                    onChange={(e) => setRuleForm(p => ({ ...p, minimum_gpa: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>GPA Scale</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={ruleForm.gpa_scale}
                    onChange={(e) => setRuleForm(p => ({ ...p, gpa_scale: parseFloat(e.target.value) || 5 }))}
                  />
                </div>
              </div>
            )}

            {ruleForm.rule_type === "aggregate_score" && (
              <div className="space-y-2">
                <Label>Minimum Aggregate Percentage</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={ruleForm.minimum_aggregate_percentage}
                  onChange={(e) => setRuleForm(p => ({ ...p, minimum_aggregate_percentage: parseInt(e.target.value) || 50 }))}
                />
              </div>
            )}

            {ruleForm.rule_type === "subject_failure_count" && (
              <div className="space-y-2">
                <Label>Maximum Failed Subjects</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={ruleForm.max_failed_subjects}
                  onChange={(e) => setRuleForm(p => ({ ...p, max_failed_subjects: parseInt(e.target.value) || 2 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Students failing more than this many subjects will not qualify for promotion
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Apply to All Classes</Label>
                <p className="text-xs text-muted-foreground">
                  Rule applies to every class
                </p>
              </div>
              <Switch
                checked={ruleForm.apply_to_all_classes}
                onCheckedChange={(c) => setRuleForm(p => ({ ...p, apply_to_all_classes: c }))}
              />
            </div>

            {!ruleForm.apply_to_all_classes && (
              <div className="space-y-2">
                <Label>Specific Class</Label>
                <Select
                  value={ruleForm.class_id}
                  onValueChange={(v) => setRuleForm(p => ({ ...p, class_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Action for Non-Qualifying Students</Label>
              <Select
                value={ruleForm.non_qualifying_action}
                onValueChange={(v) => setRuleForm(p => ({ ...p, non_qualifying_action: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_retain">Automatic Retention</SelectItem>
                  <SelectItem value="manual_decision">Require Manual Decision</SelectItem>
                  <SelectItem value="parent_meeting">Require Parent Meeting</SelectItem>
                  <SelectItem value="optional_withdrawal">Optional Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={ruleForm.is_active}
                onCheckedChange={(c) => setRuleForm(p => ({ ...p, is_active: c }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveRuleMutation.mutate(ruleForm)}
              disabled={saveRuleMutation.isPending || !ruleForm.rule_name}
            >
              {saveRuleMutation.isPending ? "Saving..." : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decision Dialog */}
      <DecisionDialog
        open={decisionDialogOpen}
        onOpenChange={setDecisionDialogOpen}
        decision={selectedDecision}
        classes={classes}
        onUpdate={(updates) => updateDecisionMutation.mutate({ decisionId: selectedDecision?.id, updates })}
        isUpdating={updateDecisionMutation.isPending}
      />
    </div>
  );
}

// Decision review dialog component
function DecisionDialog({
  open,
  onOpenChange,
  decision,
  classes,
  onUpdate,
  isUpdating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision: any;
  classes: any[];
  onUpdate: (updates: any) => void;
  isUpdating: boolean;
}) {
  const [decisionType, setDecisionType] = useState(decision?.decision_type || "pending_review");
  const [toClassId, setToClassId] = useState(decision?.to_class_id || "");
  const [reason, setReason] = useState(decision?.decision_reason || "");
  const [conditions, setConditions] = useState(decision?.conditions || "");

  // Reset form when decision changes
  useState(() => {
    if (decision) {
      setDecisionType(decision.decision_type);
      setToClassId(decision.to_class_id || "");
      setReason(decision.decision_reason || "");
      setConditions(decision.conditions || "");
    }
  });

  if (!decision) return null;

  const handleSubmit = () => {
    onUpdate({
      decision_type: decisionType,
      to_class_id: decisionType === "promoted" || decisionType === "conditional_promotion" ? toClassId : null,
      decision_reason: reason,
      conditions: decisionType === "conditional_promotion" ? conditions : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Promotion Decision</DialogTitle>
          <DialogDescription>
            Make a decision for {(decision.students as any)?.full_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Decision</Label>
            <Select value={decisionType} onValueChange={setDecisionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="promoted">
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Promote
                  </span>
                </SelectItem>
                <SelectItem value="conditional_promotion">
                  <span className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                    Conditional Promotion
                  </span>
                </SelectItem>
                <SelectItem value="retained">
                  <span className="flex items-center">
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                    Retain (Repeat Class)
                  </span>
                </SelectItem>
                <SelectItem value="withdrawn">
                  <span className="flex items-center">
                    <XCircle className="h-4 w-4 mr-2 text-destructive" />
                    Withdraw
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(decisionType === "promoted" || decisionType === "conditional_promotion") && (
            <div className="space-y-2">
              <Label>Promote to Class</Label>
              <Select value={toClassId} onValueChange={setToClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {decisionType === "conditional_promotion" && (
            <div className="space-y-2">
              <Label>Conditions</Label>
              <Textarea
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="e.g., Must attend remedial classes during holidays"
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason / Notes</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for this decision..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save Decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}