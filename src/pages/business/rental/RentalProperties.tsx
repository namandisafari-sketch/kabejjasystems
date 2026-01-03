import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, MapPin, Home, Edit, Trash2 } from "lucide-react";

export default function RentalProperties() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    property_type: 'apartment',
    total_units: 1,
    description: '',
    year_built: new Date().getFullYear(),
  });

  // Fetch rental package limits
  const { data: packageLimits } = useQuery({
    queryKey: ['rental-package-limits', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('rental_package_id, rental_packages(max_properties, max_units)')
        .eq('id', tenantId!)
        .single();
      if (error) throw error;
      return {
        maxProperties: (data?.rental_packages as any)?.max_properties || 3,
        maxUnits: (data?.rental_packages as any)?.max_units || 10,
      };
    }
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['rental-properties', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_properties')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: unitCounts = {} } = useQuery({
    queryKey: ['unit-counts', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_units')
        .select('property_id, status')
        .eq('tenant_id', tenantId!);
      if (error) throw error;
      
      const counts: Record<string, { total: number; occupied: number; available: number }> = {};
      data.forEach(unit => {
        if (!counts[unit.property_id]) {
          counts[unit.property_id] = { total: 0, occupied: 0, available: 0 };
        }
        counts[unit.property_id].total++;
        if (unit.status === 'occupied') counts[unit.property_id].occupied++;
        if (unit.status === 'available') counts[unit.property_id].available++;
      });
      return counts;
    }
  });

  const activeProperties = properties.filter(p => p.is_active);
  const propertyCount = activeProperties.length;
  const maxProperties = packageLimits?.maxProperties || 3;
  const isAtPropertyLimit = propertyCount >= maxProperties;

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Check limit before creating
      if (isAtPropertyLimit) {
        throw new Error(`Property limit reached (${maxProperties}). Please upgrade your package.`);
      }
      const { error } = await supabase.from('rental_properties').insert({
        ...data,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-properties'] });
      setOpen(false);
      resetForm();
      toast({ title: "Property added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase.from('rental_properties')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-properties'] });
      setOpen(false);
      setEditingProperty(null);
      resetForm();
      toast({ title: "Property updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rental_properties')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-properties'] });
      toast({ title: "Property archived" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      property_type: 'apartment',
      total_units: 1,
      description: '',
      year_built: new Date().getFullYear(),
    });
  };

  const handleEdit = (property: any) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      city: property.city || '',
      property_type: property.property_type,
      total_units: property.total_units,
      description: property.description || '',
      year_built: property.year_built || new Date().getFullYear(),
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProperty) {
      updateMutation.mutate({ ...formData, id: editingProperty.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      apartment: 'Apartment Building',
      house: 'House',
      commercial: 'Commercial',
      mixed: 'Mixed Use',
      townhouse: 'Townhouse',
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Manage your rental properties ({propertyCount}/{maxProperties})
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingProperty(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button disabled={isAtPropertyLimit && !editingProperty}>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Property Name</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Sunshine Apartments"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full address"
                    required
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label>Property Type</Label>
                  <Select value={formData.property_type} onValueChange={v => setFormData({ ...formData, property_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment Building</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="mixed">Mixed Use</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Total Units</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.total_units}
                    onChange={e => setFormData({ ...formData, total_units: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Year Built</Label>
                  <Input
                    type="number"
                    value={formData.year_built}
                    onChange={e => setFormData({ ...formData, year_built: parseInt(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Property description and amenities"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProperty ? 'Update' : 'Add'} Property
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Property Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeProperties.map(property => {
          const counts = unitCounts[property.id] || { total: 0, occupied: 0, available: 0 };
          return (
            <Card key={property.id} className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent" />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{property.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(property)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(property.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {property.address}
                  {property.city && `, ${property.city}`}
                </div>
                <Badge variant="secondary">{getPropertyTypeLabel(property.property_type)}</Badge>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{counts.total}</p>
                    <p className="text-xs text-muted-foreground">Units</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{counts.available}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{counts.occupied}</p>
                    <p className="text-xs text-muted-foreground">Occupied</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeProperties.length === 0 && !isLoading && (
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No properties yet</h3>
          <p className="text-muted-foreground mb-4">Add your first property to start managing rentals</p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </Card>
      )}
    </div>
  );
}