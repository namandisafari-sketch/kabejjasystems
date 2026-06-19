import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";

const Budget = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("tenant_id", p.tenant_id)
      .order("date", { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category || "Other";
    byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0);
  });
  const topCategory = Object.entries(byCategory).sort(([, a], [, b]) => b - a);
  const thisMonth = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyTotal = thisMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
  const lastMonth = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    const now = new Date();
    const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return d.getMonth() === lm && d.getFullYear() === ly;
  });
  const lastMonthTotal = lastMonth.reduce((sum, e) => sum + (e.amount || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Budget Overview</h1><p className="text-sm text-muted-foreground">School budget tracking and expense management</p></div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><DollarSign className="h-5 w-5 text-blue-700" /></div><div><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">UGX {(totalExpenses || 0).toLocaleString()}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-700" /></div><div><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold">UGX {(monthlyTotal || 0).toLocaleString()}</p></div></div></CardContent></Card>
        {lastMonthTotal > 0 && (
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-amber-700" /></div><div><p className="text-xs text-muted-foreground">Last Month</p><p className="text-2xl font-bold">UGX {(lastMonthTotal || 0).toLocaleString()}</p></div></div></CardContent></Card>
        )}
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center"><PieChart className="h-5 w-5 text-purple-700" /></div><div><p className="text-xs text-muted-foreground">Categories</p><p className="text-2xl font-bold">{Object.keys(byCategory).length}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Spending by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCategory.slice(0, 8).map(([cat, amt]) => {
                const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{cat}</span>
                      <span className="text-muted-foreground">UGX {(amt || 0).toLocaleString()} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {topCategory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No expense data.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Expenses</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Description</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Category</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.slice(0, 15).map((e: any) => (
                    <tr key={e.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">{e.description}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground"><span className="capitalize">{e.category || "Other"}</span></td>
                      <td className="px-4 py-3 text-sm font-medium">UGX {(e.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.date ? new Date(e.date).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Budget;