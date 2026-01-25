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
import { Plus, Truck, Search, Edit, Trash2, Phone, Mail } from "lucide-react";
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

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(200),
  contact_person: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  is_active: z.boolean().default(true),
});

const Suppliers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "", contact_person: "", phone: "", email: "", address: "", notes: "", is_active: true,
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      return data;
    },
  });

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from('suppliers').select('*').eq('tenant_id', profile.tenant_id).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const filteredSuppliers = suppliers?.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveSupplierMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const validated = supplierSchema.parse({ ...data, email: data.email || undefined });
      if (editingSupplier) {
        const { error } = await supabase.from('suppliers').update({
          name: validated.name, contact_person: validated.contact_person || null,
          phone: validated.phone || null, email: validated.email || null,
          address: validated.address || null, notes: validated.notes || null, is_active: validated.is_active,
        }).eq('id', editingSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers').insert([{
          name: validated.name, contact_person: validated.contact_person || null,
          phone: validated.phone || null, email: validated.email || null,
          address: validated.address || null, notes: validated.notes || null,
          is_active: validated.is_active, tenant_id: profile!.tenant_id!, created_by: user.id,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsDrawerOpen(false);
      setEditingSupplier(null);
      resetForm();
      toast({ title: editingSupplier ? "Supplier Updated" : "Supplier Created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: "Supplier Deleted" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", contact_person: "", phone: "", email: "", address: "", notes: "", is_active: true });
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name, contact_person: supplier.contact_person || "", phone: supplier.phone || "",
      email: supplier.email || "", address: supplier.address || "", notes: supplier.notes || "", is_active: supplier.is_active ?? true,
    });
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupplierMutation.mutate(formData);
  };

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Suppliers</h1>
            <p className="text-xs text-muted-foreground">{suppliers?.length || 0} suppliers</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setEditingSupplier(null); setIsDrawerOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search suppliers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-2 p-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{suppliers?.length || 0}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-lg font-bold">{suppliers?.filter(s => s.is_active).length || 0}</p>
        </Card>
      </div>

      {/* SUPPLIER LIST */}
      <ScrollArea className="flex-1 px-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !filteredSuppliers?.length ? (
          <div className="text-center py-12">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No suppliers found</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Supplier
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} className="p-3" onClick={() => handleEdit(supplier)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{supplier.name}</p>
                      <Badge variant={supplier.is_active ? "default" : "secondary"} className="text-xs">
                        {supplier.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {supplier.contact_person && (
                      <p className="text-xs text-muted-foreground mt-1">{supplier.contact_person}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {supplier.phone && (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {supplier.phone}</span>
                      )}
                      {supplier.email && (
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {supplier.email}</span>
                      )}
                    </div>
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
            <DrawerTitle>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div>
                <Label>Supplier Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input value={formData.contact_person} onChange={(e) => setFormData(p => ({ ...p, contact_person: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Textarea value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData(p => ({ ...p, is_active: c }))} />
              </div>
            </form>
          </ScrollArea>
          <DrawerFooter className="flex-row gap-2">
            {editingSupplier && (
              <Button variant="destructive" size="sm" onClick={() => { deleteSupplierMutation.mutate(editingSupplier.id); setIsDrawerOpen(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" form="supplier-form" className="flex-1" disabled={saveSupplierMutation.isPending}>
              {saveSupplierMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Suppliers;
