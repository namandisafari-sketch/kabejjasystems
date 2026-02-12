import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Building2, Pencil, Plus, Loader2, Users, Store } from "lucide-react";
import { toast } from "sonner";

interface RentalPackage {
  id: string;
  name: string;
  description: string | null;
  max_properties: number;
  max_units: number;
  monthly_price: number;
  included_users: number;
  price_per_additional_user: number;
  features: any;
  is_active: boolean;
  display_order: number;
}

interface BusinessPackage {
  id: string;
  name: string;
  description: string | null;
  max_branches: number;
  max_products: number | null;
  max_users: number;
  monthly_price: number;
  included_users: number;
  price_per_additional_user: number;
  features: any;
  is_active: boolean;
  display_order: number;
}

const AdminPackages = () => {
  const queryClient = useQueryClient();
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [editingRentalPackage, setEditingRentalPackage] = useState<RentalPackage | null>(null);
  const [editingBusinessPackage, setEditingBusinessPackage] = useState<BusinessPackage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRentalDialogOpen, setIsRentalDialogOpen] = useState(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['all-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: rentalPackages, isLoading: isLoadingRental } = useQuery({
    queryKey: ['rental-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_packages')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as RentalPackage[];
    },
  });

  const { data: businessPackages, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ['business-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_packages')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as BusinessPackage[];
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async (pkg: any) => {
      const { error } = await supabase
        .from('packages')
        .update({
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          validity_days: pkg.validity_days,
          user_limit: pkg.user_limit,
          is_active: pkg.is_active,
        })
        .eq('id', pkg.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-packages'] });
      setIsDialogOpen(false);
      setEditingPackage(null);
      toast.success('Package updated successfully');
    },
    onError: () => {
      toast.error('Failed to update package');
    },
  });

  const updateRentalPackageMutation = useMutation({
    mutationFn: async (pkg: RentalPackage) => {
      const { error } = await supabase
        .from('rental_packages')
        .update({
          name: pkg.name,
          description: pkg.description,
          max_properties: pkg.max_properties,
          max_units: pkg.max_units,
          monthly_price: pkg.monthly_price,
          included_users: pkg.included_users,
          price_per_additional_user: pkg.price_per_additional_user,
          is_active: pkg.is_active,
          display_order: pkg.display_order,
        })
        .eq('id', pkg.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-packages'] });
      setIsRentalDialogOpen(false);
      setEditingRentalPackage(null);
      toast.success('Rental package updated successfully');
    },
    onError: () => {
      toast.error('Failed to update rental package');
    },
  });

  const createRentalPackageMutation = useMutation({
    mutationFn: async (pkg: Omit<RentalPackage, 'id'>) => {
      const { error } = await supabase
        .from('rental_packages')
        .insert([pkg]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-packages'] });
      setIsRentalDialogOpen(false);
      setEditingRentalPackage(null);
      toast.success('Rental package created successfully');
    },
    onError: () => {
      toast.error('Failed to create rental package');
    },
  });

  // Business package mutations
  const updateBusinessPackageMutation = useMutation({
    mutationFn: async (pkg: BusinessPackage) => {
      const { error } = await supabase
        .from('business_packages')
        .update({
          name: pkg.name,
          description: pkg.description,
          max_branches: pkg.max_branches,
          max_products: pkg.max_products,
          max_users: pkg.max_users,
          monthly_price: pkg.monthly_price,
          included_users: pkg.included_users,
          price_per_additional_user: pkg.price_per_additional_user,
          is_active: pkg.is_active,
          display_order: pkg.display_order,
        })
        .eq('id', pkg.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-packages'] });
      setIsBusinessDialogOpen(false);
      setEditingBusinessPackage(null);
      toast.success('Business package updated successfully');
    },
    onError: () => {
      toast.error('Failed to update business package');
    },
  });

  const createBusinessPackageMutation = useMutation({
    mutationFn: async (pkg: Omit<BusinessPackage, 'id'>) => {
      const { error } = await supabase
        .from('business_packages')
        .insert([pkg]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-packages'] });
      setIsBusinessDialogOpen(false);
      setEditingBusinessPackage(null);
      toast.success('Business package created successfully');
    },
    onError: () => {
      toast.error('Failed to create business package');
    },
  });

  const handleEditPackage = (pkg: any) => {
    setEditingPackage({ ...pkg });
    setIsDialogOpen(true);
  };

  const handleEditRentalPackage = (pkg: RentalPackage) => {
    setEditingRentalPackage({ ...pkg });
    setIsRentalDialogOpen(true);
  };

  const handleEditBusinessPackage = (pkg: BusinessPackage) => {
    setEditingBusinessPackage({ ...pkg });
    setIsBusinessDialogOpen(true);
  };

  const handleCreateRentalPackage = () => {
    setEditingRentalPackage({
      id: '',
      name: '',
      description: '',
      max_properties: 5,
      max_units: 20,
      monthly_price: 50000,
      included_users: 1,
      price_per_additional_user: 10000,
      features: [],
      is_active: true,
      display_order: (rentalPackages?.length || 0) + 1,
    });
    setIsRentalDialogOpen(true);
  };

  const handleCreateBusinessPackage = () => {
    setEditingBusinessPackage({
      id: '',
      name: '',
      description: '',
      max_branches: 1,
      max_products: 100,
      max_users: 2,
      monthly_price: 30000,
      included_users: 1,
      price_per_additional_user: 10000,
      features: [],
      is_active: true,
      display_order: (businessPackages?.length || 0) + 1,
    });
    setIsBusinessDialogOpen(true);
  };

  const handleSavePackage = () => {
    if (!editingPackage) return;
    updatePackageMutation.mutate(editingPackage);
  };

  const handleSaveRentalPackage = () => {
    if (!editingRentalPackage) return;
    if (editingRentalPackage.id) {
      updateRentalPackageMutation.mutate(editingRentalPackage);
    } else {
      const { id, ...newPackage } = editingRentalPackage;
      createRentalPackageMutation.mutate(newPackage);
    }
  };

  const handleSaveBusinessPackage = () => {
    if (!editingBusinessPackage) return;
    if (editingBusinessPackage.id) {
      updateBusinessPackageMutation.mutate(editingBusinessPackage);
    } else {
      const { id, ...newPackage } = editingBusinessPackage;
      createBusinessPackageMutation.mutate(newPackage);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Packages</h1>
          <p className="text-muted-foreground">Subscription packages and pricing</p>
        </div>
      </div>

      <Tabs defaultValue="school" className="space-y-6">
        <TabsList>
          <TabsTrigger value="school" className="gap-2">
            <Package className="h-4 w-4" />
            School Packages
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Store className="h-4 w-4" />
            Business Packages
          </TabsTrigger>
          <TabsTrigger value="rental" className="gap-2">
            <Building2 className="h-4 w-4" />
            Rental Packages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="school">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading packages...
            </div>
          ) : packages?.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No packages found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages?.map((pkg) => (
                <Card key={pkg.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{pkg.name}</CardTitle>
                        <CardDescription className="mt-2">
                          {pkg.description || 'No description'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {pkg.is_active ? (
                          <Badge className="bg-success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPackage(pkg)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold">
                        {formatCurrency(pkg.price)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        per {pkg.validity_days} days
                      </p>
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">User Limit</span>
                        <span className="font-medium">{pkg.user_limit || 'Unlimited'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Validity</span>
                        <span className="font-medium">{pkg.validity_days} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Business Packages Tab */}
        <TabsContent value="business">
          <div className="flex justify-end mb-4">
            <Button onClick={handleCreateBusinessPackage} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Business Package
            </Button>
          </div>

          {isLoadingBusiness ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading business packages...
            </div>
          ) : businessPackages?.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No business packages found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {businessPackages?.map((pkg) => (
                <Card key={pkg.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{pkg.name}</CardTitle>
                        <CardDescription className="mt-2">
                          {pkg.description || 'No description'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {pkg.is_active ? (
                          <Badge className="bg-success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBusinessPackage(pkg)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold">
                        {formatCurrency(pkg.monthly_price)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        per month
                      </p>
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Branches</span>
                        <span className="font-medium">Up to {pkg.max_branches}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Products</span>
                        <span className="font-medium">{pkg.max_products ? `Up to ${pkg.max_products}` : 'Unlimited'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max Users</span>
                        <span className="font-medium">{pkg.max_users}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Included Users</span>
                        <span className="font-medium">{pkg.included_users}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Extra User</span>
                        <span className="font-medium">{formatCurrency(pkg.price_per_additional_user)}/mo</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rental">
          <div className="flex justify-end mb-4">
            <Button onClick={handleCreateRentalPackage} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Rental Package
            </Button>
          </div>

          {isLoadingRental ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading rental packages...
            </div>
          ) : rentalPackages?.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No rental packages found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {rentalPackages?.map((pkg) => (
                <Card key={pkg.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{pkg.name}</CardTitle>
                        <CardDescription className="mt-2">
                          {pkg.description || 'No description'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {pkg.is_active ? (
                          <Badge className="bg-success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditRentalPackage(pkg)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold">
                        {formatCurrency(pkg.monthly_price)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        per month
                      </p>
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Properties</span>
                        <span className="font-medium">Up to {pkg.max_properties}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Units</span>
                        <span className="font-medium">Up to {pkg.max_units}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Included Users</span>
                        <span className="font-medium">{pkg.included_users}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Extra User</span>
                        <span className="font-medium">{formatCurrency(pkg.price_per_additional_user)}/mo</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit School Package Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
          </DialogHeader>
          {editingPackage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingPackage.name}
                  onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingPackage.description || ''}
                  onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (UGX)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={editingPackage.price}
                    onChange={(e) => setEditingPackage({ ...editingPackage, price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validity">Validity (days)</Label>
                  <Input
                    id="validity"
                    type="number"
                    value={editingPackage.validity_days}
                    onChange={(e) => setEditingPackage({ ...editingPackage, validity_days: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user_limit">User Limit</Label>
                <Input
                  id="user_limit"
                  type="number"
                  value={editingPackage.user_limit || ''}
                  onChange={(e) => setEditingPackage({ ...editingPackage, user_limit: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={editingPackage.is_active}
                  onCheckedChange={(checked) => setEditingPackage({ ...editingPackage, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSavePackage}
                  disabled={updatePackageMutation.isPending}
                >
                  {updatePackageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Create Rental Package Dialog */}
      <Dialog open={isRentalDialogOpen} onOpenChange={setIsRentalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRentalPackage?.id ? 'Edit Rental Package' : 'Create Rental Package'}
            </DialogTitle>
          </DialogHeader>
          {editingRentalPackage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rental_name">Name</Label>
                <Input
                  id="rental_name"
                  value={editingRentalPackage.name}
                  onChange={(e) => setEditingRentalPackage({ ...editingRentalPackage, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rental_description">Description</Label>
                <Textarea
                  id="rental_description"
                  value={editingRentalPackage.description || ''}
                  onChange={(e) => setEditingRentalPackage({ ...editingRentalPackage, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_price">Monthly Price (UGX)</Label>
                  <Input
                    id="monthly_price"
                    type="number"
                    value={editingRentalPackage.monthly_price}
                    onChange={(e) => setEditingRentalPackage({ ...editingRentalPackage, monthly_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={editingRentalPackage.display_order}
                    onChange={(e) => setEditingRentalPackage({ ...editingRentalPackage, display_order: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_properties">Max Properties</Label>
                  <Input
                    id="max_properties"
                    type="number"
                    value={editingRentalPackage.max_properties}
                    onChange={(e) => setEditingRentalPackage({ ...editingRentalPackage, max_properties: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_units">Max Units</Label>
                  <Input
                    id="max_units"
                    type="number"
                    value={editingRentalPackage.max_units}
                    onChange={(e) => setEditingRentalPackage({ ...editingRentalPackage, max_units: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="included_users">Included Users</Label>
                  <Input
                    id="included_users"
                    type="number"
                    value={editingRentalPackage.included_users}
                    onChange={(e) => setEditingRentalPackage({ ...editingRentalPackage, included_users: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_user">Extra User Price</Label>
                  <Input
                    id="price_per_user"
                    type="number"
                    value={editingRentalPackage.price_per_additional_user}
                    onChange={(e) => setEditingRentalPackage({ ...editingRentalPackage, price_per_additional_user: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="rental_is_active"
                  checked={editingRentalPackage.is_active}
                  onCheckedChange={(checked) => setEditingRentalPackage({ ...editingRentalPackage, is_active: checked })}
                />
                <Label htmlFor="rental_is_active">Active</Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsRentalDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveRentalPackage}
                  disabled={updateRentalPackageMutation.isPending || createRentalPackageMutation.isPending}
                >
                  {(updateRentalPackageMutation.isPending || createRentalPackageMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingRentalPackage.id ? 'Save Changes' : 'Create Package'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Create Business Package Dialog */}
      <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBusinessPackage?.id ? 'Edit Business Package' : 'Create Business Package'}
            </DialogTitle>
          </DialogHeader>
          {editingBusinessPackage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Name</Label>
                <Input
                  id="business_name"
                  value={editingBusinessPackage.name}
                  onChange={(e) => setEditingBusinessPackage({ ...editingBusinessPackage, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_description">Description</Label>
                <Textarea
                  id="business_description"
                  value={editingBusinessPackage.description || ''}
                  onChange={(e) => setEditingBusinessPackage({ ...editingBusinessPackage, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_monthly_price">Monthly Price (UGX)</Label>
                  <Input
                    id="business_monthly_price"
                    type="number"
                    value={editingBusinessPackage.monthly_price}
                    onChange={(e) => setEditingBusinessPackage({ ...editingBusinessPackage, monthly_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_display_order">Display Order</Label>
                  <Input
                    id="business_display_order"
                    type="number"
                    value={editingBusinessPackage.display_order}
                    onChange={(e) => setEditingBusinessPackage({ ...editingBusinessPackage, display_order: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_branches">Max Branches</Label>
                  <Input
                    id="max_branches"
                    type="number"
                    value={editingBusinessPackage.max_branches}
                    onChange={(e) => setEditingBusinessPackage({ ...editingBusinessPackage, max_branches: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_products">Max Products</Label>
                  <Input
                    id="max_products"
                    type="number"
                    value={editingBusinessPackage.max_products || ''}
                    onChange={(e) => setEditingBusinessPackage({ ...editingBusinessPackage, max_products: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_max_users">Max Users</Label>
                  <Input
                    id="business_max_users"
                    type="number"
                    value={editingBusinessPackage.max_users}
                    onChange={(e) => setEditingBusinessPackage({ ...editingBusinessPackage, max_users: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_included_users">Included Users</Label>
                  <Input
                    id="business_included_users"
                    type="number"
                    value={editingBusinessPackage.included_users}
                    onChange={(e) => setEditingBusinessPackage({ ...editingBusinessPackage, included_users: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_price_per_user">Extra User Price</Label>
                <Input
                  id="business_price_per_user"
                  type="number"
                  value={editingBusinessPackage.price_per_additional_user}
                  onChange={(e) => setEditingBusinessPackage({ ...editingBusinessPackage, price_per_additional_user: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="business_is_active"
                  checked={editingBusinessPackage.is_active}
                  onCheckedChange={(checked) => setEditingBusinessPackage({ ...editingBusinessPackage, is_active: checked })}
                />
                <Label htmlFor="business_is_active">Active</Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsBusinessDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveBusinessPackage}
                  disabled={updateBusinessPackageMutation.isPending || createBusinessPackageMutation.isPending}
                >
                  {(updateBusinessPackageMutation.isPending || createBusinessPackageMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingBusinessPackage.id ? 'Save Changes' : 'Create Package'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPackages;
