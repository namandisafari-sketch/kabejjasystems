import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, Search, Edit, Trash2, Clock, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Service name is required").max(200),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(100).optional(),
  unit_price: z.number().min(0, "Price must be positive"),
  duration_minutes: z.number().int().min(1, "Duration must be at least 1 minute").optional(),
  assigned_staff_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
  allow_custom_price: z.boolean().default(false),
});

const Services = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    unit_price: "",
    duration_minutes: "",
    assigned_staff_id: "",
    is_active: true,
    allow_custom_price: false,
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile-tenant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  // Fetch employees for staff assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, role')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['service-categories', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .or(`is_system.eq.true,tenant_id.eq.${profile?.tenant_id}`)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch services (products where product_type = 'service')
  const { data: services, isLoading } = useQuery({
    queryKey: ['services', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await (supabase
        .from('products')
        .select('*, employees:assigned_staff_id(full_name)') as any)
        .eq('tenant_id', profile.tenant_id)
        .eq('product_type', 'service')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!profile?.tenant_id,
  });

  const filteredServices = services?.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        const { error } = await supabase
          .from('products')
          .update({
            name: validated.name,
            description: validated.description,
            category: validated.category,
            unit_price: validated.unit_price,
            duration_minutes: validated.duration_minutes,
            assigned_staff_id: validated.assigned_staff_id,
            is_active: validated.is_active,
            allow_custom_price: validated.allow_custom_price,
          })
          .eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([{
            name: validated.name,
            description: validated.description,
            category: validated.category,
            unit_price: validated.unit_price,
            duration_minutes: validated.duration_minutes,
            assigned_staff_id: validated.assigned_staff_id,
            is_active: validated.is_active,
            allow_custom_price: validated.allow_custom_price,
            product_type: 'service',
            stock_quantity: 0, // Services don't have stock
            tenant_id: profile!.tenant_id,
            created_by: user.id,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsDialogOpen(false);
      setEditingService(null);
      resetForm();
      toast({
        title: editingService ? "Service Updated" : "Service Created",
        description: "Service has been saved successfully",
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

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Service Deleted",
        description: "Service has been removed",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      unit_price: "",
      duration_minutes: "",
      assigned_staff_id: "",
      is_active: true,
      allow_custom_price: false,
    });
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: service.category || "",
      unit_price: service.unit_price.toString(),
      duration_minutes: service.duration_minutes?.toString() || "",
      assigned_staff_id: service.assigned_staff_id || "",
      is_active: service.is_active ?? true,
      allow_custom_price: service.allow_custom_price ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveServiceMutation.mutate(formData);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground">Manage services you offer to customers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingService(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
              <DialogDescription>
                Services are sellable items without stock tracking
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Haircut, Oil Change, Consultation"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Service description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unit_price">Price (UGX) *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    placeholder="e.g., 30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assigned_staff_id">Assigned Staff</Label>
                  <Select
                    value={formData.assigned_staff_id || "none"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_staff_id: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any Staff</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name} - {emp.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow_custom_price">Allow Custom Price</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable price entry at POS for variable-priced services
                  </p>
                </div>
                <Switch
                  id="allow_custom_price"
                  checked={formData.allow_custom_price}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_custom_price: checked }))}
                />
              </div>

              <Button type="submit" className="w-full" disabled={saveServiceMutation.isPending}>
                {saveServiceMutation.isPending ? "Saving..." : (editingService ? "Update Service" : "Create Service")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{services?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Services</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{services?.filter(s => s.is_active).length || 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {services?.length ? formatDuration(
                  Math.round(services.filter(s => s.duration_minutes).reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 
                  (services.filter(s => s.duration_minutes).length || 1))
                ) : "-"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-sm"
        />
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
          <CardDescription>Manage your service offerings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : !filteredServices?.length ? (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No services found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">{service.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{service.category || "-"}</TableCell>
                    <TableCell className="font-medium">UGX {Number(service.unit_price).toLocaleString()}</TableCell>
                    <TableCell>
                      {service.duration_minutes ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(service.duration_minutes)}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {(service.employees as any)?.full_name ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {(service.employees as any).full_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Any</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? "default" : "secondary"}>
                        {service.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(service)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => deleteServiceMutation.mutate(service.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Services;
