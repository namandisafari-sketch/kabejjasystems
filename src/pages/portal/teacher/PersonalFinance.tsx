import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wallet, DollarSign, Calendar, Clock, Send, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const PersonalFinance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [employee, setEmployee] = useState<any>(null);
  const [advances, setAdvances] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: "", reason: "" });
  const [leaveForm, setLeaveForm] = useState({ start_date: "", end_date: "", reason: "" });

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id, id, full_name, email").eq("id", session.user.id).single();
    if (!p?.tenant_id) { navigate("/login"); return; }
    setTenantId(p.tenant_id);
    setProfileId(p.id);
    setProfileName(p.full_name || "");

    const { data: emp } = await supabase.from("employees").select("*").eq("tenant_id", p.tenant_id).eq("user_id", p.id).maybeSingle();
    if (emp) {
      setEmployee(emp);

      const [adv, pr] = await Promise.all([
        supabase.from("salary_advances").select("*").eq("tenant_id", p.tenant_id).eq("employee_id", emp.id).order("advance_date", { ascending: false }),
        supabase.from("payroll_records").select("*").eq("tenant_id", p.tenant_id).eq("employee_id", emp.id).order("pay_period_end", { ascending: false }),
      ]);
      setAdvances(adv.data || []);
      setPayrolls(pr.data || []);
    }

    setLoading(false);
  };

  const [profileId, setProfileId] = useState("");
  const [profileName, setProfileName] = useState("");

  const handleAdvanceRequest = async () => {
    if (!advanceForm.amount || !employee) return;
    setSaving(true);

    await supabase.from("salary_advances").insert({
      tenant_id: tenantId,
      employee_id: employee.id,
      amount: parseFloat(advanceForm.amount),
      reason: advanceForm.reason || null,
      advance_date: new Date().toISOString().split("T")[0],
      is_deducted: false,
    });

    setSaving(false);
    setShowAdvanceForm(false);
    setAdvanceForm({ amount: "", reason: "" });
    init();
  };

  const handleLeaveRequest = async () => {
    if (!leaveForm.start_date || !leaveForm.end_date || !employee) return;
    setSaving(true);

    await supabase.from("employees").update({
      is_active: false,
    }).eq("id", employee.id);

    await supabase.from("teacher_class_assignments").insert({
      tenant_id: tenantId,
      teacher_id: profileId,
      class_id: null,
      is_class_teacher: false,
      created_by: profileId,
    });

    setSaving(false);
    setShowLeaveForm(false);
    setLeaveForm({ start_date: "", end_date: "", reason: "" });
    init();
  };

  const handleBackToWork = async () => {
    if (!employee) return;
    await supabase.from("employees").update({ is_active: true }).eq("id", employee.id);
    init();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const lastPayroll = payrolls[0];
  const totalAdvances = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const unpaidAdvances = advances.filter(a => !a.is_deducted).reduce((sum, a) => sum + (a.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-primary" /></div>
        <div><h1 className="text-2xl font-bold tracking-tight">Personal Finance</h1><p className="text-sm text-muted-foreground">Salary, advances, and leave management</p></div>
      </div>

      {!employee ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No employee record found for your account.</p>
            <p className="text-sm mt-1">Contact your school administrator to link your profile.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><DollarSign className="h-5 w-5 text-blue-700" /></div>
                <div><p className="text-xs text-muted-foreground">Monthly Salary</p><p className="text-2xl font-bold">UGX {(employee.salary || 0).toLocaleString()}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-green-700" /></div>
                <div><p className="text-xs text-muted-foreground">Last Payment</p><p className="text-2xl font-bold">{lastPayroll ? `UGX ${(lastPayroll.net_pay || lastPayroll.net_salary || 0).toLocaleString()}` : "N/A"}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-700" /></div>
                <div><p className="text-xs text-muted-foreground">Unpaid Advances</p><p className="text-2xl font-bold">UGX {(unpaidAdvances || 0).toLocaleString()}</p></div>
              </div>
            </CardContent></Card>
            <Card><CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${employee.is_active !== false ? "bg-green-100" : "bg-red-100"}`}>
                  {employee.is_active !== false ? <CheckCircle2 className="h-5 w-5 text-green-700" /> : <XCircle className="h-5 w-5 text-red-700" />}
                </div>
                <div><p className="text-xs text-muted-foreground">Status</p><p className="text-2xl font-bold">{employee.is_active !== false ? "Active" : "On Leave"}</p></div>
              </div>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Salary Advances</CardTitle>
                <Button size="sm" onClick={() => setShowAdvanceForm(!showAdvanceForm)} disabled={employee.is_active === false}>
                  <Send className="h-4 w-4 mr-2" /> Request Advance
                </Button>
              </CardHeader>
              <CardContent>
                {showAdvanceForm && (
                  <div className="mb-4 p-4 border rounded-lg space-y-3 bg-muted/30">
                    <div className="space-y-1">
                      <Label>Amount (UGX)</Label>
                      <Input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Reason</Label>
                      <Textarea value={advanceForm.reason} onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })} />
                    </div>
                    <Button size="sm" onClick={handleAdvanceRequest} disabled={saving || !advanceForm.amount}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Submit Request
                    </Button>
                  </div>
                )}
                {advances.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No advance requests.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {advances.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                        <div>
                          <p className="font-medium">UGX {(a.amount || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{a.reason || "No reason"} · {a.advance_date}</p>
                        </div>
                        <Badge className={a.is_deducted ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-700"}>
                          {a.is_deducted ? "Deducted" : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Leave Management</CardTitle>
                {employee.is_active !== false ? (
                  <Button size="sm" onClick={() => setShowLeaveForm(!showLeaveForm)}>
                    <Calendar className="h-4 w-4 mr-2" /> Apply for Leave
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleBackToWork}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Back to Work
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showLeaveForm && (
                  <div className="mb-4 p-4 border rounded-lg space-y-3 bg-muted/30">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Start Date</Label>
                        <Input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>End Date</Label>
                        <Input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Reason</Label>
                      <Textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                    </div>
                    <Button size="sm" onClick={handleLeaveRequest} disabled={saving || !leaveForm.start_date || !leaveForm.end_date}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Submit Leave Request
                    </Button>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Current Status</span>
                    </div>
                    <Badge className={employee.is_active !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {employee.is_active !== false ? "On Duty" : "On Leave"}
                    </Badge>
                  </div>
                  {payrolls.length > 0 && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Last Pay Period</span>
                      </div>
                      <span className="text-sm font-medium">{payrolls[0].pay_period_start} to {payrolls[0].pay_period_end}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Payroll History</CardTitle></CardHeader>
            <CardContent className="p-0">
              {payrolls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No payroll records yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Period</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Gross</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">PAYE</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">NSSF</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Advances</th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Net Pay</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payrolls.map((p: any) => (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm">{p.pay_period_start} to {p.pay_period_end}</td>
                          <td className="px-4 py-3 text-sm text-right">UGX {(p.gross_pay || p.base_salary || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">UGX {(p.paye_tax || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right text-amber-600">UGX {(p.nssf_employee || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right text-orange-600">UGX {(p.advances_deducted || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-green-600">UGX {(p.net_pay || p.net_salary || 0).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <Badge className={p.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>{p.status || "Pending"}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PersonalFinance;