// File: src/pages/business/Expenses.tsx
// MOBILE-FIRST RESPONSIVE DESIGN

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Wallet, TrendingDown, Calendar, Search } from "lucide-react";
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
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

// Generic expense categories
const GENERIC_EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Supplies",
  "Maintenance",
  "Marketing",
  "Transport",
  "Food & Beverages",
  "Equipment",
  "Other"
];

// School-specific expense categories for bursar
const SCHOOL_EXPENSE_CATEGORIES = [
  "Staff Salaries",
  "Teaching Materials",
  "Stationery & Supplies",
  "Electricity & Water",
  "Transport (School Trips)",
  "Transport (Fuel)",
  "Maintenance & Repairs",
  "Examination Expenses",
  "Cleaning Supplies",
  "Security Services",
  "Medical Supplies",
  "Sports Equipment",
  "Library Books",
  "Computer & IT",
  "Food (Boarding)",
  "Staff Welfare",
  "Bank Charges",
  "Printing & Photocopying",
  "Telephone & Internet",
  "Furniture & Fixtures",
  "Miscellaneous",
  "Other"
];

export default function Expenses() {
  const isMobile = useIsMobile();
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const businessType = tenantQuery.data?.businessType;
  const { filterBranchId } = useBranchFilter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: "cash",
  });

  // Determine which categories to use based on business type
  const isSchoolBusiness = ['kindergarten', 'primary_school', 'secondary_school', 'school'].includes(businessType || '');
  const EXPENSE_CATEGORIES = isSchoolBusiness ? SCHOOL_EXPENSE_CATEGORIES : GENERIC_EXPENSE_CATEGORIES;

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', tenantId, filterBranchId],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('expense_date', { ascending: false });
      
      if (filterBranchId) {
        query = query.eq('branch_id', filterBranchId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase.from('expenses').insert({
        tenant_id: tenantId,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Expense recorded" });
      setOpen(false);
      setFormData({
        category: "",
        description: "",
        amount: "",
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: "cash",
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const thisMonthExpenses = expenses?.filter(e => {
    const expenseDate = new Date(e.expense_date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  const filteredExpenses = expenses?.filter(expense =>
    expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(0) + 'K';
    }
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
            {EXPENSE_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional notes..."
          className="mt-1.5"
        />
      </div>
      <Button 
        onClick={() => createMutation.mutate()} 
        disabled={!formData.category || !formData.amount || createMutation.isPending}
        className="w-full h-11"
      >
        {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Save Expense
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
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Expenses</h1>
            <p className="text-xs text-muted-foreground">Track business expenses</p>
          </div>
          <Button onClick={() => setOpen(true)} size={isMobile ? "icon" : "default"}>
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Add Expense</span>}
          </Button>
        </div>
      </header>

      {/* ADD EXPENSE DRAWER/DIALOG */}
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Record New Expense</DrawerTitle>
            </DrawerHeader>
            <div className="p-4">
              <ExpenseForm />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm />
          </DialogContent>
        </Dialog>
      )}

      {/* MAIN CONTENT */}
      <div className="p-4 space-y-4">
        {/* STATS CARDS */}
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
                <p className="text-xs text-muted-foreground">Records</p>
                <p className="text-lg font-bold">{expenses?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* EXPENSE LIST */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Expense History</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredExpenses?.length === 0 ? (
              <div className="text-center py-8">
                <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No expenses recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses?.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {expense.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">
                          {expense.payment_method?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {expense.description || 'No description'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(expense.expense_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-bold text-destructive">
                        -{Number(expense.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">UGX</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
