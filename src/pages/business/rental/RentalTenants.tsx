import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Phone, Mail, Edit, Trash2, Search, Key, Copy, Eye, EyeOff } from "lucide-react";

export default function RentalTenants() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    id_number: '',
    id_type: 'national_id',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    occupation: '',
    employer: '',
    monthly_income: '',
    previous_address: '',
    status: 'active',
    notes: '',
    access_pin: '',
  });

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData(prev => ({ ...prev, access_pin: pin }));
  };

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    toast({ title: "PIN copied to clipboard" });
  };

  const { data: rentalTenants = [], isLoading } = useQuery({
    queryKey: ['rental-tenants', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_tenants')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('full_name');
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { access_pin, ...rest } = data;
      const { error } = await supabase.from('rental_tenants').insert({
        ...rest,
        tenant_id: tenantId,
        monthly_income: data.monthly_income ? parseFloat(data.monthly_income) : null,
        access_pin: access_pin || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-tenants'] });
      setOpen(false);
      resetForm();
      toast({ title: "Tenant added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, access_pin, ...updateData } = data;
      const { error } = await supabase.from('rental_tenants')
        .update({
          ...updateData,
          monthly_income: updateData.monthly_income ? parseFloat(updateData.monthly_income) : null,
          access_pin: access_pin || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-tenants'] });
      setOpen(false);
      setEditingTenant(null);
      resetForm();
      toast({ title: "Tenant updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      id_number: '',
      id_type: 'national_id',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      occupation: '',
      employer: '',
      monthly_income: '',
      previous_address: '',
      status: 'active',
      notes: '',
      access_pin: '',
    });
    setShowPin(false);
  };

  const handleEdit = (tenant: any) => {
    setEditingTenant(tenant);
    setFormData({
      full_name: tenant.full_name,
      email: tenant.email || '',
      phone: tenant.phone || '',
      id_number: tenant.id_number || '',
      id_type: tenant.id_type || 'national_id',
      emergency_contact_name: tenant.emergency_contact_name || '',
      emergency_contact_phone: tenant.emergency_contact_phone || '',
      occupation: tenant.occupation || '',
      employer: tenant.employer || '',
      monthly_income: tenant.monthly_income?.toString() || '',
      previous_address: tenant.previous_address || '',
      status: tenant.status,
      notes: tenant.notes || '',
      access_pin: tenant.access_pin || '',
    });
    setShowPin(false);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenant) {
      updateMutation.mutate({ ...formData, id: editingTenant.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'blacklisted':
        return <Badge variant="destructive">Blacklisted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredTenants = rentalTenants.filter(t => 
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.phone?.includes(searchQuery) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTenants = filteredTenants.filter(t => t.status === 'active');
  const inactiveTenants = filteredTenants.filter(t => t.status !== 'active');

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">Manage your rental tenants</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingTenant(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="contact">Emergency</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="access">Portal Access</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Full Name</Label>
                      <Input
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>ID Type</Label>
                      <Select value={formData.id_type} onValueChange={v => setFormData({ ...formData, id_type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="national_id">National ID</SelectItem>
                          <SelectItem value="passport">Passport</SelectItem>
                          <SelectItem value="drivers_license">Driver's License</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>ID Number</Label>
                      <Input
                        value={formData.id_number}
                        onChange={e => setFormData({ ...formData, id_number: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="blacklisted">Blacklisted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Emergency Contact Name</Label>
                      <Input
                        value={formData.emergency_contact_name}
                        onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Emergency Contact Phone</Label>
                      <Input
                        value={formData.emergency_contact_phone}
                        onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Previous Address</Label>
                      <Textarea
                        value={formData.previous_address}
                        onChange={e => setFormData({ ...formData, previous_address: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="employment" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Occupation</Label>
                      <Input
                        value={formData.occupation}
                        onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Employer</Label>
                      <Input
                        value={formData.employer}
                        onChange={e => setFormData({ ...formData, employer: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Monthly Income (UGX)</Label>
                      <Input
                        type="number"
                        value={formData.monthly_income}
                        onChange={e => setFormData({ ...formData, monthly_income: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="access" className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Key className="h-4 w-4" />
                      <span>Portal Access PIN for KaRental Ko</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This 4-digit PIN allows the tenant to access their portal using the unit number, business code, and this PIN.
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showPin ? "text" : "password"}
                          value={formData.access_pin}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setFormData({ ...formData, access_pin: val });
                          }}
                          placeholder="4-digit PIN"
                          maxLength={4}
                          className="font-mono text-lg tracking-widest"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowPin(!showPin)}
                        >
                          {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button type="button" variant="outline" onClick={generatePin}>
                        Generate
                      </Button>
                      {formData.access_pin && (
                        <Button type="button" variant="outline" size="icon" onClick={() => copyPin(formData.access_pin)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {formData.access_pin && formData.access_pin.length === 4 && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">
                        <p className="font-medium text-emerald-600">PIN is set</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Share this with the tenant so they can access their portal.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTenant ? 'Update' : 'Add'} Tenant
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active ({activeTenants.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({inactiveTenants.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTenants.map(tenant => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.full_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {tenant.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" /> {tenant.phone}
                            </div>
                          )}
                          {tenant.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" /> {tenant.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.id_number && (
                          <div className="text-sm">
                            <span className="text-muted-foreground capitalize">{tenant.id_type?.replace('_', ' ')}: </span>
                            {tenant.id_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.occupation && (
                          <div className="text-sm">
                            {tenant.occupation}
                            {tenant.employer && <span className="text-muted-foreground"> at {tenant.employer}</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(tenant)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {activeTenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No active tenants found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveTenants.map(tenant => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.full_name}</TableCell>
                      <TableCell>
                        {tenant.phone && <span className="text-sm">{tenant.phone}</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tenant)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {inactiveTenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No inactive tenants
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}