import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const FeesManagement = () => {
  const navigate = useNavigate();
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalExpected: 0, totalCollected: 0, totalOutstanding: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    const { data: p } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", session.user.id)
      .single();
    if (!p?.tenant_id) return;

    const [feeRes, studentFeeRes] = await Promise.all([
      supabase.from("fee_structures").select("*").eq("tenant_id", p.tenant_id),
      supabase.from("student_fees").select("total_amount, amount_paid, balance, status").eq("tenant_id", p.tenant_id),
    ]);

    setFeeStructures(feeRes.data || []);

    if (studentFeeRes.data) {
      const totalExpected = studentFeeRes.data.reduce((a: number, b: any) => a + (b.total_amount || 0), 0);
      const totalCollected = studentFeeRes.data.reduce((a: number, b: any) => a + (b.amount_paid || 0), 0);
      const totalOutstanding = studentFeeRes.data.reduce((a: number, b: any) => a + (b.balance || 0), 0);
      setSummary({ totalExpected, totalCollected, totalOutstanding });
    }

    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fees Management</h1>
          <p className="text-sm text-muted-foreground">School fee structures and collections</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Fee Structure</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">UGX {(summary.totalExpected || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Expected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">UGX {(summary.totalCollected || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Collected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">UGX {(summary.totalOutstanding || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Outstanding</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b">
            <h3 className="font-medium">Fee Structures</h3>
          </div>
          {feeStructures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No fee structures defined.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Level</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Mandatory</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {feeStructures.map((f: any) => (
                    <tr key={f.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{f.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{f.fee_type}</td>
                      <td className="px-4 py-3 text-sm">UGX {(f.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{f.level || "All"}</td>
                      <td className="px-4 py-3">
                        <Badge className={f.is_mandatory ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>
                          {f.is_mandatory ? "Mandatory" : "Optional"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={f.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {f.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeesManagement;
