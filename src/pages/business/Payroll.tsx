import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, DollarSign, Users, TrendingDown, Banknote, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { format } from "date-fns";

const Payroll = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("payroll");
  const [isPayrollDrawerOpen, setIsPayrollDrawerOpen] = useState(false);
  const [isAdvanceDrawerOpen, setIsAdvanceDrawerOpen] = useState(false);
  const [payrollForm, setPayrollForm] = useState({
    employee_id: "", pay_period_start: "", pay_period_end: "", base_salary: "",
    deductions: "0", bonuses: "0", payment_method: "cash", notes: "",
  });
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: "", amount: "", advance_date: format(new Date(), "yyyy-MM-dd"), reason: "",
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      return data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from('employees').select('*').eq('tenant_id', profile.tenant_id).eq('is_active', true).order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: payrollRecords = [], isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll-records', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from('payroll_records').select('*, employees(full_name)').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: advances = [] } = useQuery({
    queryKey: ['salary-advances', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from('salary_advances').select('*, employees(full_name)').eq('tenant_id', profile.tenant_id).order('advance_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const getPendingAdvances = (employeeId: string) => advances.filter(a => a.employee_id === employeeId && !a.is_deducted).reduce((sum, a) => sum + Number(a.amount), 0);

  const createPayrollMutation = useMutation({
    mutationFn: async (data: typeof payrollForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const baseSalary = parseFloat(data.base_salary);
      const deductions = parseFloat(data.deductions || "0");
      const bonuses = parseFloat(data.bonuses || "0");
      const pendingAdvances = getPendingAdvances(data.employee_id);
      const netSalary = baseSalary - deductions - pendingAdvances + bonuses;
      const { data: payroll, error } = await supabase.from('payroll_records').insert([{
        tenant_id: profile!.tenant_id, employee_id: data.employee_id, pay_period_start: data.pay_period_start,
        pay_period_end: data.pay_period_end, base_salary: baseSalary, deductions, advances_deducted: pendingAdvances,
        bonuses, net_salary: netSalary, payment_method: data.payment_method, notes: data.notes || null,
        status: 'pending', created_by: user.id,
      }]).select().single();
      if (error) throw error;
      if (pendingAdvances > 0) {
        await supabase.from('salary_advances').update({ is_deducted: true, deducted_in_payroll_id: payroll.id })
          .eq('employee_id', data.employee_id).eq('is_deducted', false);
      }
      return payroll;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      queryClient.invalidateQueries({ queryKey: ['salary-advances'] });
      setIsPayrollDrawerOpen(false);
      resetPayrollForm();
      toast({ title: "Payroll Created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createAdvanceMutation = useMutation({
    mutationFn: async (data: typeof advanceForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from('salary_advances').insert([{
        tenant_id: profile!.tenant_id, employee_id: data.employee_id, amount: parseFloat(data.amount),
        advance_date: data.advance_date, reason: data.reason || null, approved_by: user.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-advances'] });
      setIsAdvanceDrawerOpen(false);
      resetAdvanceForm();
      toast({ title: "Advance Recorded" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payroll_records').update({ status: 'paid', payment_date: format(new Date(), "yyyy-MM-dd") }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast({ title: "Marked as Paid" });
    },
  });

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setPayrollForm(prev => ({ ...prev, employee_id: employeeId, base_salary: employee?.salary?.toString() || "" }));
  };

  const resetPayrollForm = () => {
    setPayrollForm({ employee_id: "", pay_period_start: "", pay_period_end: "", base_salary: "", deductions: "0", bonuses: "0", payment_method: "cash", notes: "" });
  };

  const resetAdvanceForm = () => {
    setAdvanceForm({ employee_id: "", amount: "", advance_date: format(new Date(), "yyyy-MM-dd"), reason: "" });
  };

  const totalPayrollThisMonth = payrollRecords.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).reduce((sum, p) => sum + Number(p.net_salary), 0);
  const pendingPayroll = payrollRecords.filter(p => p.status === 'pending').length;
  const totalAdvances = advances.filter(a => !a.is_deducted).reduce((sum, a) => sum + Number(a.amount), 0);

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Payroll</h1>
            <p className="text-xs text-muted-foreground">Manage salaries & advances</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAdvanceDrawerOpen(true)}>
              <Banknote className="h-4 w-4 mr-1" />
              Advance
            </Button>
            <Button size="sm" onClick={() => setIsPayrollDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Payroll
            </Button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Monthly</p>
              <p className="text-sm font-bold">{(totalPayrollThisMonth / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-sm font-bold">{pendingPayroll}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Advances</p>
              <p className="text-sm font-bold">{(totalAdvances / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </Card>
      </div>

      {/* TABS */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="advances">Advances</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* LIST */}
      <ScrollArea className="flex-1 px-4 py-4 pb-20">
        {activeTab === "payroll" ? (
          payrollLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !payrollRecords.length ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No payroll records</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payrollRecords.map((record: any) => (
                <Card key={record.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{record.employees?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.pay_period_start), "MMM d")} - {format(new Date(record.pay_period_end), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-semibold">{Number(record.net_salary).toLocaleString()}</p>
                      <Badge variant={record.status === 'paid' ? "default" : "secondary"} className="text-xs">
                        {record.status}
                      </Badge>
                    </div>
                  </div>
                  {record.status === 'pending' && (
                    <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => markAsPaidMutation.mutate(record.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )
        ) : (
          !advances.length ? (
            <div className="text-center py-12">
              <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No advances</p>
            </div>
          ) : (
            <div className="space-y-2">
              {advances.map((advance: any) => (
                <Card key={advance.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{advance.employees?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(advance.advance_date), "MMM d, yyyy")}</p>
                      {advance.reason && <p className="text-xs text-muted-foreground mt-1">{advance.reason}</p>}
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-semibold">{Number(advance.amount).toLocaleString()}</p>
                      <Badge variant={advance.is_deducted ? "default" : "secondary"} className="text-xs">
                        {advance.is_deducted ? "Deducted" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </ScrollArea>

      {/* PAYROLL DRAWER */}
      <Drawer open={isPayrollDrawerOpen} onOpenChange={setIsPayrollDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Create Payroll</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            <form id="payroll-form" onSubmit={(e) => { e.preventDefault(); createPayrollMutation.mutate(payrollForm); }} className="space-y-4 pb-4">
              <div>
                <Label>Employee *</Label>
                <Select value={payrollForm.employee_id} onValueChange={handleEmployeeSelect}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Period Start</Label>
                  <Input type="date" value={payrollForm.pay_period_start} onChange={(e) => setPayrollForm(p => ({ ...p, pay_period_start: e.target.value }))} required />
                </div>
                <div>
                  <Label>Period End</Label>
                  <Input type="date" value={payrollForm.pay_period_end} onChange={(e) => setPayrollForm(p => ({ ...p, pay_period_end: e.target.value }))} required />
                </div>
              </div>
              <div>
                <Label>Base Salary (UGX)</Label>
                <Input type="number" value={payrollForm.base_salary} onChange={(e) => setPayrollForm(p => ({ ...p, base_salary: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Deductions</Label>
                  <Input type="number" value={payrollForm.deductions} onChange={(e) => setPayrollForm(p => ({ ...p, deductions: e.target.value }))} />
                </div>
                <div>
                  <Label>Bonuses</Label>
                  <Input type="number" value={payrollForm.bonuses} onChange={(e) => setPayrollForm(p => ({ ...p, bonuses: e.target.value }))} />
                </div>
              </div>
              {payrollForm.employee_id && getPendingAdvances(payrollForm.employee_id) > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Pending Advances:</strong> UGX {getPendingAdvances(payrollForm.employee_id).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <Label>Payment Method</Label>
                <Select value={payrollForm.payment_method} onValueChange={(v) => setPayrollForm(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </ScrollArea>
          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsPayrollDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" form="payroll-form" className="flex-1" disabled={createPayrollMutation.isPending}>
              {createPayrollMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ADVANCE DRAWER */}
      <Drawer open={isAdvanceDrawerOpen} onOpenChange={setIsAdvanceDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Record Advance</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            <form id="advance-form" onSubmit={(e) => { e.preventDefault(); createAdvanceMutation.mutate(advanceForm); }} className="space-y-4 pb-4">
              <div>
                <Label>Employee *</Label>
                <Select value={advanceForm.employee_id} onValueChange={(v) => setAdvanceForm(p => ({ ...p, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (UGX) *</Label>
                <Input type="number" value={advanceForm.amount} onChange={(e) => setAdvanceForm(p => ({ ...p, amount: e.target.value }))} required />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={advanceForm.advance_date} onChange={(e) => setAdvanceForm(p => ({ ...p, advance_date: e.target.value }))} required />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={advanceForm.reason} onChange={(e) => setAdvanceForm(p => ({ ...p, reason: e.target.value }))} rows={2} />
              </div>
            </form>
          </ScrollArea>
          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsAdvanceDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" form="advance-form" className="flex-1" disabled={createAdvanceMutation.isPending}>
              {createAdvanceMutation.isPending ? "Recording..." : "Record"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Payroll;
