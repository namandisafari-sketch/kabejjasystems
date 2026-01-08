import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Package, Trash2 } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";

const USAGE_REASONS = [
  { value: "staff_meal", label: "Staff Meal" },
  { value: "damaged", label: "Damaged" },
  { value: "expired", label: "Expired" },
  { value: "sample", label: "Sample/Tasting" },
  { value: "business_use", label: "Business Use" },
  { value: "theft", label: "Theft/Loss" },
  { value: "other", label: "Other" },
];

export default function InternalUsage() {
  const { data: tenantData } = useTenant();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products", tenantData?.tenantId],
    queryFn: async () => {
      if (!tenantData?.tenantId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock_quantity")
        .eq("tenant_id", tenantData.tenantId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantData?.tenantId,
  });

  const { data: usageRecords, isLoading } = useQuery({
    queryKey: ["internal-usage", tenantData?.tenantId],
    queryFn: async () => {
      if (!tenantData?.tenantId) return [];
      const { data, error } = await supabase
        .from("internal_stock_usage")
        .select(`
          *,
          products(name)
        `)
        .eq("tenant_id", tenantData.tenantId)
        .order("usage_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantData?.tenantId,
  });

  const recordUsageMutation = useMutation({
    mutationFn: async () => {
      if (!tenantData?.tenantId) throw new Error("No tenant");
      
      // Insert usage record
      const { error: usageError } = await supabase
        .from("internal_stock_usage")
        .insert({
          tenant_id: tenantData.tenantId,
          product_id: selectedProduct,
          quantity,
          reason,
          notes: notes || null,
        });
      if (usageError) throw usageError;

      // Deduct stock
      const product = products?.find((p) => p.id === selectedProduct);
      if (product) {
        const newStock = Math.max(0, (product.stock_quantity || 0) - quantity);
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock_quantity: newStock })
          .eq("id", selectedProduct);
        if (stockError) throw stockError;
      }
    },
    onSuccess: () => {
      toast.success("Usage recorded and stock updated");
      queryClient.invalidateQueries({ queryKey: ["internal-usage"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to record usage: " + error.message);
    },
  });

  const deleteUsageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("internal_stock_usage")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Record deleted");
      queryClient.invalidateQueries({ queryKey: ["internal-usage"] });
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const resetForm = () => {
    setSelectedProduct("");
    setQuantity(1);
    setReason("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !reason || quantity < 1) {
      toast.error("Please fill all required fields");
      return;
    }
    recordUsageMutation.mutate();
  };

  const getReasonLabel = (value: string) => {
    return USAGE_REASONS.find((r) => r.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Internal Stock Usage</h1>
          <p className="text-muted-foreground">
            Track stock used internally (staff meals, damaged, samples, etc.)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Usage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Internal Usage</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Stock: {product.stock_quantity || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {USAGE_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={recordUsageMutation.isPending}>
                  {recordUsageMutation.isPending ? "Recording..." : "Record Usage"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Usage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : usageRecords?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No usage records yet. Click "Record Usage" to add one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageRecords?.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.usage_date), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>{record.products?.name || "Unknown"}</TableCell>
                    <TableCell>{record.quantity}</TableCell>
                    <TableCell>{getReasonLabel(record.reason)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {record.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteUsageMutation.mutate(record.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
