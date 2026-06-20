import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle, TrendingDown, Box, Pill, FlaskConical, Ban, Eye, ExternalLink } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  stock_quantity: number;
  min_stock_level: number | null;
  unit_price: number;
  cost_price: number | null;
  unit_of_measure: string | null;
  expiry_date: string | null;
  product_type: string | null;
  supplier: string | null;
  is_active: boolean;
  created_at: string;
}

const PHARMACY_CATEGORIES = [
  "Antibiotics",
  "Antimalarials",
  "Analgesics & Pain Relief",
  "Antihypertensives",
  "Antidiabetics",
  "Antacids & GI",
  "Antihistamines",
  "Respiratory Drugs",
  "Vitamins & Supplements",
  "Topical Preparations",
  "Eye & Ear Drops",
  "IV Fluids & Injectables",
  "Controlled Substances",
  "Medical Consumables",
  "First Aid Supplies",
  "OTC Medications",
  "Baby Care",
  "Personal Care",
];

const PHARMACY_UNITS = [
  "Tablets",
  "Capsules",
  "Bottles",
  "Vials",
  "Ampoules",
  "Sachets",
  "Tubes",
  "Rolls",
  "Packs",
  "Boxes",
  "Cartons",
  "Pairs",
  "Pieces",
  "Milliliters",
  "Grams",
  "Inhalers",
  "Patches",
  "Syringes",
];

const STOCK_ALERT_THRESHOLD_DAYS = 90;

