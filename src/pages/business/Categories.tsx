import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Tags, Search, Edit, Trash2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("custom");
  const [formData, setFormData] = useState({ name: "", description: "", is_active: true });

  const { data: profile } = useQuery({
    queryKey: ['user-profile-categories'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase.from('profiles').select('tenant_id, tenants(business_type)').eq('id', user.id).single();
      return data;
    },
  });

  const businessType = (profile?.tenants as any)?.business_type || 'other';

  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ['all-categories', profile?.tenant_id, businessType],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from('product_categories').select('*')
        .or(`is_system.eq.true,tenant_id.eq.${profile.tenant_id}`)
        .order('is_system', { ascending: false }).order('display_order').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const systemCategories = allCategories.filter(cat => cat.is_system && (cat.business_type === businessType || cat.business_type === 'other'));
  const customCategories = allCategories.filter(cat => !cat.is_system);

  const filteredSystem = systemCategories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredCustom = customCategories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const saveCategoryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const validated = categorySchema.parse(data);
      if (editingCategory) {
        const { error } = await supabase.from('product_categories').update({
          name: validated.name, description: validated.description || null, is_active: validated.is_active,
        }).eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const maxOrder = customCategories.reduce((max, cat) => Math.max(max, cat.display_order || 0), 0);
        const { error } = await supabase.from('product_categories').insert([{
          name: validated.name, description: validated.description || null, is_active: validated.is_active,
          tenant_id: profile!.tenant_id!, is_system: false, display_order: maxOrder + 1,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setIsDrawerOpen(false);
      setEditingCategory(null);
      resetForm();
      toast({ title: editingCategory ? "Category Updated" : "Category Created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
      toast({ title: "Category Deleted" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", is_active: true });
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || "", is_active: category.is_active ?? true });
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCategoryMutation.mutate(formData);
  };

  const CategoryCard = ({ category, isSystem }: { category: any; isSystem: boolean }) => (
    <Card className="p-3" onClick={() => !isSystem && handleEdit(category)}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isSystem && <Lock className="h-3 w-3 text-muted-foreground" />}
            <p className="font-medium truncate">{category.name}</p>
            <Badge variant={category.is_active ? "default" : "secondary"} className="text-xs">
              {category.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {category.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{category.description}</p>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Categories</h1>
            <p className="text-xs text-muted-foreground">{allCategories.length} categories</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setEditingCategory(null); setIsDrawerOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* TABS */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom">Custom ({customCategories.length})</TabsTrigger>
            <TabsTrigger value="builtin">Built-in ({systemCategories.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* CATEGORY LIST */}
      <ScrollArea className="flex-1 px-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : activeTab === "custom" ? (
          !filteredCustom.length ? (
            <div className="text-center py-12">
              <Tags className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No custom categories</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsDrawerOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Category
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustom.map((cat) => <CategoryCard key={cat.id} category={cat} isSystem={false} />)}
            </div>
          )
        ) : (
          <div className="space-y-2">
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground mb-2">
              <Lock className="h-3 w-3 inline mr-1" />
              Built-in categories cannot be edited
            </div>
            {filteredSystem.map((cat) => <CategoryCard key={cat.id} category={cat} isSystem={true} />)}
          </div>
        )}
      </ScrollArea>

      {/* ADD/EDIT DRAWER */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{editingCategory ? "Edit Category" : "Add Category"}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            <form id="category-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div>
                <Label>Category Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required />
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
            {editingCategory && (
              <Button variant="destructive" size="sm" onClick={() => { deleteCategoryMutation.mutate(editingCategory.id); setIsDrawerOpen(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" form="category-form" className="flex-1" disabled={saveCategoryMutation.isPending}>
              {saveCategoryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Categories;
