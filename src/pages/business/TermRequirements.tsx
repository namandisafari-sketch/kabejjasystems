import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CheckSquare, GripVertical, Store, ShoppingBag, CalendarDays, Calendar, CalendarCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const frequencyLabels = {
  term: { label: "Every Term", icon: CalendarDays, color: "default" },
  year: { label: "Every Year", icon: Calendar, color: "secondary" },
  one_time: { label: "One Time", icon: CalendarCheck, color: "outline" },
} as const;

interface TermRequirement {
  id: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
  display_order: number;
  is_active: boolean;
  category: "internal" | "external";
  price: number | null;
  frequency: "term" | "year" | "one_time";
}

export default function TermRequirements() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TermRequirement | null>(null);
  const [activeTab, setActiveTab] = useState<"internal" | "external">("internal");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_mandatory: false,
    display_order: 0,
    category: "external" as "internal" | "external",
    price: 0,
    frequency: "term" as "term" | "year" | "one_time",
  });

  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['term-requirements', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('term_requirements')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .order('display_order');
      if (error) throw error;
      return data as TermRequirement[];
    },
  });

  const internalRequirements = requirements.filter(r => r.category === "internal");
  const externalRequirements = requirements.filter(r => r.category === "external");

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('term_requirements').insert({
        tenant_id: tenantData!.tenantId,
        name: data.name,
        description: data.description || null,
        is_mandatory: data.is_mandatory,
        display_order: data.display_order,
        category: data.category,
        price: data.category === "internal" ? data.price : 0,
        frequency: data.frequency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['term-requirements'] });
      toast({ title: "Requirement added successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase.from('term_requirements').update({
        name: data.name,
        description: data.description || null,
        is_mandatory: data.is_mandatory,
        display_order: data.display_order,
        category: data.category,
        price: data.category === "internal" ? data.price : 0,
        frequency: data.frequency,
      }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['term-requirements'] });
      toast({ title: "Requirement updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('term_requirements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['term-requirements'] });
      toast({ title: "Requirement deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      is_mandatory: false,
      display_order: requirements.length,
      category: activeTab,
      price: 0,
      frequency: "term",
    });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: TermRequirement) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      is_mandatory: item.is_mandatory,
      display_order: item.display_order,
      category: item.category,
      price: item.price || 0,
      frequency: item.frequency,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    resetForm();
    setFormData(prev => ({ ...prev, category: activeTab }));
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ ...formData, id: editingItem.id });
    } else {
      createMutation.mutate({ ...formData, display_order: requirements.length });
    }
  };

  const renderRequirementsTable = (items: TermRequirement[], showPrice: boolean) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No requirements configured</h3>
          <p className="text-muted-foreground mb-4">
            Add {showPrice ? "internal" : "external"} requirements for students
          </p>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" /> Add Requirement
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((req) => {
          const FreqIcon = frequencyLabels[req.frequency]?.icon || CalendarDays;
          return (
            <Card key={req.id} className="p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium">{req.name}</p>
                {req.is_mandatory ? (
                  <Badge variant="destructive">Mandatory</Badge>
                ) : (
                  <Badge variant="secondary">Optional</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{req.description || "-"}</p>
              <div className="flex items-center gap-2 mb-2">
                {showPrice && <span className="text-sm font-medium">{(req.price || 0).toLocaleString()} UGX</span>}
                <Badge variant={frequencyLabels[req.frequency]?.color as any || "default"} className="flex items-center gap-1 w-fit">
                  <FreqIcon className="h-3 w-3" />
                  {frequencyLabels[req.frequency]?.label || req.frequency}
                </Badge>
              </div>
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(req)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(req.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Term Requirements</h1>
          <p className="text-muted-foreground">
            Configure items students must bring each term (used during enrollment)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Requirement" : "Add Requirement"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: "internal" | "external") => 
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        <span>Internal (Sold by School)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="external">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        <span>External (Bought Outside)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.category === "internal" 
                    ? "Items sold by the school (uniforms, books, etc.)" 
                    : "Items bought from outside shops"}
                </p>
              </div>
              <div>
                <Label htmlFor="name">Requirement Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Exercise Books (10), School Uniform"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this requirement"
                  rows={2}
                />
              </div>
              {formData.category === "internal" && (
                <div>
                  <Label htmlFor="price">Price (UGX) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter price"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This price will be added to the student's fees
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="frequency">Frequency *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: "term" | "year" | "one_time") => 
                    setFormData({ ...formData, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="term">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        <span>Every Term</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="year">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Every Year</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="one_time">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4" />
                        <span>One Time Only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.frequency === "term" 
                    ? "Required every term (e.g., exercise books)" 
                    : formData.frequency === "year"
                    ? "Required once per year (e.g., school bag)"
                    : "One-time purchase only (e.g., admission items)"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_mandatory">Mandatory</Label>
                  <p className="text-sm text-muted-foreground">
                    Mark if this item is required for all students
                  </p>
                </div>
                <Switch
                  id="is_mandatory"
                  checked={formData.is_mandatory}
                  onCheckedChange={checked => setFormData({ ...formData, is_mandatory: checked })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingItem ? "Update" : "Add"} Requirement
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "internal" | "external")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="internal" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Internal ({internalRequirements.length})
          </TabsTrigger>
          <TabsTrigger value="external" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            External ({externalRequirements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Internal Requirements
              </CardTitle>
              <CardDescription>
                Items sold by the school (uniforms, exercise books, etc.). You set the price for these items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                renderRequirementsTable(internalRequirements, true)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                External Requirements
              </CardTitle>
              <CardDescription>
                Items students buy from outside (stationery, personal items, etc.). No price set by school.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                renderRequirementsTable(externalRequirements, false)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