export default function Inventory() {
  const { data: tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    brand: "",
    category: "",
    description: "",
    stock_quantity: 0,
    min_stock_level: 10,
    cost_price: 0,
    unit_price: 0,
    unit_of_measure: "Tablets",
    expiry_date: "",
    supplier: "",
    product_type: "medicine",
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('products')
        .insert({
          tenant_id: tenant?.tenantId,
          name: data.name,
          sku: data.sku || null,
          barcode: data.barcode || null,
          brand: data.brand || null,
          category: data.category || null,
          description: data.description || null,
          stock_quantity: data.stock_quantity,
          min_stock_level: data.min_stock_level,
          unit_price: data.unit_price,
          cost_price: data.cost_price || null,
          unit_of_measure: data.unit_of_measure,
          expiry_date: data.expiry_date || null,
          supplier: data.supplier || null,
          product_type: data.product_type || 'medicine',
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: "Item added successfully" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error adding item", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('products')
        .update({
          name: data.name,
          sku: data.sku || null,
          barcode: data.barcode || null,
          brand: data.brand || null,
          category: data.category || null,
          description: data.description || null,
          stock_quantity: data.stock_quantity,
          min_stock_level: data.min_stock_level,
          unit_price: data.unit_price,
          cost_price: data.cost_price || null,
          unit_of_measure: data.unit_of_measure,
          expiry_date: data.expiry_date || null,
          supplier: data.supplier || null,
          product_type: data.product_type || 'medicine',
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: "Item updated successfully" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error updating item", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: "Item removed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error removing item", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      barcode: "",
      brand: "",
      category: "",
      description: "",
      stock_quantity: 0,
      min_stock_level: 10,
      cost_price: 0,
      unit_price: 0,
      unit_of_measure: "Tablets",
      expiry_date: "",
      supplier: "",
      product_type: "medicine",
    });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku || "",
      barcode: item.barcode || "",
      brand: item.brand || "",
      category: item.category || "",
      description: item.description || "",
      stock_quantity: item.stock_quantity || 0,
      min_stock_level: item.min_stock_level || 10,
      cost_price: item.cost_price || 0,
      unit_price: item.unit_price || 0,
      unit_of_measure: item.unit_of_measure || "Tablets",
      expiry_date: item.expiry_date || "",
      supplier: item.supplier || "",
      product_type: item.product_type || "medicine",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Item name is required", variant: "destructive" });
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredItems = items?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    if (activeTab === "low-stock") {
      const isLow = item.min_stock_level && item.stock_quantity <= item.min_stock_level;
      if (!isLow) return false;
    }
    if (activeTab === "out-of-stock") {
      if (item.stock_quantity !== 0) return false;
    }
    if (activeTab === "expiring") {
      if (!item.expiry_date) return false;
      const daysUntilExpiry = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry > STOCK_ALERT_THRESHOLD_DAYS || daysUntilExpiry < 0) return false;
    }
    if (activeTab === "expired") {
      if (!item.expiry_date) return false;
      if (new Date(item.expiry_date) >= new Date()) return false;
    }
    return matchesSearch && matchesCategory;
  });

  const now = new Date();
  const stats = {
    totalItems: items?.length || 0,
    totalValue: items?.reduce((sum, i) => sum + ((i.cost_price || 0) * i.stock_quantity), 0) || 0,
    lowStock: items?.filter(i => i.min_stock_level && i.stock_quantity <= i.min_stock_level).length || 0,
    outOfStock: items?.filter(i => i.stock_quantity === 0).length || 0,
    expiringSoon: items?.filter(i => {
      if (!i.expiry_date) return false;
      const days = Math.ceil((new Date(i.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= STOCK_ALERT_THRESHOLD_DAYS;
    }).length || 0,
    expired: items?.filter(i => i.expiry_date && new Date(i.expiry_date) < now).length || 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderStockBadge = (item: InventoryItem) => {
    if (item.stock_quantity === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (item.min_stock_level && item.stock_quantity <= item.min_stock_level) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    return <Badge variant="default">In Stock</Badge>;
  };

  const renderExpiryBadge = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return <Badge variant="destructive">Expired</Badge>;
    if (daysUntilExpiry <= 30) return <Badge variant="secondary" className="bg-red-100 text-red-800">{daysUntilExpiry}d left</Badge>;
    if (daysUntilExpiry <= 90) return <Badge variant="secondary" className="bg-amber-100 text-amber-800">{daysUntilExpiry}d left</Badge>;
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pharmacy Inventory</h1>
          <p className="text-muted-foreground">Manage medicines, supplies and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Medicine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update medicine inventory details" : "Add a new medicine or supply to inventory"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Medicine Name *</Label>
                    <Input id="name" placeholder="e.g., Amoxicillin 500mg" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input id="brand" placeholder="e.g., GSK" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU / Code</Label>
                    <Input id="sku" placeholder="Internal code" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input id="barcode" placeholder="Scan or enter" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Select value={formData.supplier} onValueChange={(v) => setFormData({ ...formData, supplier: v })}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers?.map((s: any) => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {PHARMACY_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit of Measure</Label>
                    <Select value={formData.unit_of_measure} onValueChange={(v) => setFormData({ ...formData, unit_of_measure: v })}>
                      <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                      <SelectContent>
                        {PHARMACY_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input id="stock" type="number" min="0" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Min Stock Level (Reorder Point)</Label>
                    <Input id="minStock" type="number" min="0" value={formData.min_stock_level} onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Cost Price (UGX)</Label>
                    <Input id="costPrice" type="number" min="0" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Selling Price (UGX)</Label>
                    <Input id="unitPrice" type="number" min="0" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input id="expiryDate" type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productType">Product Type</Label>
                    <Select value={formData.product_type} onValueChange={(v) => setFormData({ ...formData, product_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medicine">Medicine</SelectItem>
                        <SelectItem value="supplement">Supplement</SelectItem>
                        <SelectItem value="consumable">Medical Consumable</SelectItem>
                        <SelectItem value="device">Medical Device</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description / Notes</Label>
                  <Textarea id="description" placeholder="Dosage info, instructions, notes..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingItem ? "Update" : "Add Medicine"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.expired > 0 ? "text-destructive" : ""}`}>{stats.expired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <FlaskConical className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.expiringSoon > 0 ? "text-amber-600" : ""}`}>{stats.expiringSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.outOfStock}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, brand, SKU or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PHARMACY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All Items ({items?.length || 0})</TabsTrigger>
          <TabsTrigger value="low-stock" className="text-yellow-600">Low Stock ({stats.lowStock})</TabsTrigger>
          <TabsTrigger value="out-of-stock" className="text-destructive">Out of Stock ({stats.outOfStock})</TabsTrigger>
          <TabsTrigger value="expiring" className="text-amber-600">Expiring ({stats.expiringSoon})</TabsTrigger>
          <TabsTrigger value="expired" className="text-red-600">Expired ({stats.expired})</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab === "batches" ? "batches" : activeTab}>
          {activeTab === "batches" ? (
            <BatchManagementTab tenantId={tenantId} items={items} />
          ) : (
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !filteredItems?.length ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No items found</h3>
                  <p className="text-muted-foreground">
                    {activeTab === "all" ? "Add your first medicine to get started" : "No items match the current filter"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredItems.map((item) => {
                    const isLowStock = item.min_stock_level && item.stock_quantity <= item.min_stock_level;
                    const isOutOfStock = item.stock_quantity === 0;
                    return (
                      <Card key={item.id} className="p-4 hover:border-primary/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate flex items-center gap-1">
                              <Pill className="h-3.5 w-3.5 text-primary shrink-0" />
                              {item.name}
                            </p>
                            {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                            {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                          </div>
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="ml-2 shrink-0">Out</Badge>
                          ) : isLowStock ? (
                            <Badge variant="secondary" className="ml-2 shrink-0 bg-yellow-100 text-yellow-800">Low</Badge>
                          ) : (
                            <Badge variant="default" className="ml-2 shrink-0">OK</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{item.category || "-"}</p>
                          <div className="flex justify-between">
                            <span>Stock: {item.stock_quantity} {item.unit_of_measure || ""}</span>
                            <span>{item.cost_price ? formatCurrency(item.cost_price) : "-"}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.expiry_date && (
                              <span className="text-xs">
                                Exp: {new Date(item.expiry_date).toLocaleDateString()}
                              </span>
                            )}
                            {renderExpiryBadge(item.expiry_date)}
                          </div>
                        </div>
                        <div className="flex justify-end gap-1 mt-3">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/business/inventory/${item.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setViewItem(item)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(item.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewItem?.name}</DialogTitle>
            <DialogDescription>Medicine details</DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Brand:</strong> {viewItem.brand || "-"}</div>
                <div><strong>SKU:</strong> {viewItem.sku || "-"}</div>
                <div><strong>Barcode:</strong> {viewItem.barcode || "-"}</div>
                <div><strong>Category:</strong> {viewItem.category || "-"}</div>
                <div><strong>Unit:</strong> {viewItem.unit_of_measure || "-"}</div>
                <div><strong>Supplier:</strong> {viewItem.supplier || "-"}</div>
                <div><strong>Stock Level:</strong> {viewItem.stock_quantity}</div>
                <div><strong>Min Stock Level:</strong> {viewItem.min_stock_level || "-"}</div>
                <div><strong>Cost Price:</strong> {viewItem.cost_price ? formatCurrency(viewItem.cost_price) : "-"}</div>
                <div><strong>Selling Price:</strong> {viewItem.unit_price ? formatCurrency(viewItem.unit_price) : "-"}</div>
                <div><strong>Expiry:</strong> {viewItem.expiry_date ? new Date(viewItem.expiry_date).toLocaleDateString() : "N/A"}</div>
                <div>{renderExpiryBadge(viewItem.expiry_date)}</div>
              </div>
              {viewItem.description && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <strong>Notes:</strong> {viewItem.description}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const BatchManagementTab = ({ tenantId, items }: { tenantId: string; items: InventoryItem[] }) => {
  const [batchSearch, setBatchSearch] = useState("");

  const groupedByName = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    for (const item of items) {
      if (!groups[item.name]) groups[item.name] = [];
      groups[item.name].push(item);
    }
    return groups;
  }, [items]);

  const filteredGroups = Object.entries(groupedByName).filter(([name]) =>
    name.toLowerCase().includes(batchSearch.toLowerCase())
  );

  if (filteredGroups.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{batchSearch ? "No matching products" : "No products found"}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by product name..." value={batchSearch} onChange={(e) => setBatchSearch(e.target.value)} className="pl-9" />
      </div>
      {filteredGroups.map(([name, batches]) => {
        const totalStock = batches.reduce((s, b) => s + (b.stock_quantity || 0), 0);
        const hasExpired = batches.some(b => b.expiry_date && new Date(b.expiry_date) < new Date());
        return (
          <Card key={name} className={hasExpired ? "border-destructive/50" : ""}>
            <CardHeader className="pb-2 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">{name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{batches.length} batch(es) · Total: {totalStock}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Batch #</TableHead>
                    <TableHead className="text-xs">Expiry</TableHead>
                    <TableHead className="text-xs text-right">Stock</TableHead>
                    <TableHead className="text-xs text-right">Cost</TableHead>
                    <TableHead className="text-xs text-right">Price</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => {
                    const isExpired = batch.expiry_date && new Date(batch.expiry_date) < new Date();
                    const expiring = batch.expiry_date && !isExpired &&
                      Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 30;
                    return (
                      <TableRow key={batch.id} className={isExpired ? "text-destructive/70" : ""}>
                        <TableCell className="font-mono text-xs">{batch.batch_no || batch.sku || "-"}</TableCell>
                        <TableCell className="text-xs">
                          {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right">{batch.stock_quantity}</TableCell>
                        <TableCell className="text-xs text-right">{batch.cost_price ? batch.cost_price.toLocaleString() : "-"}</TableCell>
                        <TableCell className="text-xs text-right">{batch.unit_price.toLocaleString()}</TableCell>
                        <TableCell>
                          {isExpired ? (
                            <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                          ) : expiring ? (
                            <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-800">Expiring</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
