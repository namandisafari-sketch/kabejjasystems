import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, DoorOpen, Bed, Bath, Square, Edit, Trash2, Building2, Store } from "lucide-react";

export default function RentalUnits() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [formData, setFormData] = useState({
    property_id: '',
    unit_number: '',
    unit_type: 'residential',
    floor_number: 1,
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: '',
    monthly_rent: '',
    deposit_amount: '',
    status: 'available',
  });

  const isResidential = formData.unit_type === 'residential';

  const { data: properties = [] } = useQuery({
    queryKey: ['rental-properties', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_properties')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
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
        maxUnits: (data?.rental_packages as any)?.max_units || 10,
      };
    }
  });

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['rental-units', tenantId, filterProperty],
    enabled: !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from('rental_units')
        .select('*, rental_properties(name)')
        .eq('tenant_id', tenantId!)
        .eq('is_active', true)
        .order('unit_number');
      
      if (filterProperty !== 'all') {
        query = query.eq('property_id', filterProperty);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Get total unit count across all properties
  const { data: totalUnitCount = 0 } = useQuery({
    queryKey: ['total-unit-count', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('rental_units')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId!)
        .eq('is_active', true);
      if (error) throw error;
      return count || 0;
    }
  });

  const maxUnits = packageLimits?.maxUnits || 10;
  const isAtUnitLimit = totalUnitCount >= maxUnits;

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Check limit before creating
      if (isAtUnitLimit) {
        throw new Error(`Unit limit reached (${maxUnits}). Please upgrade your package.`);
      }
      const { error } = await supabase.from('rental_units').insert({
        ...data,
        tenant_id: tenantId,
        size_sqm: data.size_sqm ? parseFloat(data.size_sqm) : null,
        monthly_rent: parseFloat(data.monthly_rent) || 0,
        deposit_amount: parseFloat(data.deposit_amount) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-units'] });
      queryClient.invalidateQueries({ queryKey: ['unit-counts'] });
      queryClient.invalidateQueries({ queryKey: ['total-unit-count'] });
      setOpen(false);
      resetForm();
      toast({ title: "Unit added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase.from('rental_units')
        .update({
          ...updateData,
          size_sqm: updateData.size_sqm ? parseFloat(updateData.size_sqm) : null,
          monthly_rent: parseFloat(updateData.monthly_rent) || 0,
          deposit_amount: parseFloat(updateData.deposit_amount) || 0,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-units'] });
      setOpen(false);
      setEditingUnit(null);
      resetForm();
      toast({ title: "Unit updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rental_units')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-units'] });
      queryClient.invalidateQueries({ queryKey: ['unit-counts'] });
      toast({ title: "Unit archived" });
    }
  });

  const resetForm = () => {
    setFormData({
      property_id: properties[0]?.id || '',
      unit_number: '',
      unit_type: 'residential',
      floor_number: 1,
      bedrooms: 1,
      bathrooms: 1,
      size_sqm: '',
      monthly_rent: '',
      deposit_amount: '',
      status: 'available',
    });
  };

  const handleEdit = (unit: any) => {
    setEditingUnit(unit);
    setFormData({
      property_id: unit.property_id,
      unit_number: unit.unit_number,
      unit_type: unit.unit_type || 'residential',
      floor_number: unit.floor_number || 1,
      bedrooms: unit.bedrooms || 1,
      bathrooms: unit.bathrooms || 1,
      size_sqm: unit.size_sqm?.toString() || '',
      monthly_rent: unit.monthly_rent?.toString() || '',
      deposit_amount: unit.deposit_amount?.toString() || '',
      status: unit.status,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUnit) {
      updateMutation.mutate({ ...formData, id: editingUnit.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-emerald-500">Available</Badge>;
      case 'occupied':
        return <Badge className="bg-blue-500">Occupied</Badge>;
      case 'maintenance':
        return <Badge variant="destructive">Maintenance</Badge>;
      case 'reserved':
        return <Badge className="bg-amber-500">Reserved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units</h1>
          <p className="text-muted-foreground">
            Manage rental units across your properties ({totalUnitCount}/{maxUnits})
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingUnit(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button disabled={isAtUnitLimit && !editingUnit}>
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Property</Label>
                    <Select 
                      value={formData.property_id} 
                      onValueChange={v => setFormData({ ...formData, property_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unit Type</Label>
                    <Select 
                      value={formData.unit_type} 
                      onValueChange={v => setFormData({ ...formData, unit_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="retail">Retail/Shop</SelectItem>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                        <SelectItem value="storage">Storage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unit Number</Label>
                    <Input
                      value={formData.unit_number}
                      onChange={e => setFormData({ ...formData, unit_number: e.target.value })}
                      placeholder="e.g., A101"
                      required
                    />
                  </div>
                  <div>
                    <Label>Floor</Label>
                    <Input
                      type="number"
                      value={formData.floor_number}
                      onChange={e => setFormData({ ...formData, floor_number: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  {isResidential && (
                    <>
                      <div>
                        <Label>Bedrooms</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.bedrooms}
                          onChange={e => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label>Bathrooms</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.bathrooms}
                          onChange={e => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <Label>Size (sqm)</Label>
                    <Input
                      type="number"
                      value={formData.size_sqm}
                      onChange={e => setFormData({ ...formData, size_sqm: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Monthly Rent (UGX)</Label>
                    <Input
                      type="number"
                      value={formData.monthly_rent}
                      onChange={e => setFormData({ ...formData, monthly_rent: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Deposit Amount (UGX)</Label>
                    <Input
                      type="number"
                      value={formData.deposit_amount}
                      onChange={e => setFormData({ ...formData, deposit_amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingUnit ? 'Update' : 'Add'} Unit
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Monthly Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map(unit => {
                const unitType = unit.unit_type || 'residential';
                const isUnitResidential = unitType === 'residential';
                const typeLabels: Record<string, string> = {
                  residential: 'Residential',
                  commercial: 'Commercial',
                  retail: 'Retail/Shop',
                  office: 'Office',
                  warehouse: 'Warehouse',
                  storage: 'Storage',
                };
                return (
                <TableRow key={unit.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isUnitResidential ? (
                        <DoorOpen className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Store className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{unit.unit_number}</span>
                    </div>
                    {unit.floor_number && (
                      <span className="text-xs text-muted-foreground">Floor {unit.floor_number}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[unitType] || unitType}
                    </Badge>
                  </TableCell>
                  <TableCell>{(unit.rental_properties as any)?.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-sm">
                      {isUnitResidential ? (
                        <>
                          <span className="flex items-center gap-1">
                            <Bed className="h-3 w-3" /> {unit.bedrooms}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="h-3 w-3" /> {unit.bathrooms}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {unit.size_sqm && (
                        <span className="flex items-center gap-1">
                          <Square className="h-3 w-3" /> {unit.size_sqm}m²
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    UGX {Number(unit.monthly_rent).toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(unit.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(unit)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(unit.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
              })}
              {units.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No units found. Add your first unit to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}