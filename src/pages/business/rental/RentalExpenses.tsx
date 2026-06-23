import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Wallet, TrendingDown, Calendar, Search, Download, Edit, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const RENTAL_EXPENSE_CATEGORIES = [
  "Property Maintenance",
  "Property Management Fees",
  "Insurance",
  "Property Taxes",
  "Utilities (Water/Electricity/Gas)",
  "Cleaning & Janitorial",
  "Landscaping & Gardening",
  "Security Services",
  "Legal & Professional Fees",
  "Marketing & Advertising",
  "Renovations & Improvements",
  "Pest Control",
  "Supplies",
  "Vendor Services",
  "Other",
];

export default function RentalExpenses() {
  const isMobile = useIsMobile();
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "cash",
    vendor_name: "",
    description: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["rental-expenses", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const uploadReceipt = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${tenantId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("rental-uploads")
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("rental-uploads")
        .getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const buildDescription = (vendorName: string, desc: string) => {
    const cleanedDesc = desc.trim();
    if (vendorName.trim()) {
      return `Vendor: ${vendorName.trim()} - ${cleanedDesc}`;
    }
    return cleanedDesc;
  };

  const parseVendorFromDescription = (description: string) => {
    const match = description.match(/^Vendor:\s*(.+?)\s*-\s*(.*)$/);
    if (match) {
      return { vendorName: match[1], description: match[2] };
    }
    return { vendorName: "", description };
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      let receiptUrl = "";
      if (receiptFile) {
        const url = await uploadReceipt(receiptFile);
        if (url) receiptUrl = url;
      }
      const { error } = await supabase.from("expenses").insert({
        tenant_id: tenantId,
        category: formData.category,
        description: buildDescription(formData.vendor_name, formData.description),
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        receipt_url: receiptUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Expense recorded" });
      handleClose();
      queryClient.invalidateQueries({ queryKey: ["rental-expenses"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !editingExpense) throw new Error("No tenant or expense");
      let receiptUrl = editingExpense.receipt_url || "";
      if (receiptFile) {
        const url = await uploadReceipt(receiptFile);
        if (url) receiptUrl = url;
      }
      const { error } = await supabase
        .from("expenses")
        .update({
          category: formData.category,
          description: buildDescription(formData.vendor_name, formData.description),
          amount: parseFloat(formData.amount),
          expense_date: formData.expense_date,
          payment_method: formData.payment_method,
          receipt_url: receiptUrl,
        })
        .eq("id", editingExpense.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Expense updated" });
      handleClose();
      queryClient.invalidateQueries({ queryKey: ["rental-expenses"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Expense deleted" });
      queryClient.invalidateQueries({ queryKey: ["rental-expenses"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditingExpense(null);
    setReceiptFile(null);
    setFormData({
      category: "",
      amount: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "cash",
      vendor_name: "",
      description: "",
    });
  };

  const handleEdit = (expense: any) => {
    const { vendorName, description } = parseVendorFromDescription(expense.description || "");
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount?.toString() || "",
      expense_date: expense.expense_date,
      payment_method: expense.payment_method || "cash",
      vendor_name: vendorName,
      description,
    });
    setOpen(true);
  };

  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const thisMonthExpenses = expenses
    .filter((e: any) => {
      const d = new Date(e.expense_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const thisQuarterExpenses = expenses
    .filter((e: any) => {
      const d = new Date(e.expense_date);
      const now = new Date();
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return d.getFullYear() === now.getFullYear() && d.getMonth() >= quarterStartMonth && d.getMonth() < quarterStartMonth + 3;
    })
    .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  const filteredExpenses = expenses.filter((expense: any) => {
    const matchesSearch =
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    const matchesDateFrom = !dateFrom || new Date(expense.expense_date) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(expense.expense_date) <= new Date(dateTo + "T23:59:59");
    return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
  });

  const getVendorDisplay = (description: string) => {
    const { vendorName } = parseVendorFromDescription(description);
    return vendorName;
  };

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + "M";
    if (amount >= 1000) return (amount / 1000).toFixed(0) + "K";
    return amount.toString();
  };

  const ExpenseForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger className="mt-1.5 h-11">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {RENTAL_EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Amount (UGX)</Label>
        <Input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0"
          className="mt-1.5 h-11"
        />
      </div>
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={formData.expense_date}
          onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
          className="mt-1.5 h-11"
        />
      </div>
      <div>
        <Label>Payment Method</Label>
        <Select
          value={formData.payment_method}
          onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
        >
          <SelectTrigger className="mt-1.5 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="mobile_money">Mobile Money</SelectItem>
            <SelectItem value="bank">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Vendor / Contractor Name</Label>
        <Input
          value={formData.vendor_name}
          onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
          placeholder="Vendor name"
          className="mt-1.5 h-11"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Expense description..."
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>Receipt (optional)</Label>
        <div className="mt-1.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            accept="image/*,.pdf"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {receiptFile ? receiptFile.name : "Upload Receipt"}
          </Button>
          {editingExpense?.receipt_url && !receiptFile && (
            <p className="text-xs text-muted-foreground mt-1">Current receipt saved</p>
          )}
        </div>
      </div>
      <Button
        onClick={() =>
          editingExpense
            ? updateMutation.mutate()
            : createMutation.mutate()
        }
        disabled={
          !formData.category ||
          !formData.amount ||
          createMutation.isPending ||
          updateMutation.isPending ||
          uploading
        }
        className="w-full h-11"
      >
        {(createMutation.isPending || updateMutation.isPending || uploading) && (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        )}
        {editingExpense ? "Update Expense" : "Save Expense"}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Rental Expenses</h1>
            <p className="text-xs text-muted-foreground">Track property expenses</p>
          </div>
          <Button onClick={() => setOpen(true)} size={isMobile ? "icon" : "default"}>
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Add Expense</span>}
          </Button>
        </div>
      </header>

      {isMobile ? (
        <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); setOpen(o); }}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{editingExpense ? "Edit Expense" : "Record New Expense"}</DrawerTitle>
            </DrawerHeader>
            <div className="p-4">
              <ExpenseForm />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); setOpen(o); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? "Edit Expense" : "Record New Expense"}</DialogTitle>
            </DialogHeader>
            <ExpenseForm />
          </DialogContent>
        </Dialog>
      )}

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col">
                <Wallet className="h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{formatCompact(totalExpenses)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col">
                <Calendar className="h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-lg font-bold">{formatCompact(thisMonthExpenses)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col">
                <TrendingDown className="h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">This Quarter</p>
                <p className="text-lg font-bold">{formatCompact(thisQuarterExpenses)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {RENTAL_EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 text-sm"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 text-sm"
              placeholder="To"
            />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Expense History</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8">
                <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No expenses found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((expense: any) => {
                  const vendorName = getVendorDisplay(expense.description);
                  return (
                    <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {expense.category}
                          </Badge>
                          {vendorName && (
                            <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                              {vendorName}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {expense.description || "No description"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(expense.expense_date), "dd MMM yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <div className="text-right">
                          <p className="font-bold text-destructive">
                            -{Number(expense.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">UGX</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {expense.receipt_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => window.open(expense.receipt_url, "_blank")}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(expense)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => {
                              if (window.confirm("Delete this expense?")) {
                                deleteMutation.mutate(expense.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
