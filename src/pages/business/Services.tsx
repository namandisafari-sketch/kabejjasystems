import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, Search, Trash2, Clock, User } from "lucide-react";
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

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Service name is required").max(200),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(100).optional(),
  unit_price: z.number().min(0, "Price must be positive"),
  duration_minutes: z.number().int().min(1).optional(),
  assigned_staff_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
  allow_custom_price: z.boolean().default(false),
});

const Services = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", category: "", unit_price: "", duration_minutes: "",
    assigned_staff_id: "", is_active: true, allow_custom_price: false,
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile-tenant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      return data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from('employees').select('id, full_name, role').eq('tenant_id', profile.tenant_id).eq('is_active', true).order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['service-categories', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_categories').select('*').or(`is_system.eq.true,tenant_id.eq.${profile?.tenant_id}`).eq('is_active', true).order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await (supabase.from('products').select('*, employees:assigned_staff_id(full_name)') as any).eq('tenant_id', profile.tenant_id).eq('product_type', 'service').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!profile?.tenant_id,
  });

  const filteredServices = services?.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const saveServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const validated = serviceSchema.parse({
        ...data,
        unit_price: parseFloat(data.unit_price),
        duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : undefined,
        assigned_staff_id: data.assigned_staff_id || null,
      });
      if (editingService) {
        const { error } = await supabase.from('products').update({
          name: validated.name, description: validated.description, category: validated.category,
          unit_price: validated.unit_price, duration_minutes: validated.duration_minutes,
          assigned_staff_id: validated.assigned_staff_id, is_active: validated.is_active, allow_custom_price: validated.allow_custom_price,
        }).eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([{
          name: validated.name, description: validated.description, category: validated.category,
          unit_price: validated.unit_price, duration_minutes: validated.duration_minutes,
          assigned_staff_id: validated.assigned_staff_id, is_active: validated.is_active,
          allow_custom_price: validated.allow_custom_price, product_type: 'service', stock_quantity: 0,
          tenant_id: profile!.tenant_id, created_by: user.id,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsDrawerOpen(false);
      setEditingService(null);
      resetForm();
      toast({ title: editingService ? "Service Updated" : "Service Created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: "Service Deleted" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "", description: "", category: "", unit_price: "", duration_minutes: "",
      assigned_staff_id: "", is_active: true, allow_custom_price: false,
    });
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name, description: service.description || "", category: service.category || "",
      unit_price: service.unit_price.toString(), duration_minutes: service.duration_minutes?.toString() || "",
      assigned_staff_id: service.assigned_staff_id || "", is_active: service.is_active ?? true,
      allow_custom_price: service.allow_custom_price ?? false,
    });
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveServiceMutation.mutate(formData);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Services</h1>
            <p className="text-xs text-muted-foreground">{services?.length || 0} services</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setEditingService(null); setIsDrawerOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search services..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{services?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-lg font-bold">{services?.filter(s => s.is_active).length || 0}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Avg</p>
              <p className="text-sm font-bold">
                {services?.length ? formatDuration(
                  Math.round(services.filter(s => s.duration_minutes).reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 
                  (services.filter(s => s.duration_minutes).length || 1))
                ) : "-"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* SERVICE LIST */}
      <ScrollArea className="flex-1 px-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !filteredServices?.length ? (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No services found</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Service
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredServices.map((service) => (
              <Card key={service.id} className="p-3" onClick={() => handleEdit(service)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{service.name}</p>
                      <Badge variant={service.is_active ? "default" : "secondary"} className="text-xs">
                        {service.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {service.category && <span>{service.category}</span>}
                      {service.duration_minutes && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(service.duration_minutes)}</span>
                      )}
                      {service.employees?.full_name && (
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {service.employees.full_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-semibold text-primary">{(service.unit_price / 1000).toFixed(0)}K</p>
                    {service.allow_custom_price && <Badge variant="outline" className="text-xs">Custom</Badge>}
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
            <DrawerTitle>{editingService ? "Edit Service" : "Add Service"}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            <form id="service-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div>
                <Label>Service Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (UGX) *</Label>
                  <Input type="number" value={formData.unit_price} onChange={(e) => setFormData(p => ({ ...p, unit_price: e.target.value }))} required />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData(p => ({ ...p, duration_minutes: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <Label>Staff</Label>
                  <Select value={formData.assigned_staff_id || "none"} onValueChange={(v) => setFormData(p => ({ ...p, assigned_staff_id: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any Staff</SelectItem>
                      {employees.map((emp) => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData(p => ({ ...p, is_active: c }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Custom Price</Label>
                  <p className="text-xs text-muted-foreground">Enable price entry at POS</p>
                </div>
                <Switch checked={formData.allow_custom_price} onCheckedChange={(c) => setFormData(p => ({ ...p, allow_custom_price: c }))} />
              </div>
            </form>
          </ScrollArea>
          <DrawerFooter className="flex-row gap-2">
            {editingService && (
              <Button variant="destructive" size="sm" onClick={() => { deleteServiceMutation.mutate(editingService.id); setIsDrawerOpen(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" form="service-form" className="flex-1" disabled={saveServiceMutation.isPending}>
              {saveServiceMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Services;
