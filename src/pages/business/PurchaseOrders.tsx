import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Package, CheckCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  ordered: { label: "Ordered", variant: "default" },
  partially_received: { label: "Partial", variant: "outline" },
  received: { label: "Received", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function PurchaseOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [formData, setFormData] = useState({
    supplier_id: "", order_date: format(new Date(), "yyyy-MM-dd"), expected_delivery_date: "", status: "draft", notes: "",
  });
  const [orderItems, setOrderItems] = useState<Array<{ product_id: string; quantity: number; unit_cost: number }>>([]);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      return data;
    },
  });

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["purchase-orders", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("*, suppliers(name)").eq("tenant_id", profile!.tenant_id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name").eq("tenant_id", profile!.tenant_id).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: products } = useQuery({
    queryKey: ["products", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, cost_price").eq("tenant_id", profile!.tenant_id).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: orderItemsData } = useQuery({
    queryKey: ["purchase-order-items", viewingOrder?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_order_items").select("*, products(name)").eq("purchase_order_id", viewingOrder!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!viewingOrder?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
      const orderNumber = editingOrder?.order_number || `PO-${Date.now().toString().slice(-8)}`;
      const orderData = {
        tenant_id: profile!.tenant_id, supplier_id: data.supplier_id, order_number: orderNumber,
        order_date: data.order_date, expected_delivery_date: data.expected_delivery_date || null,
        status: data.status, subtotal, total_amount: subtotal, notes: data.notes || null,
      };
      if (editingOrder) {
        const { error } = await supabase.from("purchase_orders").update(orderData).eq("id", editingOrder.id);
        if (error) throw error;
        await supabase.from("purchase_order_items").delete().eq("purchase_order_id", editingOrder.id);
        if (orderItems.length > 0) {
          const items = orderItems.map(item => ({
            purchase_order_id: editingOrder.id, product_id: item.product_id, quantity: item.quantity,
            unit_cost: item.unit_cost, total_cost: item.quantity * item.unit_cost,
          }));
          await supabase.from("purchase_order_items").insert(items);
        }
      } else {
        const { data: newOrder, error } = await supabase.from("purchase_orders").insert(orderData).select().single();
        if (error) throw error;
        if (orderItems.length > 0) {
          const items = orderItems.map(item => ({
            purchase_order_id: newOrder.id, product_id: item.product_id, quantity: item.quantity,
            unit_cost: item.unit_cost, total_cost: item.quantity * item.unit_cost,
          }));
          await supabase.from("purchase_order_items").insert(items);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: editingOrder ? "Order updated" : "Order created" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const receiveStockMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: items } = await supabase.from("purchase_order_items").select("*").eq("purchase_order_id", orderId);
      for (const item of items || []) {
        const remainingQty = item.quantity - item.received_quantity;
        if (remainingQty > 0) {
          const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", item.product_id).single();
          await supabase.from("products").update({ stock_quantity: (product?.stock_quantity || 0) + remainingQty }).eq("id", item.product_id);
          await supabase.from("purchase_order_items").update({ received_quantity: item.quantity }).eq("id", item.id);
        }
      }
      await supabase.from("purchase_orders").update({ status: "received" }).eq("id", orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Stock received" });
      setIsViewDrawerOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ supplier_id: "", order_date: format(new Date(), "yyyy-MM-dd"), expected_delivery_date: "", status: "draft", notes: "" });
    setOrderItems([]);
    setEditingOrder(null);
    setIsDrawerOpen(false);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_id: "", quantity: 1, unit_cost: 0 }]);
  };

  const updateOrderItem = (index: number, field: string, value: string | number) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "product_id") {
      const product = products?.find(p => p.id === value);
      if (product) updated[index].unit_cost = product.cost_price || 0;
    }
    setOrderItems(updated);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const filteredOrders = purchaseOrders?.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Purchase Orders</h1>
            <p className="text-xs text-muted-foreground">{purchaseOrders?.length || 0} orders</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setIsDrawerOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* ORDER LIST */}
      <ScrollArea className="flex-1 px-4 py-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !filteredOrders?.length ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No purchase orders</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="p-3" onClick={() => { setViewingOrder(order); setIsViewDrawerOpen(true); }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.order_number}</p>
                      <Badge variant={statusConfig[order.status]?.variant || "secondary"} className="text-xs">
                        {statusConfig[order.status]?.label || order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{order.suppliers?.name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(order.order_date), "MMM d, yyyy")}</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-semibold">{Number(order.total_amount).toLocaleString()}</p>
                    <Eye className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* CREATE/EDIT DRAWER */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader>
            <DrawerTitle>{editingOrder ? "Edit Order" : "New Purchase Order"}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[65vh]">
            <form id="po-form" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4 pb-4">
              <div>
                <Label>Supplier *</Label>
                <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Order Date</Label>
                  <Input type="date" value={formData.order_date} onChange={(e) => setFormData({ ...formData, order_date: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {orderItems.map((item, index) => (
                    <Card key={index} className="p-2">
                      <div className="space-y-2">
                        <Select value={item.product_id} onValueChange={(v) => updateOrderItem(index, "product_id", v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Product" /></SelectTrigger>
                          <SelectContent>
                            {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-3 gap-2">
                          <Input type="number" min="1" value={item.quantity} onChange={(e) => updateOrderItem(index, "quantity", parseInt(e.target.value) || 1)} placeholder="Qty" />
                          <Input type="number" value={item.unit_cost} onChange={(e) => updateOrderItem(index, "unit_cost", parseFloat(e.target.value) || 0)} placeholder="Cost" />
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeOrderItem(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <p className="text-right font-bold mt-2">Total: {subtotal.toLocaleString()}</p>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
              </div>
            </form>
          </ScrollArea>
          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" form="po-form" className="flex-1" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* VIEW DRAWER */}
      <Drawer open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{viewingOrder?.order_number}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            {viewingOrder && (
              <div className="space-y-4 pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant={statusConfig[viewingOrder.status]?.variant || "secondary"}>
                    {statusConfig[viewingOrder.status]?.label || viewingOrder.status}
                  </Badge>
                  <p className="text-lg font-bold">{Number(viewingOrder.total_amount).toLocaleString()} UGX</p>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Supplier:</span> {viewingOrder.suppliers?.name}</p>
                  <p><span className="text-muted-foreground">Date:</span> {format(new Date(viewingOrder.order_date), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="font-medium mb-2">Items</p>
                  <div className="space-y-2">
                    {orderItemsData?.map((item: any) => (
                      <Card key={item.id} className="p-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{item.products?.name}</p>
                          <p className="text-sm">{item.quantity} × {Number(item.unit_cost).toLocaleString()}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsViewDrawerOpen(false)}>Close</Button>
            {viewingOrder && viewingOrder.status !== "received" && viewingOrder.status !== "cancelled" && (
              <Button className="flex-1" onClick={() => receiveStockMutation.mutate(viewingOrder.id)} disabled={receiveStockMutation.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" />
                {receiveStockMutation.isPending ? "Receiving..." : "Receive Stock"}
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
