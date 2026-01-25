import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, Search, Edit, Trash2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { z } from "zod";

const UNITS_OF_MEASURE = [
  { value: "piece", label: "Piece" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "liter", label: "Liter (L)" },
  { value: "ml", label: "Milliliter (ml)" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
  { value: "dozen", label: "Dozen" },
  { value: "bottle", label: "Bottle" },
  { value: "bag", label: "Bag" },
  { value: "carton", label: "Carton" },
  { value: "meter", label: "Meter (m)" },
];

const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  sku: z.string().trim().max(50).optional(),
  barcode: z.string().trim().max(50).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(100).optional(),
  brand: z.string().trim().max(100).optional(),
  supplier: z.string().trim().max(200).optional(),
  unit_of_measure: z.string().default("piece"),
  unit_price: z.number().min(0, "Price must be positive"),
  cost_price: z.number().min(0, "Cost must be positive").optional(),
  stock_quantity: z.number().int().min(0, "Stock must be non-negative"),
  min_stock_level: z.number().int().min(0, "Minimum stock must be non-negative").optional(),
  expiry_date: z.string().optional(),
  is_active: z.boolean().default(true),
});

const Products = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    category: "",
    brand: "",
    supplier: "",
    unit_of_measure: "piece",
    unit_price: "",
    cost_price: "",
    stock_quantity: "",
    min_stock_level: "",
    expiry_date: "",
    is_active: true,
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile-with-tenant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase
        .from('profiles')
        .select('tenant_id, tenants(business_type)')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  const businessType = (profile?.tenants as any)?.business_type || 'other';

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories', businessType, profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .or(`is_system.eq.true,tenant_id.eq.${profile?.tenant_id}`)
        .or(`business_type.eq.${businessType},business_type.eq.other`)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-list', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const validated = productSchema.parse({
        ...data,
        unit_price: parseFloat(data.unit_price),
        cost_price: data.cost_price ? parseFloat(data.cost_price) : undefined,
        stock_quantity: parseInt(data.stock_quantity),
        min_stock_level: data.min_stock_level ? parseInt(data.min_stock_level) : undefined,
        expiry_date: data.expiry_date || undefined,
      });
      if (editingProduct) {
        const { error } = await supabase.from('products').update(validated).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const insertData = {
          name: validated.name,
          sku: validated.sku,
          barcode: validated.barcode,
          description: validated.description,
          category: validated.category,
          brand: validated.brand,
          supplier: validated.supplier,
          unit_of_measure: validated.unit_of_measure,
          unit_price: validated.unit_price,
          cost_price: validated.cost_price,
          stock_quantity: validated.stock_quantity,
          min_stock_level: validated.min_stock_level,
          expiry_date: validated.expiry_date || null,
          is_active: validated.is_active,
          tenant_id: profile!.tenant_id,
          created_by: user.id,
        };
        const { error } = await supabase.from('products').insert([insertData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDrawerOpen(false);
      setEditingProduct(null);
      resetForm();
      toast({ title: editingProduct ? "Product Updated" : "Product Created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: "Product Deleted" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "", sku: "", barcode: "", description: "", category: "", brand: "", supplier: "",
      unit_of_measure: "piece", unit_price: "", cost_price: "", stock_quantity: "", min_stock_level: "", expiry_date: "", is_active: true,
    });
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, sku: product.sku || "", barcode: product.barcode || "", description: product.description || "",
      category: product.category || "", brand: product.brand || "", supplier: product.supplier || "",
      unit_of_measure: product.unit_of_measure || "piece", unit_price: product.unit_price.toString(),
      cost_price: product.cost_price?.toString() || "", stock_quantity: product.stock_quantity.toString(),
      min_stock_level: product.min_stock_level?.toString() || "", expiry_date: product.expiry_date || "", is_active: product.is_active ?? true,
    });
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProductMutation.mutate(formData);
  };

  const totalStock = products?.reduce((sum, p) => sum + (p.stock_quantity || 0), 0) || 0;
  const lowStock = products?.filter(p => p.min_stock_level && p.stock_quantity <= p.min_stock_level).length || 0;

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Products</h1>
            <p className="text-xs text-muted-foreground">{products?.length || 0} items</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setEditingProduct(null); setIsDrawerOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{products?.length || 0}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">In Stock</p>
          <p className="text-lg font-bold">{totalStock.toLocaleString()}</p>
        </Card>
        <Card className="p-3 border-destructive">
          <p className="text-xs text-muted-foreground">Low Stock</p>
          <p className="text-lg font-bold text-destructive">{lowStock}</p>
        </Card>
      </div>

      {/* PRODUCT LIST */}
      <ScrollArea className="flex-1 px-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !filteredProducts?.length ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No products found</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="p-3" onClick={() => handleEdit(product)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-primary">
                        {(product.unit_price / 1000).toFixed(0)}K
                      </span>
                      {product.category && (
                        <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <Badge variant={product.stock_quantity > 0 ? (product.min_stock_level && product.stock_quantity <= product.min_stock_level ? "secondary" : "outline") : "destructive"}>
                      {product.stock_quantity} {product.unit_of_measure}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* ADD/EDIT DRAWER */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{editingProduct ? "Edit Product" : "Add Product"}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            <form id="product-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div>
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (UGX) *</Label>
                  <Input type="number" value={formData.unit_price} onChange={(e) => setFormData(p => ({ ...p, unit_price: e.target.value }))} required />
                </div>
                <div>
                  <Label>Stock *</Label>
                  <Input type="number" value={formData.stock_quantity} onChange={(e) => setFormData(p => ({ ...p, stock_quantity: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cost Price</Label>
                  <Input type="number" value={formData.cost_price} onChange={(e) => setFormData(p => ({ ...p, cost_price: e.target.value }))} />
                </div>
                <div>
                  <Label>Reorder Level</Label>
                  <Input type="number" value={formData.min_stock_level} onChange={(e) => setFormData(p => ({ ...p, min_stock_level: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={formData.unit_of_measure} onValueChange={(v) => setFormData(p => ({ ...p, unit_of_measure: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS_OF_MEASURE.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={formData.sku} onChange={(e) => setFormData(p => ({ ...p, sku: e.target.value }))} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData(p => ({ ...p, is_active: c }))} />
              </div>
            </form>
          </ScrollArea>
          <DrawerFooter className="flex-row gap-2">
            {editingProduct && (
              <Button variant="destructive" size="sm" onClick={() => { deleteProductMutation.mutate(editingProduct.id); setIsDrawerOpen(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" form="product-form" className="flex-1" disabled={saveProductMutation.isPending}>
              {saveProductMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Products;
