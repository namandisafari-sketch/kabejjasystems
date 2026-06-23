import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download, Building2, Clock } from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", minimumFractionDigits: 0 }).format(amount);

interface SupplierAgingReportProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

interface AgingBucket {
  supplier: string;
  total: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
}

const getAgeBucket = (days: number) => {
  if (days <= 30) return "bucket_0_30";
  if (days <= 60) return "bucket_31_60";
  if (days <= 90) return "bucket_61_90";
  return "bucket_90_plus";
};

export const SupplierAgingReport = ({ isOpen, onClose, tenantId }: SupplierAgingReportProps) => {
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [asOfDate] = useState(new Date());

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchSupplierAging();
    }
  }, [isOpen, tenantId]);

  const fetchSupplierAging = async () => {
    setLoading(true);
    try {
      const { data: purchases, error } = await supabase
        .from("purchases")
        .select("id, supplier_id, total_amount, paid_amount, purchase_date, suppliers!purchases_supplier_id_fkey(name)")
        .eq("tenant_id", tenantId)
        .order("purchase_date", { ascending: false });

      if (error) throw error;

      const now = new Date();
      const supplierMap = new Map<string, AgingBucket>();

      (purchases || []).forEach((p: any) => {
        const supplierName = p.suppliers?.name || "Unknown";
        const outstanding = Number(p.total_amount) - Number(p.paid_amount || 0);
        if (outstanding <= 0) return;

        const days = Math.floor((now.getTime() - new Date(p.purchase_date).getTime()) / (1000 * 60 * 60 * 24));
        const bucket = getAgeBucket(days);

        if (!supplierMap.has(supplierName)) {
          supplierMap.set(supplierName, {
            supplier: supplierName,
            total: 0,
            bucket_0_30: 0,
            bucket_31_60: 0,
            bucket_61_90: 0,
            bucket_90_plus: 0,
          });
        }

        const entry = supplierMap.get(supplierName)!;
        entry.total += outstanding;
        entry[bucket] += outstanding;
      });

      setAgingData(Array.from(supplierMap.values()).sort((a, b) => b.total - a.total));
    } catch (err) {
      console.error("Supplier aging error:", err);
      toast.error("Failed to fetch supplier aging data");
    } finally {
      setLoading(false);
    }
  };

  const grandTotal = agingData.reduce((sum, s) => sum + s.total, 0);
  const bucketTotals = agingData.reduce(
    (acc, s) => ({
      bucket_0_30: acc.bucket_0_30 + s.bucket_0_30,
      bucket_31_60: acc.bucket_31_60 + s.bucket_31_60,
      bucket_61_90: acc.bucket_61_90 + s.bucket_61_90,
      bucket_90_plus: acc.bucket_90_plus + s.bucket_90_plus,
    }),
    { bucket_0_30: 0, bucket_31_60: 0, bucket_61_90: 0, bucket_90_plus: 0 }
  );

  const handleExport = () => {
    const headers = "Supplier,0-30 Days,31-60 Days,61-90 Days,90+ Days,Total Outstanding";
    const rows = agingData.map(s =>
      `${s.supplier},${s.bucket_0_30},${s.bucket_31_60},${s.bucket_61_90},${s.bucket_90_plus},${s.total}`
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplier-aging-${format(asOfDate, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Supplier Aging Report
          </DialogTitle>
          <DialogDescription>
            As of {format(asOfDate, "PPP")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="h-6 w-6 mx-auto animate-spin mb-2" />
              <p>Loading supplier aging...</p>
            </div>
          ) : agingData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No outstanding supplier balances found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Outstanding</p>
                    <p className="text-lg font-bold">{formatCurrency(grandTotal)}</p>
                  </CardContent>
                </Card>
                {[
                  { label: "0-30 Days", value: bucketTotals.bucket_0_30, color: "text-green-600" },
                  { label: "31-60 Days", value: bucketTotals.bucket_31_60, color: "text-yellow-600" },
                  { label: "61-90 Days", value: bucketTotals.bucket_61_90, color: "text-orange-600" },
                  { label: "90+ Days", value: bucketTotals.bucket_90_plus, color: "text-red-600" },
                ].map((b, i) => (
                  <Card key={i}>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">{b.label}</p>
                      <p className={`text-lg font-bold ${b.color}`}>{formatCurrency(b.value)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Aging Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Supplier</th>
                      <th className="text-right p-3 font-medium">0-30 Days</th>
                      <th className="text-right p-3 font-medium">31-60 Days</th>
                      <th className="text-right p-3 font-medium">61-90 Days</th>
                      <th className="text-right p-3 font-medium">90+ Days</th>
                      <th className="text-right p-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingData.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3 font-medium">{row.supplier}</td>
                        <td className="p-3 text-right">{formatCurrency(row.bucket_0_30)}</td>
                        <td className="p-3 text-right">{formatCurrency(row.bucket_31_60)}</td>
                        <td className="p-3 text-right">{formatCurrency(row.bucket_61_90)}</td>
                        <td className="p-3 text-right text-red-600">{formatCurrency(row.bucket_90_plus)}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleExport} disabled={agingData.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
