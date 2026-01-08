import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Pencil, Trash2, Package, Clock, CheckCircle, XCircle, ShoppingCart } from "lucide-react";
import { format } from "date-fns";

type PurchaseOrder = {
  id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  supplier_id: string;
  suppliers?: { name: string; contact_person: string | null };
};

type PurchaseOrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  received_quantity: number;
  products?: { name: string; sku: string | null };
};

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState({
    supplier_id: "",
    order_date: format(new Date(), "yyyy-MM-dd"),
    expected_delivery_date: "",
    status: "draft",
    notes: "",
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
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, suppliers(name, contact_person)")
        .eq("tenant_id", profile!.tenant_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("tenant_id", profile!.tenant_id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: products } = useQuery({
    queryKey: ["products", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, cost_price, sku")
        .eq("tenant_id", profile!.tenant_id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: orderItemsData } = useQuery({
    queryKey: ["purchase-order-items", viewingOrder?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select("*, products(name, sku)")
        .eq("purchase_order_id", viewingOrder!.id);
      if (error) throw error;
      return data as PurchaseOrderItem[];
    },
    enabled: !!viewingOrder?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
      const orderNumber = editingOrder?.order_number || `PO-${Date.now().toString().slice(-8)}`;
      
      const orderData = {
        tenant_id: profile!.tenant_id,
        supplier_id: data.supplier_id,
        order_number: orderNumber,
        order_date: data.order_date,
        expected_delivery_date: data.expected_delivery_date || null,
        status: data.status,
        subtotal,
        total_amount: subtotal,
        notes: data.notes || null,
      };

      if (editingOrder) {
        const { error } = await supabase
          .from("purchase_orders")
          .update(orderData)
          .eq("id", editingOrder.id);
        if (error) throw error;

        // Delete existing items and re-add
        await supabase.from("purchase_order_items").delete().eq("purchase_order_id", editingOrder.id);
        
        if (orderItems.length > 0) {
          const items = orderItems.map(item => ({
            purchase_order_id: editingOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total_cost: item.quantity * item.unit_cost,
          }));
          const { error: itemsError } = await supabase.from("purchase_order_items").insert(items);
          if (itemsError) throw itemsError;
        }
      } else {
        const { data: newOrder, error } = await supabase
          .from("purchase_orders")
          .insert(orderData)
          .select()
          .single();
        if (error) throw error;

        if (orderItems.length > 0) {
          const items = orderItems.map(item => ({
            purchase_order_id: newOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total_cost: item.quantity * item.unit_cost,
          }));
          const { error: itemsError } = await supabase.from("purchase_order_items").insert(items);
          if (itemsError) throw itemsError;
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Order deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const receiveStockMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Get order items
      const { data: items, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", orderId);
      if (itemsError) throw itemsError;

      // Update each product's stock
      for (const item of items || []) {
        const remainingQty = item.quantity - item.received_quantity;
        if (remainingQty > 0) {
          // Update product stock
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();
          
          await supabase
            .from("products")
            .update({ stock_quantity: (product?.stock_quantity || 0) + remainingQty })
            .eq("id", item.product_id);

          // Mark item as received
          await supabase
            .from("purchase_order_items")
            .update({ received_quantity: item.quantity })
            .eq("id", item.id);
        }
      }

      // Update order status
      await supabase
        .from("purchase_orders")
        .update({ status: "received" })
        .eq("id", orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Stock received and updated" });
      setIsViewDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      order_date: format(new Date(), "yyyy-MM-dd"),
      expected_delivery_date: "",
      status: "draft",
      notes: "",
    });
    setOrderItems([]);
    setEditingOrder(null);
    setIsDialogOpen(false);
  };

  const handleEdit = async (order: PurchaseOrder) => {
    setEditingOrder(order);
    setFormData({
      supplier_id: order.supplier_id,
      order_date: order.order_date,
      expected_delivery_date: order.expected_delivery_date || "",
      status: order.status,
      notes: order.notes || "",
    });

    // Load existing items
    const { data: items } = await supabase
      .from("purchase_order_items")
      .select("product_id, quantity, unit_cost")
      .eq("purchase_order_id", order.id);
    
    setOrderItems(items || []);
    setIsDialogOpen(true);
  };

  const handleView = (order: PurchaseOrder) => {
    setViewingOrder(order);
    setIsViewDialogOpen(true);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { product_id: "", quantity: 1, unit_cost: 0 }]);
  };

  const updateOrderItem = (index: number, field: string, value: string | number) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === "product_id") {
      const product = products?.find(p => p.id === value);
      if (product) {
        updated[index].unit_cost = product.cost_price || 0;
      }
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage orders to suppliers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Order</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOrder ? "Edit Purchase Order" : "New Purchase Order"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="ordered">Ordered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" value={formData.order_date} onChange={(e) => setFormData({ ...formData, order_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery</Label>
                  <Input type="date" value={formData.expected_delivery_date} onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Order Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                    <Plus className="h-4 w-4 mr-1" />Add Item
                  </Button>
                </div>
                {orderItems.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="w-24">Qty</TableHead>
                          <TableHead className="w-32">Unit Cost</TableHead>
                          <TableHead className="w-32">Total</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Select value={item.product_id} onValueChange={(v) => updateOrderItem(index, "product_id", v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products?.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input type="number" min="1" value={item.quantity} onChange={(e) => updateOrderItem(index, "quantity", parseInt(e.target.value) || 1)} />
                            </TableCell>
                            <TableCell>
                              <Input type="number" step="0.01" min="0" value={item.unit_cost} onChange={(e) => updateOrderItem(index, "unit_cost", parseFloat(e.target.value) || 0)} />
                            </TableCell>
                            <TableCell className="font-medium">
                              {(item.quantity * item.unit_cost).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeOrderItem(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="text-right font-bold text-lg">
                  Subtotal: {subtotal.toLocaleString()}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={!formData.supplier_id || saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingOrder ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{purchaseOrders?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{purchaseOrders?.filter(o => o.status === "pending" || o.status === "ordered").length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="text-2xl font-bold">{purchaseOrders?.filter(o => o.status === "received").length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Package className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{purchaseOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0).toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search orders..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filteredOrders?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No purchase orders found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.suppliers?.name}</TableCell>
                    <TableCell>{format(new Date(order.order_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{order.expected_delivery_date ? format(new Date(order.expected_delivery_date), "MMM d, yyyy") : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[order.status]?.variant || "secondary"}>
                        {statusConfig[order.status]?.label || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{Number(order.total_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleView(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(order)} disabled={order.status === "received"}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(order.id)} disabled={order.status === "received"}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - {viewingOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Supplier:</span> {viewingOrder.suppliers?.name}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusConfig[viewingOrder.status]?.variant}>{statusConfig[viewingOrder.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">Order Date:</span> {format(new Date(viewingOrder.order_date), "MMM d, yyyy")}</div>
                <div><span className="text-muted-foreground">Expected:</span> {viewingOrder.expected_delivery_date ? format(new Date(viewingOrder.expected_delivery_date), "MMM d, yyyy") : "-"}</div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItemsData?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products?.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.received_quantity}</TableCell>
                        <TableCell className="text-right">{Number(item.unit_cost).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{Number(item.total_cost).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="text-right font-bold text-lg">
                Total: {Number(viewingOrder.total_amount).toLocaleString()}
              </div>

              {viewingOrder.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes:</span> {viewingOrder.notes}
                </div>
              )}

              {viewingOrder.status !== "received" && viewingOrder.status !== "cancelled" && (
                <div className="flex justify-end">
                  <Button onClick={() => receiveStockMutation.mutate(viewingOrder.id)} disabled={receiveStockMutation.isPending}>
                    <Package className="h-4 w-4 mr-2" />
                    {receiveStockMutation.isPending ? "Processing..." : "Receive Stock"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
