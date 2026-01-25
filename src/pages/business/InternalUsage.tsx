import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Package, Trash2, Search } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { Badge } from "@/components/ui/badge";

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products", tenantData?.tenantId],
    queryFn: async () => {
      if (!tenantData?.tenantId) return [];
      const { data, error } = await supabase.from("products").select("id, name, stock_quantity").eq("tenant_id", tenantData.tenantId).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantData?.tenantId,
  });

  const { data: usageRecords, isLoading } = useQuery({
    queryKey: ["internal-usage", tenantData?.tenantId],
    queryFn: async () => {
      if (!tenantData?.tenantId) return [];
      const { data, error } = await supabase.from("internal_stock_usage").select(`*, products(name)`).eq("tenant_id", tenantData.tenantId).order("usage_date", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantData?.tenantId,
  });

  const recordUsageMutation = useMutation({
    mutationFn: async () => {
      if (!tenantData?.tenantId) throw new Error("No tenant");
      const { error: usageError } = await supabase.from("internal_stock_usage").insert({ tenant_id: tenantData.tenantId, product_id: selectedProduct, quantity, reason, notes: notes || null });
      if (usageError) throw usageError;
      const product = products?.find((p) => p.id === selectedProduct);
      if (product) {
        const newStock = Math.max(0, (product.stock_quantity || 0) - quantity);
        const { error: stockError } = await supabase.from("products").update({ stock_quantity: newStock }).eq("id", selectedProduct);
        if (stockError) throw stockError;
      }
    },
    onSuccess: () => {
      toast.success("Usage recorded");
      queryClient.invalidateQueries({ queryKey: ["internal-usage"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      resetForm();
      setIsDrawerOpen(false);
    },
    onError: (error) => {
      toast.error("Failed: " + error.message);
    },
  });

  const deleteUsageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("internal_stock_usage").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["internal-usage"] });
    },
    onError: (error) => {
      toast.error("Failed: " + error.message);
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

  const getReasonLabel = (value: string) => USAGE_REASONS.find((r) => r.value === value)?.label || value;

  const filteredRecords = usageRecords?.filter(r => 
    r.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Internal Usage</h1>
            <p className="text-xs text-muted-foreground">Track stock used internally</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setIsDrawerOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Record
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* USAGE LIST */}
      <ScrollArea className="flex-1 px-4 py-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !filteredRecords?.length ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No usage records</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Record Usage
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRecords.map((record: any) => (
              <Card key={record.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{record.products?.name}</p>
                      <Badge variant="secondary" className="text-xs">{getReasonLabel(record.reason)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(record.usage_date), "MMM d, yyyy h:mm a")}
                    </p>
                    {record.notes && <p className="text-xs text-muted-foreground truncate mt-1">{record.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <p className="font-semibold">-{record.quantity}</p>
                    <Button variant="ghost" size="sm" onClick={() => deleteUsageMutation.mutate(record.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* RECORD DRAWER */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Record Usage</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            <form id="usage-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div>
                <Label>Product *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Stock: {product.stock_quantity || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <Label>Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {USAGE_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." rows={2} />
              </div>
            </form>
          </ScrollArea>
          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" form="usage-form" className="flex-1" disabled={recordUsageMutation.isPending}>
              {recordUsageMutation.isPending ? "Recording..." : "Record"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
