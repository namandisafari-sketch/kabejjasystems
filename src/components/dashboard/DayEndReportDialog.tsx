import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign, TrendingUp, CalendarIcon, Lock, AlertCircle, CheckCircle2, Clock,
  ShoppingCart, Banknote, Smartphone, CreditCard, Wallet, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", minimumFractionDigits: 0 }).format(amount);

interface DayEndReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

export const DayEndReportDialog = ({ isOpen, onClose, tenantId }: DayEndReportDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dayData, setDayData] = useState<any>(null);
  const [existingReport, setExistingReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchDayReport();
    }
  }, [isOpen, selectedDate, tenantId]);

  const fetchDayReport = async () => {
    setLoading(true);
    try {
      const day = new Date(selectedDate);
      const dateStr = format(day, "yyyy-MM-dd");
      const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0).toISOString();
      const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59).toISOString();

      const [reportRes, salesRes, prevReportRes] = await Promise.all([
        supabase.from("day_end_reports").select("*").eq("tenant_id", tenantId).eq("report_date", dateStr).maybeSingle(),
        supabase.from("sales").select("id, total_amount, payment_method, sale_date, payment_status").eq("tenant_id", tenantId).gte("sale_date", startOfDay).lte("sale_date", endOfDay),
        supabase.from("day_end_reports").select("closing_balance").eq("tenant_id", tenantId).lt("report_date", dateStr).order("report_date", { ascending: false }).limit(1),
      ]);

      const sales = salesRes.data || [];
      const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const cashSales = sales.filter(s => s.payment_method === "cash").reduce((sum, s) => sum + Number(s.total_amount), 0);
      const momoSales = sales.filter(s => s.payment_method === "mobile_money").reduce((sum, s) => sum + Number(s.total_amount), 0);
      const cardSales = sales.filter(s => s.payment_method === "card").reduce((sum, s) => sum + Number(s.total_amount), 0);
      const creditSales = sales.filter(s => s.payment_method === "credit").reduce((sum, s) => sum + Number(s.total_amount), 0);
      const openingBalance = prevReportRes.data?.[0]?.closing_balance || 0;
      const closingBalance = Number(openingBalance) + totalSales;

      setDayData({
        totalSales, cashSales, momoSales, cardSales, creditSales,
        transactionCount: sales.length,
        openingBalance,
        closingBalance,
      });
      setExistingReport(reportRes.data);
      setNotes(reportRes.data?.notes || "");
    } catch (err) {
      console.error("Day end report error:", err);
      toast.error("Failed to fetch day report data");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDay = async () => {
    if (!existingReport && dayData?.transactionCount === 0) {
      toast.error("No transactions to close today");
      return;
    }
    setClosing(true);
    try {
      const day = new Date(selectedDate);
      const dateStr = format(day, "yyyy-MM-dd");

      const payload = {
        tenant_id: tenantId,
        report_date: dateStr,
        total_sales: dayData.totalSales,
        total_cash: dayData.cashSales,
        total_momo: dayData.momoSales,
        total_card: dayData.cardSales,
        total_credit: dayData.creditSales,
        total_gst_collected: Math.round(dayData.totalSales * 18 / 118 * 100) / 100,
        total_profit: 0,
        opening_balance: dayData.openingBalance,
        closing_balance: dayData.closingBalance,
        transaction_count: dayData.transactionCount,
        notes,
        status: "closed",
        closed_at: new Date().toISOString(),
      };

      if (existingReport) {
        const { error } = await supabase.from("day_end_reports").update(payload).eq("id", existingReport.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("day_end_reports").insert(payload);
        if (error) throw error;
      }

      toast.success("Day closed successfully!");
      fetchDayReport();
    } catch (err: any) {
      console.error("Close day error:", err);
      toast.error(err.message || "Failed to close day");
    } finally {
      setClosing(false);
    }
  };

  const handleGenerateReport = () => {
    const lines = [
      `Day End Report - ${format(selectedDate, "PPP")}`,
      "",
      `Opening Balance: ${formatCurrency(dayData.openingBalance)}`,
      `Closing Balance: ${formatCurrency(dayData.closingBalance)}`,
      `Total Sales: ${formatCurrency(dayData.totalSales)}`,
      `  - Cash: ${formatCurrency(dayData.cashSales)}`,
      `  - Mobile Money: ${formatCurrency(dayData.momoSales)}`,
      `  - Card: ${formatCurrency(dayData.cardSales)}`,
      `  - Credit: ${formatCurrency(dayData.creditSales)}`,
      `Transactions: ${dayData.transactionCount}`,
      "",
      `Status: ${existingReport?.status === "closed" ? "CLOSED" : "OPEN"}`,
      `Notes: ${notes || "N/A"}`,
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `day-end-report-${format(selectedDate, "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isClosed = existingReport?.status === "closed";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Day End Report
          </DialogTitle>
          <DialogDescription>Review and close transactions for the day</DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        {isClosed && (
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>This day has been closed. Transactions are locked.</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="space-y-3 py-8 text-center text-muted-foreground">
              <Clock className="h-6 w-6 mx-auto animate-spin" />
              <p>Loading day report...</p>
            </div>
          ) : dayData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Opening Balance</p>
                    <p className="text-lg font-bold">{formatCurrency(dayData.openingBalance)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Closing Balance</p>
                    <p className="text-lg font-bold">{formatCurrency(dayData.closingBalance)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                      <span>Total Sales</span>
                    </div>
                    <span className="font-bold">{formatCurrency(dayData.totalSales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <span>Cash</span>
                    </div>
                    <span>{formatCurrency(dayData.cashSales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-yellow-600" />
                      <span>Mobile Money</span>
                    </div>
                    <span>{formatCurrency(dayData.momoSales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span>Card</span>
                    </div>
                    <span>{formatCurrency(dayData.cardSales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-red-600" />
                      <span>Credit</span>
                    </div>
                    <span>{formatCurrency(dayData.creditSales)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Transactions</span>
                    <Badge variant="outline">{dayData.transactionCount}</Badge>
                  </div>
                </CardContent>
              </Card>

              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about today's closing..."
                  className="h-20"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              <p>No data available for this date</p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={handleGenerateReport} disabled={!dayData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleCloseDay} disabled={closing || isClosed || (dayData?.transactionCount === 0 && !existingReport)}>
            <Lock className="mr-2 h-4 w-4" />
            {closing ? "Closing..." : isClosed ? "Already Closed" : "Close Day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
