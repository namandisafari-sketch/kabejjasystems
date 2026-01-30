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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, UserMinus, TrendingUp, Settings, Users, RefreshCw, Eye, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function StudentLifecycle() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [withdrawalType, setWithdrawalType] = useState("manual");

  // Fetch withdrawal settings
  const { data: withdrawalSettings } = useQuery({
    queryKey: ["withdrawal-settings", tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_settings")
        .select("*")
        .eq("tenant_id", tenantData!.tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch students at risk of withdrawal
  const { data: atRiskStudents = [] } = useQuery({
    queryKey: ["at-risk-students", tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const threshold = withdrawalSettings?.absence_threshold_days || 45;
      const warningThreshold = Math.floor(threshold * 0.7); // 70% of threshold
      
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          school_classes!class_id (name)
        `)
        .eq("tenant_id", tenantData!.tenantId)
        .eq("is_active", true)
        .eq("status", "active")
        .gte("consecutive_absence_days", warningThreshold)
        .order("consecutive_absence_days", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch absence alerts
  const { data: absenceAlerts = [] } = useQuery({
    queryKey: ["absence-alerts", tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absence_alerts")
        .select(`
          *,
          students (full_name, admission_number)
        `)
        .eq("tenant_id", tenantData!.tenantId)
        .eq("acknowledged", false)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch withdrawn students
  const { data: withdrawnStudents = [] } = useQuery({
    queryKey: ["withdrawn-students", tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          school_classes!class_id (name)
        `)
        .eq("tenant_id", tenantData!.tenantId)
        .eq("status", "withdrawn")
        .order("withdrawal_date", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Save withdrawal settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const { error } = await supabase
        .from("withdrawal_settings")
        .upsert({
          ...settings,
          tenant_id: tenantData!.tenantId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-settings"] });
      toast({ title: "Settings saved", description: "Withdrawal settings have been updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Process student withdrawal
  const withdrawStudentMutation = useMutation({
    mutationFn: async ({ studentId, reason, type }: { studentId: string; reason: string; type: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc("process_student_withdrawal", {
        p_student_id: studentId,
        p_tenant_id: tenantData!.tenantId,
        p_withdrawal_type: type,
        p_withdrawal_reason: reason,
        p_performed_by: user.user?.id,
        p_auto_void_fees: withdrawalSettings?.auto_void_fees ?? true,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["at-risk-students"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawn-students"] });
      queryClient.invalidateQueries({ queryKey: ["absence-alerts"] });
      setWithdrawalDialogOpen(false);
      setSelectedStudent(null);
      setWithdrawalReason("");
      
      const feesVoided = (result as any)?.fees_voided?.total_voided || 0;
      toast({
        title: "Student withdrawn",
        description: feesVoided > 0 
          ? `Student has been marked as withdrawn. ${feesVoided.toLocaleString()} UGX in fees were voided.`
          : "Student has been marked as withdrawn.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Run absence check
  const runAbsenceCheckMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("check_absence_withdrawals", {
        p_tenant_id: tenantData!.tenantId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["at-risk-students"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawn-students"] });
      queryClient.invalidateQueries({ queryKey: ["absence-alerts"] });
      
      const count = (result as any)?.withdrawn_count || 0;
      toast({
        title: "Absence check complete",
        description: count > 0 
          ? `${count} student(s) have been automatically withdrawn.`
          : "No students exceeded the absence threshold.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Acknowledge alert
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("absence_alerts")
        .update({
          acknowledged: true,
          acknowledged_by: user.user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absence-alerts"] });
      toast({ title: "Alert acknowledged" });
    },
  });

  const threshold = withdrawalSettings?.absence_threshold_days || 45;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Lifecycle Management</h1>
          <p className="text-muted-foreground">
            Monitor attendance, manage withdrawals, and track student status
          </p>
        </div>
        <Button
          onClick={() => runAbsenceCheckMutation.mutate()}
          disabled={runAbsenceCheckMutation.isPending || !withdrawalSettings}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${runAbsenceCheckMutation.isPending ? 'animate-spin' : ''}`} />
          Run Absence Check
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <AlertTriangle className="h-4 w-4 mr-2" />
            At-Risk Students ({atRiskStudents.length})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Eye className="h-4 w-4 mr-2" />
            Alerts ({absenceAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="withdrawn">
            <UserMinus className="h-4 w-4 mr-2" />
            Withdrawn ({withdrawnStudents.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Students At Risk of Withdrawal</CardTitle>
              <CardDescription>
                Students who have been absent for more than {Math.floor(threshold * 0.7)} days (70% of threshold)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {atRiskStudents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No students are currently at risk of withdrawal.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Absent Days</TableHead>
                      <TableHead>Last Present</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {atRiskStudents.map((student) => {
                      const riskPercent = (student.consecutive_absence_days / threshold) * 100;
                      const riskLevel = riskPercent >= 100 ? "critical" : riskPercent >= 85 ? "high" : "medium";
                      
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell>{student.admission_number}</TableCell>
                          <TableCell>{student.school_classes?.name || "-"}</TableCell>
                          <TableCell>
                            <span className="font-semibold">{student.consecutive_absence_days}</span>
                            <span className="text-muted-foreground"> / {threshold}</span>
                          </TableCell>
                          <TableCell>
                            {student.last_attendance_date 
                              ? format(new Date(student.last_attendance_date), "MMM d, yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              riskLevel === "critical" ? "destructive" :
                              riskLevel === "high" ? "default" : "secondary"
                            }>
                              {riskLevel === "critical" ? "Auto-Withdraw" : 
                               riskLevel === "high" ? "High Risk" : "At Risk"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedStudent(student);
                                setWithdrawalDialogOpen(true);
                              }}
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              Withdraw
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Absence Alerts</CardTitle>
              <CardDescription>
                Notifications about students who have exceeded absence thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {absenceAlerts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No unacknowledged alerts.
                </p>
              ) : (
                <div className="space-y-3">
                  {absenceAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            alert.alert_type === "auto_withdrawn" ? "destructive" :
                            alert.alert_type === "critical" ? "default" : "secondary"
                          }>
                            {alert.alert_type}
                          </Badge>
                          <span className="font-medium">
                            {(alert.students as any)?.full_name}
                          </span>
                          <span className="text-muted-foreground">
                            ({(alert.students as any)?.admission_number})
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.alert_message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(alert.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawn Students</CardTitle>
              <CardDescription>
                Students who have been marked as withdrawn from school
              </CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawnStudents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No withdrawn students.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Withdrawal Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawnStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell>{student.admission_number}</TableCell>
                        <TableCell>{student.school_classes?.name || "-"}</TableCell>
                        <TableCell>
                          {student.withdrawal_date 
                            ? format(new Date(student.withdrawal_date), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.withdrawal_type === "automatic" ? "secondary" : "outline"}>
                            {student.withdrawal_type || "manual"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {student.withdrawal_reason || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <WithdrawalSettingsForm
            settings={withdrawalSettings}
            onSave={(settings) => saveSettingsMutation.mutate(settings)}
            isSaving={saveSettingsMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Student</DialogTitle>
            <DialogDescription>
              Confirm withdrawal for {selectedStudent?.full_name}. 
              {withdrawalSettings?.auto_void_fees && " Outstanding fees will be automatically voided."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Withdrawal Type</Label>
              <Select value={withdrawalType} onValueChange={setWithdrawalType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Withdrawal</SelectItem>
                  <SelectItem value="transfer">Transfer to Another School</SelectItem>
                  <SelectItem value="expulsion">Expulsion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason for Withdrawal</Label>
              <Textarea
                value={withdrawalReason}
                onChange={(e) => setWithdrawalReason(e.target.value)}
                placeholder="Enter the reason for withdrawal..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => withdrawStudentMutation.mutate({
                studentId: selectedStudent?.id,
                reason: withdrawalReason,
                type: withdrawalType,
              })}
              disabled={withdrawStudentMutation.isPending || !withdrawalReason}
            >
              {withdrawStudentMutation.isPending ? "Processing..." : "Confirm Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Settings form component
function WithdrawalSettingsForm({ 
  settings, 
  onSave, 
  isSaving 
}: { 
  settings: any; 
  onSave: (s: any) => void; 
  isSaving: boolean 
}) {
  const [formData, setFormData] = useState({
    absence_threshold_days: settings?.absence_threshold_days || 45,
    minimum_attendance_window_days: settings?.minimum_attendance_window_days || 14,
    exclude_holidays: settings?.exclude_holidays ?? true,
    auto_void_fees: settings?.auto_void_fees ?? true,
    require_dos_approval: settings?.require_dos_approval ?? false,
    notification_enabled: settings?.notification_enabled ?? true,
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal Settings</CardTitle>
        <CardDescription>
          Configure automatic withdrawal rules based on student absence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="threshold">Absence Threshold (Days)</Label>
            <Input
              id="threshold"
              type="number"
              min={1}
              max={365}
              value={formData.absence_threshold_days}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                absence_threshold_days: parseInt(e.target.value) || 45 
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Students absent for this many consecutive days will be automatically withdrawn
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="window">Minimum Attendance Window (Days)</Label>
            <Input
              id="window"
              type="number"
              min={1}
              max={60}
              value={formData.minimum_attendance_window_days}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                minimum_attendance_window_days: parseInt(e.target.value) || 14 
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Student must have attended at least this many days before absence tracking starts
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exclude School Holidays</Label>
              <p className="text-xs text-muted-foreground">
                Don't count holidays in absence calculations
              </p>
            </div>
            <Switch
              checked={formData.exclude_holidays}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                exclude_holidays: checked 
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Void Outstanding Fees</Label>
              <p className="text-xs text-muted-foreground">
                Automatically void unpaid fees when a student is withdrawn
              </p>
            </div>
            <Switch
              checked={formData.auto_void_fees}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                auto_void_fees: checked 
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require DOS Approval</Label>
              <p className="text-xs text-muted-foreground">
                Automatic withdrawals require DOS approval before taking effect
              </p>
            </div>
            <Switch
              checked={formData.require_dos_approval}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                require_dos_approval: checked 
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send in-app notifications for absence alerts
              </p>
            </div>
            <Switch
              checked={formData.notification_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                notification_enabled: checked 
              }))}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}