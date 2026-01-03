import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Cog, Package, AlertTriangle, Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SpareParts() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    description: "",
    quantity: 0,
    cost_price: 0,
    selling_price: 0,
    reorder_level: 5,
    supplier: "",
    compatible_devices: "",
  });

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['spare-parts', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const savePartMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const partData = {
        tenant_id: tenantData!.tenantId,
        name: data.name,
        sku: data.sku || null,
        barcode: data.barcode || null,
        category: data.category || null,
        description: data.description || null,
        quantity: data.quantity,
        cost_price: data.cost_price,
        selling_price: data.selling_price,
        reorder_level: data.reorder_level,
        supplier: data.supplier || null,
        compatible_devices: data.compatible_devices ? data.compatible_devices.split(',').map(d => d.trim()) : [],
      } as any;

      if (editingPart) {
        const { error } = await supabase
          .from('spare_parts')
          .update(partData)
          .eq('id', editingPart.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('spare_parts')
          .insert(partData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] });
      toast({ title: editingPart ? "Part updated" : "Part added successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePartMutation = useMutation({
    mutationFn: async (partId: string) => {
      const { error } = await supabase
        .from('spare_parts')
        .update({ is_active: false })
        .eq('id', partId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] });
      toast({ title: "Part deleted" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      barcode: "",
      category: "",
      description: "",
      quantity: 0,
      cost_price: 0,
      selling_price: 0,
      reorder_level: 5,
      supplier: "",
      compatible_devices: "",
    });
    setEditingPart(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (part: any) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      sku: part.sku || "",
      barcode: part.barcode || "",
      category: part.category || "",
      description: part.description || "",
      quantity: part.quantity,
      cost_price: part.cost_price,
      selling_price: part.selling_price,
      reorder_level: part.reorder_level || 5,
      supplier: part.supplier || "",
      compatible_devices: part.compatible_devices?.join(', ') || "",
    });
    setIsDialogOpen(true);
  };

  const filteredParts = parts.filter(part =>
    part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockParts = parts.filter(p => p.quantity <= p.reorder_level);
  const totalValue = parts.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Spare Parts</h1>
          <p className="text-muted-foreground">Manage your spare parts inventory</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPart ? "Edit Part" : "Add New Part"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); savePartMutation.mutate(formData); }} className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Part name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU code"
                  />
                </div>
                <div>
                  <Label>Barcode</Label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Barcode"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Screens, Batteries"
                  />
                </div>
                <div>
                  <Label>Supplier</Label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Part description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
                <div>
                  <Label>Cost Price</Label>
                  <Input
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Selling Price</Label>
                  <Input
                    type="number"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 5 })}
                  min={0}
                />
              </div>

              <div>
                <Label>Compatible Devices (comma-separated)</Label>
                <Input
                  value={formData.compatible_devices}
                  onChange={(e) => setFormData({ ...formData, compatible_devices: e.target.value })}
                  placeholder="e.g., iPhone 14, iPhone 13, Samsung S23"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={savePartMutation.isPending}>
                  {savePartMutation.isPending ? "Saving..." : editingPart ? "Update" : "Add Part"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Parts</p>
                <p className="text-2xl font-bold">{parts.length}</p>
              </div>
              <Cog className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{parts.reduce((sum, p) => sum + p.quantity, 0)}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockParts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Value</p>
                <p className="text-2xl font-bold">{totalValue.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search parts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Parts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU / Barcode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No parts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredParts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{part.name}</p>
                        {part.compatible_devices?.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Compatible: {part.compatible_devices.slice(0, 2).join(', ')}
                            {part.compatible_devices.length > 2 && ` +${part.compatible_devices.length - 2} more`}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {part.sku && <p>SKU: {part.sku}</p>}
                        {part.barcode && <p className="text-muted-foreground">BC: {part.barcode}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{part.category || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={part.quantity <= part.reorder_level ? "destructive" : "secondary"}>
                        {part.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>{part.cost_price.toLocaleString()}</TableCell>
                    <TableCell>{part.selling_price.toLocaleString()}</TableCell>
                    <TableCell>{part.supplier || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(part)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Part?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {part.name} from your inventory.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePartMutation.mutate(part.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
