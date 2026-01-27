import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, ShieldAlert, AlertCircle, Package } from "lucide-react";

interface BursarRule {
  id: string;
  rule_name: string;
  rule_type: string;
  balance_operator: string | null;
  balance_amount: number | null;
  class_id: string | null;
  requirement_id: string | null;
  is_active: boolean;
  alert_message: string;
  priority: number;
  school_classes?: { name: string } | null;
  term_requirements?: { name: string } | null;
}

export function BursarRulesManager() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BursarRule | null>(null);
  const [formData, setFormData] = useState({
    rule_name: "",
    rule_type: "balance_threshold",
    balance_operator: ">=",
    balance_amount: "",
    class_id: "",
    requirement_id: "",
    alert_message: "Student is on the bursar's red list",
    is_active: true,
    priority: 0,
  });

  // Fetch rules
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["bursar-rules", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bursar_rules")
        .select(`
          *,
          school_classes (name),
          term_requirements (name)
        `)
        .eq("tenant_id", tenantId)
        .order("priority", { ascending: true });

      if (error) throw error;
      return data as BursarRule[];
    },
    enabled: !!tenantId,
  });

  // Fetch classes for dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ["school-classes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_classes")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch requirements for dropdown
  const { data: requirements = [] } = useQuery({
    queryKey: ["term-requirements", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("term_requirements")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("bursar_rules").insert({
        tenant_id: tenantId,
        rule_name: data.rule_name,
        rule_type: data.rule_type,
        balance_operator: data.rule_type === "balance_threshold" ? data.balance_operator : null,
        balance_amount: data.rule_type === "balance_threshold" ? parseFloat(data.balance_amount) : null,
        class_id: data.class_id || null,
        requirement_id: data.rule_type === "missing_requirement" ? data.requirement_id : null,
        alert_message: data.alert_message,
        is_active: data.is_active,
        priority: data.priority,
        created_by: userData.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bursar-rules"] });
      toast.success("Rule created successfully");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("bursar_rules")
        .update({
          rule_name: data.rule_name,
          rule_type: data.rule_type,
          balance_operator: data.rule_type === "balance_threshold" ? data.balance_operator : null,
          balance_amount: data.rule_type === "balance_threshold" ? parseFloat(data.balance_amount) : null,
          class_id: data.class_id || null,
          requirement_id: data.rule_type === "missing_requirement" ? data.requirement_id : null,
          alert_message: data.alert_message,
          is_active: data.is_active,
          priority: data.priority,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bursar-rules"] });
      toast.success("Rule updated successfully");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bursar_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bursar-rules"] });
      toast.success("Rule deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("bursar_rules")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bursar-rules"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      rule_name: "",
      rule_type: "balance_threshold",
      balance_operator: ">=",
      balance_amount: "",
      class_id: "",
      requirement_id: "",
      alert_message: "Student is on the bursar's red list",
      is_active: true,
      priority: 0,
    });
    setEditingRule(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (rule: BursarRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      balance_operator: rule.balance_operator || ">=",
      balance_amount: rule.balance_amount?.toString() || "",
      class_id: rule.class_id || "",
      requirement_id: rule.requirement_id || "",
      alert_message: rule.alert_message || "Student is on the bursar's red list",
      is_active: rule.is_active,
      priority: rule.priority,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      updateMutation.mutate({ ...formData, id: editingRule.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "balance_threshold":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "missing_requirement":
        return <Package className="h-4 w-4 text-blue-500" />;
      default:
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
    }
  };

  const getRuleDescription = (rule: BursarRule) => {
    if (rule.rule_type === "balance_threshold") {
      return `Balance ${rule.balance_operator} ${formatCurrency(rule.balance_amount)}`;
    }
    if (rule.rule_type === "missing_requirement") {
      return `Missing: ${rule.term_requirements?.name || "Unknown requirement"}`;
    }
    return "Custom rule";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Bursar Red List Rules
          </CardTitle>
          <CardDescription>
            Define rules to automatically block students at the gate
          </CardDescription>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No blocking rules configured yet.</p>
            <p className="text-sm mt-1">Create rules to automatically block students at the gate.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.rule_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRuleTypeIcon(rule.rule_type)}
                      <span className="capitalize">{rule.rule_type.replace("_", " ")}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getRuleDescription(rule)}</TableCell>
                  <TableCell>
                    {rule.school_classes?.name || (
                      <Badge variant="outline">All Classes</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: rule.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Rule" : "Create Blocking Rule"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                placeholder="e.g., High Balance Block"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select
                value={formData.rule_type}
                onValueChange={(value) => setFormData({ ...formData, rule_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance_threshold">Fee Balance Threshold</SelectItem>
                  <SelectItem value="missing_requirement">Missing Requirement</SelectItem>
                  <SelectItem value="custom">Custom Rule</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.rule_type === "balance_threshold" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select
                    value={formData.balance_operator}
                    onValueChange={(value) =>
                      setFormData({ ...formData, balance_operator: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=">=">≥ (Greater or Equal)</SelectItem>
                      <SelectItem value=">">{">"} (Greater Than)</SelectItem>
                      <SelectItem value="=">=  (Equal To)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.balance_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, balance_amount: e.target.value })
                    }
                    placeholder="e.g., 500000"
                    required
                  />
                </div>
              </div>
            )}

            {formData.rule_type === "missing_requirement" && (
              <div className="space-y-2">
                <Label>Requirement</Label>
                <Select
                  value={formData.requirement_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, requirement_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select requirement..." />
                  </SelectTrigger>
                  <SelectContent>
                    {requirements.map((req) => (
                      <SelectItem key={req.id} value={req.id}>
                        {req.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Apply to Class (Optional)</Label>
              <Select
                value={formData.class_id}
                onValueChange={(value) => setFormData({ ...formData, class_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Alert Message</Label>
              <Textarea
                value={formData.alert_message}
                onChange={(e) =>
                  setFormData({ ...formData, alert_message: e.target.value })
                }
                placeholder="Message shown when student is blocked"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Rule Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingRule ? "Update Rule" : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
