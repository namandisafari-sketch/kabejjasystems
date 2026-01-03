import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, DollarSign, Users, TrendingDown, Calendar, Banknote, CheckCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const Payroll = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("payroll");
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [payrollForm, setPayrollForm] = useState({
    employee_id: "",
    pay_period_start: "",
    pay_period_end: "",
    base_salary: "",
    deductions: "0",
    bonuses: "0",
    payment_method: "cash",
    notes: "",
  });
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: "",
    amount: "",
    advance_date: format(new Date(), "yyyy-MM-dd"),
    reason: "",
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
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

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: payrollRecords = [], isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll-records', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*, employees(full_name)')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: advances = [], isLoading: advancesLoading } = useQuery({
    queryKey: ['salary-advances', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('salary_advances')
        .select('*, employees(full_name)')
        .eq('tenant_id', profile.tenant_id)
        .order('advance_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Calculate pending advances for an employee
  const getPendingAdvances = (employeeId: string) => {
    return advances
      .filter(a => a.employee_id === employeeId && !a.is_deducted)
      .reduce((sum, a) => sum + Number(a.amount), 0);
  };

  const createPayrollMutation = useMutation({
    mutationFn: async (data: typeof payrollForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const baseSalary = parseFloat(data.base_salary);
      const deductions = parseFloat(data.deductions || "0");
      const bonuses = parseFloat(data.bonuses || "0");
      const pendingAdvances = getPendingAdvances(data.employee_id);
      const netSalary = baseSalary - deductions - pendingAdvances + bonuses;

      const { data: payroll, error } = await supabase
        .from('payroll_records')
        .insert([{
          tenant_id: profile!.tenant_id,
          employee_id: data.employee_id,
          pay_period_start: data.pay_period_start,
          pay_period_end: data.pay_period_end,
          base_salary: baseSalary,
          deductions: deductions,
          advances_deducted: pendingAdvances,
          bonuses: bonuses,
          net_salary: netSalary,
          payment_method: data.payment_method,
          notes: data.notes || null,
          status: 'pending',
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Mark advances as deducted
      if (pendingAdvances > 0) {
        const { error: advanceError } = await supabase
          .from('salary_advances')
          .update({ 
            is_deducted: true, 
            deducted_in_payroll_id: payroll.id 
          })
          .eq('employee_id', data.employee_id)
          .eq('is_deducted', false);
        
        if (advanceError) throw advanceError;
      }

      return payroll;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      queryClient.invalidateQueries({ queryKey: ['salary-advances'] });
      setIsPayrollDialogOpen(false);
      setPayrollForm({
        employee_id: "",
        pay_period_start: "",
        pay_period_end: "",
        base_salary: "",
        deductions: "0",
        bonuses: "0",
        payment_method: "cash",
        notes: "",
      });
      toast({ title: "Payroll Created", description: "Payroll record has been created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createAdvanceMutation = useMutation({
    mutationFn: async (data: typeof advanceForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('salary_advances')
        .insert([{
          tenant_id: profile!.tenant_id,
          employee_id: data.employee_id,
          amount: parseFloat(data.amount),
          advance_date: data.advance_date,
          reason: data.reason || null,
          approved_by: user.id,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-advances'] });
      setIsAdvanceDialogOpen(false);
      setAdvanceForm({
        employee_id: "",
        amount: "",
        advance_date: format(new Date(), "yyyy-MM-dd"),
        reason: "",
      });
      toast({ title: "Advance Recorded", description: "Salary advance has been recorded" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payroll_records')
        .update({ status: 'paid', payment_date: format(new Date(), "yyyy-MM-dd") })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast({ title: "Marked as Paid", description: "Payroll has been marked as paid" });
    },
  });

  // Update base salary when employee is selected
  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setPayrollForm(prev => ({
      ...prev,
      employee_id: employeeId,
      base_salary: employee?.salary?.toString() || "",
    }));
  };

  // Summary stats
  const totalPayrollThisMonth = payrollRecords
    .filter(p => new Date(p.created_at).getMonth() === new Date().getMonth())
    .reduce((sum, p) => sum + Number(p.net_salary), 0);

  const pendingPayroll = payrollRecords.filter(p => p.status === 'pending').length;
  const totalAdvances = advances.filter(a => !a.is_deducted).reduce((sum, a) => sum + Number(a.amount), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Track salaries, advances, and payments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Banknote className="h-4 w-4 mr-2" />
                Record Advance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Salary Advance</DialogTitle>
                <DialogDescription>Record an advance payment to an employee</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createAdvanceMutation.mutate(advanceForm); }} className="space-y-4">
                <div>
                  <Label>Employee</Label>
                  <Select value={advanceForm.employee_id} onValueChange={(v) => setAdvanceForm(p => ({ ...p, employee_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (UGX)</Label>
                  <Input
                    type="number"
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={advanceForm.advance_date}
                    onChange={(e) => setAdvanceForm(p => ({ ...p, advance_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea
                    value={advanceForm.reason}
                    onChange={(e) => setAdvanceForm(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Reason for advance..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createAdvanceMutation.isPending}>
                  {createAdvanceMutation.isPending ? "Saving..." : "Record Advance"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Payroll
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Payroll Record</DialogTitle>
                <DialogDescription>Process salary payment for an employee</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createPayrollMutation.mutate(payrollForm); }} className="space-y-4">
                <div>
                  <Label>Employee</Label>
                  <Select value={payrollForm.employee_id} onValueChange={handleEmployeeSelect}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} - {emp.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Period Start</Label>
                    <Input
                      type="date"
                      value={payrollForm.pay_period_start}
                      onChange={(e) => setPayrollForm(p => ({ ...p, pay_period_start: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Period End</Label>
                    <Input
                      type="date"
                      value={payrollForm.pay_period_end}
                      onChange={(e) => setPayrollForm(p => ({ ...p, pay_period_end: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Base Salary (UGX)</Label>
                  <Input
                    type="number"
                    value={payrollForm.base_salary}
                    onChange={(e) => setPayrollForm(p => ({ ...p, base_salary: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Deductions</Label>
                    <Input
                      type="number"
                      value={payrollForm.deductions}
                      onChange={(e) => setPayrollForm(p => ({ ...p, deductions: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Bonuses</Label>
                    <Input
                      type="number"
                      value={payrollForm.bonuses}
                      onChange={(e) => setPayrollForm(p => ({ ...p, bonuses: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                {payrollForm.employee_id && getPendingAdvances(payrollForm.employee_id) > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Pending Advances:</strong> UGX {getPendingAdvances(payrollForm.employee_id).toLocaleString()}
                      <br />
                      <span className="text-xs">This will be auto-deducted from net salary</span>
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
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={payrollForm.notes}
                    onChange={(e) => setPayrollForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Additional notes..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createPayrollMutation.isPending}>
                  {createPayrollMutation.isPending ? "Creating..." : "Create Payroll"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">UGX {totalPayrollThisMonth.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{employees.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{pendingPayroll}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Advances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">UGX {totalAdvances.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payroll">Payroll Records</TabsTrigger>
          <TabsTrigger value="advances">Salary Advances</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>All salary payments and records</CardDescription>
            </CardHeader>
            <CardContent>
              {payrollLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : payrollRecords.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No payroll records yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Advances</TableHead>
                      <TableHead>Bonuses</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {(record.employees as any)?.full_name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(record.pay_period_start), "MMM d")} - {format(new Date(record.pay_period_end), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{Number(record.base_salary).toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">-{Number(record.deductions).toLocaleString()}</TableCell>
                        <TableCell className="text-amber-600">-{Number(record.advances_deducted).toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">+{Number(record.bonuses).toLocaleString()}</TableCell>
                        <TableCell className="font-bold">{Number(record.net_salary).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => markAsPaidMutation.mutate(record.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Paid
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

        <TabsContent value="advances">
          <Card>
            <CardHeader>
              <CardTitle>Salary Advances</CardTitle>
              <CardDescription>Track advance payments to employees</CardDescription>
            </CardHeader>
            <CardContent>
              {advancesLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : advances.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No salary advances recorded</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map((advance) => (
                      <TableRow key={advance.id}>
                        <TableCell className="font-medium">
                          {(advance.employees as any)?.full_name || "Unknown"}
                        </TableCell>
                        <TableCell>UGX {Number(advance.amount).toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(advance.advance_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>{advance.reason || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={advance.is_deducted ? 'default' : 'secondary'}>
                            {advance.is_deducted ? 'Deducted' : 'Pending'}
                          </Badge>
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
    </div>
  );
};

export default Payroll;
