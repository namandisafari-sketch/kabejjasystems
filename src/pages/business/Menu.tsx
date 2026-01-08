import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, UtensilsCrossed, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Menu = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  
  const [itemForm, setItemForm] = useState({
    name: "", description: "", unit_price: "", cost_price: "", 
    category_id: "", stock_quantity: "100", sku: "",
  });
  
  const [categoryForm, setCategoryForm] = useState({
    name: "", description: "", display_order: "0",
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase
        .from('profiles')
        .select('tenant_id, id')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['menu-items', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*, menu_categories(name)')
        .eq('tenant_id', profile.tenant_id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: categories } = useQuery({
    queryKey: ['menu-categories', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: typeof itemForm) => {
      if (!profile?.tenant_id) throw new Error("Not authenticated");
      const { error } = await supabase.from('products').insert({
        tenant_id: profile.tenant_id,
        name: data.name,
        description: data.description || null,
        unit_price: parseFloat(data.unit_price) || 0,
        cost_price: data.cost_price ? parseFloat(data.cost_price) : null,
        category_id: data.category_id || null,
        stock_quantity: parseInt(data.stock_quantity) || 100,
        sku: data.sku || null,
        created_by: profile.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast({ title: "Menu item added" });
      resetItemForm();
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof itemForm }) => {
      const { error } = await supabase.from('products').update({
        name: data.name,
        description: data.description || null,
        unit_price: parseFloat(data.unit_price) || 0,
        cost_price: data.cost_price ? parseFloat(data.cost_price) : null,
        category_id: data.category_id || null,
        stock_quantity: parseInt(data.stock_quantity) || 0,
        sku: data.sku || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast({ title: "Menu item updated" });
      resetItemForm();
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast({ title: "Menu item deleted" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof categoryForm) => {
      if (!profile?.tenant_id) throw new Error("Not authenticated");
      const { error } = await supabase.from('menu_categories').insert({
        tenant_id: profile.tenant_id,
        name: data.name,
        description: data.description || null,
        display_order: parseInt(data.display_order) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      toast({ title: "Category added" });
      resetCategoryForm();
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof categoryForm }) => {
      const { error } = await supabase.from('menu_categories').update({
        name: data.name,
        description: data.description || null,
        display_order: parseInt(data.display_order) || 0,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      toast({ title: "Category updated" });
      resetCategoryForm();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      toast({ title: "Category deleted" });
    },
  });

  const resetItemForm = () => {
    setItemForm({ name: "", description: "", unit_price: "", cost_price: "", category_id: "", stock_quantity: "100", sku: "" });
    setEditingItem(null);
    setItemDialogOpen(false);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", description: "", display_order: "0" });
    setEditingCategory(null);
    setCategoryDialogOpen(false);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || "",
      unit_price: item.unit_price.toString(),
      cost_price: item.cost_price?.toString() || "",
      category_id: item.category_id || "",
      stock_quantity: item.stock_quantity?.toString() || "0",
      sku: item.sku || "",
    });
    setItemDialogOpen(true);
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || "",
      display_order: cat.display_order?.toString() || "0",
    });
    setCategoryDialogOpen(true);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-UG', {
    style: 'currency', currency: 'UGX', maximumFractionDigits: 0,
  }).format(amount);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Manage your menu items and categories</p>
        </div>
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items" className="gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Menu Items
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Menu Items</CardTitle>
                <CardDescription>{items?.length || 0} items</CardDescription>
              </div>
              <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetItemForm(); setItemDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit" : "Add"} Menu Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g., Margherita Pizza" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Item description..." rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Price (UGX) *</Label>
                        <Input type="number" value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })} placeholder="25000" />
                      </div>
                      <div className="space-y-2">
                        <Label>Cost Price</Label>
                        <Input type="number" value={itemForm.cost_price} onChange={(e) => setItemForm({ ...itemForm, cost_price: e.target.value })} placeholder="15000" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={itemForm.category_id} onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Stock Quantity</Label>
                        <Input type="number" value={itemForm.stock_quantity} onChange={(e) => setItemForm({ ...itemForm, stock_quantity: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>SKU</Label>
                        <Input value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} placeholder="ITEM-001" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetItemForm}>Cancel</Button>
                    <Button onClick={() => editingItem ? updateItemMutation.mutate({ id: editingItem.id, data: itemForm }) : createItemMutation.mutate(itemForm)}>
                      {editingItem ? "Update" : "Add"} Item
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {itemsLoading ? <p>Loading...</p> : !items?.length ? (
                <div className="text-center py-12">
                  <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No menu items yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{item.menu_categories?.name || '-'}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell>{item.stock_quantity}</TableCell>
                          <TableCell>
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                              {item.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEditItem(item)}><Edit className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteItemMutation.mutate(item.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>{categories?.length || 0} categories</CardDescription>
              </div>
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetCategoryForm(); setCategoryDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? "Edit" : "Add"} Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g., Appetizers, Main Course" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>Display Order</Label>
                      <Input type="number" value={categoryForm.display_order} onChange={(e) => setCategoryForm({ ...categoryForm, display_order: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetCategoryForm}>Cancel</Button>
                    <Button onClick={() => editingCategory ? updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryForm }) : createCategoryMutation.mutate(categoryForm)}>
                      {editingCategory ? "Update" : "Add"} Category
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!categories?.length ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No categories yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell>{cat.display_order}</TableCell>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEditCategory(cat)}><Edit className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCategoryMutation.mutate(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Menu;
