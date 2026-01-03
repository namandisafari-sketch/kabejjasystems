import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Tags, Search, Edit, Trash2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100),
  description: z.string().trim().max(500).optional(),
  is_active: z.boolean().default(true),
});

const Categories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile-categories'],
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

  // Fetch all categories (system + custom)
  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ['all-categories', profile?.tenant_id, businessType],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .or(`is_system.eq.true,tenant_id.eq.${profile.tenant_id}`)
        .order('is_system', { ascending: false })
        .order('display_order')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Filter categories
  const systemCategories = allCategories.filter(cat => 
    cat.is_system && (cat.business_type === businessType || cat.business_type === 'other')
  );
  const customCategories = allCategories.filter(cat => !cat.is_system);

  const filteredSystemCategories = systemCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomCategories = customCategories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveCategoryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const validated = categorySchema.parse(data);

      if (editingCategory) {
        const { error } = await supabase
          .from('product_categories')
          .update({
            name: validated.name,
            description: validated.description || null,
            is_active: validated.is_active,
          })
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        // Get max display order
        const maxOrder = customCategories.reduce((max, cat) => 
          Math.max(max, cat.display_order || 0), 0
        );

        const { error } = await supabase
          .from('product_categories')
          .insert([{
            name: validated.name,
            description: validated.description || null,
            is_active: validated.is_active,
            tenant_id: profile!.tenant_id!,
            is_system: false,
            display_order: maxOrder + 1,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      toast({
        title: editingCategory ? "Category Updated" : "Category Created",
        description: "Category has been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({
        title: "Category Deleted",
        description: "Category has been removed",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      is_active: true,
    });
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      is_active: category.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCategoryMutation.mutate(formData);
  };

  const CategoryTable = ({ categories, isSystem }: { categories: any[]; isSystem: boolean }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            {!isSystem && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isSystem ? 3 : 4} className="text-center py-8 text-muted-foreground">
                No categories found
              </TableCell>
            </TableRow>
          ) : (
            categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isSystem && <Lock className="h-3 w-3 text-muted-foreground" />}
                    {category.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {category.description || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                {!isSystem && (
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this category?')) {
                          deleteCategoryMutation.mutate(category.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Product Categories</h1>
          <p className="text-muted-foreground">Manage categories for organizing your products</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
              <DialogDescription>
                Create a custom category for your products
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Organic Products"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this category..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active Status</Label>
                  <p className="text-xs text-muted-foreground">Category will be available for products</p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingCategory(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveCategoryMutation.isPending}>
                  {saveCategoryMutation.isPending ? "Saving..." : "Save Category"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>
                {systemCategories.length} built-in, {customCategories.length} custom categories
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading categories...</p>
          ) : (
            <Tabs defaultValue="custom" className="space-y-4">
              <TabsList>
                <TabsTrigger value="custom">
                  Custom Categories ({filteredCustomCategories.length})
                </TabsTrigger>
                <TabsTrigger value="builtin">
                  Built-in Categories ({filteredSystemCategories.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="custom">
                {customCategories.length === 0 && !searchTerm ? (
                  <div className="text-center py-12">
                    <Tags className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No custom categories yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your first custom category to organize products your way
                    </p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setIsDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </div>
                ) : (
                  <CategoryTable categories={filteredCustomCategories} isSystem={false} />
                )}
              </TabsContent>

              <TabsContent value="builtin">
                <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 inline mr-2" />
                  Built-in categories are pre-configured for your business type ({businessType}) and cannot be edited.
                </div>
                <CategoryTable categories={filteredSystemCategories} isSystem={true} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Categories;
