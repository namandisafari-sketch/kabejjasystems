import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Pencil, Trash2, Home, Users } from "lucide-react";
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
    features: string[];
    is_active: boolean;
    display_order: number;
}

const AdminRentalPackages = () => {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<RentalPackage | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        max_properties: '',
        max_units: '',
        monthly_price: '',
        included_users: '1',
        price_per_additional_user: '10000',
        display_order: '0',
        is_active: true,
    });

    const { data: packages, isLoading } = useQuery({
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

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const { error } = await supabase
                .from('rental_packages')
                .insert({
                    name: data.name,
                    description: data.description || null,
                    max_properties: parseInt(data.max_properties),
                    max_units: parseInt(data.max_units),
                    monthly_price: parseFloat(data.monthly_price),
                    included_users: parseInt(data.included_users),
                    price_per_additional_user: parseFloat(data.price_per_additional_user),
                    display_order: parseInt(data.display_order),
                    is_active: data.is_active,
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-packages'] });
            toast.success('Rental package created successfully');
            resetForm();
        },
        onError: (error) => {
            toast.error('Failed to create package: ' + error.message);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
            const { error } = await supabase
                .from('rental_packages')
                .update({
                    name: data.name,
                    description: data.description || null,
                    max_properties: parseInt(data.max_properties),
                    max_units: parseInt(data.max_units),
                    monthly_price: parseFloat(data.monthly_price),
                    included_users: parseInt(data.included_users),
                    price_per_additional_user: parseFloat(data.price_per_additional_user),
                    display_order: parseInt(data.display_order),
                    is_active: data.is_active,
                })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-packages'] });
            toast.success('Package updated successfully');
            resetForm();
        },
        onError: (error) => {
            toast.error('Failed to update package: ' + error.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('rental_packages')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rental-packages'] });
            toast.success('Package deleted successfully');
        },
        onError: (error) => {
            toast.error('Failed to delete package: ' + error.message);
        },
    });

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            max_properties: '',
            max_units: '',
            monthly_price: '',
            included_users: '1',
            price_per_additional_user: '10000',
            display_order: '0',
            is_active: true,
        });
        setEditingPackage(null);
        setIsDialogOpen(false);
    };

    const handleEdit = (pkg: RentalPackage) => {
        setEditingPackage(pkg);
        setFormData({
            name: pkg.name,
            description: pkg.description || '',
            max_properties: pkg.max_properties.toString(),
            max_units: pkg.max_units.toString(),
            monthly_price: pkg.monthly_price.toString(),
            included_users: pkg.included_users.toString(),
            price_per_additional_user: pkg.price_per_additional_user.toString(),
            display_order: pkg.display_order.toString(),
            is_active: pkg.is_active,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPackage) {
            updateMutation.mutate({ id: editingPackage.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6 safe-bottom">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Rental Packages</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Monthly pricing for rental management</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
                    <DialogTrigger asChild>
                        <Button className="touch-target">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Package
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingPackage ? 'Edit Package' : 'Create Rental Package'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Starter, Professional"
                                        className="h-12"
                                        required
                                    />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Package description..."
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="monthly_price">Monthly Price (UGX)</Label>
                                    <Input
                                        id="monthly_price"
                                        type="number"
                                        value={formData.monthly_price}
                                        onChange={(e) => setFormData({ ...formData, monthly_price: e.target.value })}
                                        placeholder="50000"
                                        className="h-12"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="display_order">Display Order</Label>
                                    <Input
                                        id="display_order"
                                        type="number"
                                        value={formData.display_order}
                                        onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                                        className="h-12"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="max_properties">Max Properties</Label>
                                    <Input
                                        id="max_properties"
                                        type="number"
                                        value={formData.max_properties}
                                        onChange={(e) => setFormData({ ...formData, max_properties: e.target.value })}
                                        placeholder="5"
                                        className="h-12"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="max_units">Max Units</Label>
                                    <Input
                                        id="max_units"
                                        type="number"
                                        value={formData.max_units}
                                        onChange={(e) => setFormData({ ...formData, max_units: e.target.value })}
                                        placeholder="20"
                                        className="h-12"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="included_users">Included Users</Label>
                                    <Input
                                        id="included_users"
                                        type="number"
                                        value={formData.included_users}
                                        onChange={(e) => setFormData({ ...formData, included_users: e.target.value })}
                                        className="h-12"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="price_per_additional_user">Extra User Price</Label>
                                    <Input
                                        id="price_per_additional_user"
                                        type="number"
                                        value={formData.price_per_additional_user}
                                        onChange={(e) => setFormData({ ...formData, price_per_additional_user: e.target.value })}
                                        className="h-12"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <Label htmlFor="is_active">Active</Label>
                                <Switch
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                            </div>

                            <DialogFooter className="gap-2">
                                <Button type="button" variant="outline" onClick={resetForm} className="touch-target">
                                    Cancel
                                </Button>
                                <Button type="submit" className="touch-target" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingPackage ? 'Update' : 'Create Package')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-6 bg-muted rounded w-1/3" />
                                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-muted rounded w-1/4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : packages?.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No rental packages found</p>
                            <p className="text-sm text-muted-foreground mt-1">Create your first package to get started</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {packages?.map((pkg) => (
                        <Card key={pkg.id} className="relative group">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg truncate">{pkg.name}</CardTitle>
                                        <CardDescription className="mt-1 line-clamp-2">
                                            {pkg.description || 'No description'}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {pkg.is_active ? (
                                            <Badge className="bg-success text-xs">Active</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-2xl sm:text-3xl font-bold">
                                        {new Intl.NumberFormat('en-UG', {
                                            style: 'currency',
                                            currency: 'UGX',
                                            maximumFractionDigits: 0,
                                        }).format(pkg.monthly_price)}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        per month
                                    </p>
                                </div>

                                <div className="space-y-2 pt-3 border-t">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Home className="h-3 w-3" />
                                            Properties
                                        </span>
                                        <span className="font-medium">{pkg.max_properties}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            Units
                                        </span>
                                        <span className="font-medium">{pkg.max_units}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            Users
                                        </span>
                                        <span className="font-medium">{pkg.included_users} (+UGX {pkg.price_per_additional_user.toLocaleString()}/user)</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(pkg)}
                                        className="flex-1 touch-target"
                                    >
                                        <Pencil className="h-4 w-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => deleteMutation.mutate(pkg.id)}
                                        className="touch-target"
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminRentalPackages;
