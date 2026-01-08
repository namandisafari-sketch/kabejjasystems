import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface SchoolPackage {
  id: string;
  name: string;
  description: string | null;
  school_level: string;
  price_per_term: number;
  student_limit: number | null;
  features: string[];
  is_active: boolean;
}

const AdminSchoolPackages = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SchoolPackage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    school_level: 'all',
    price_per_term: '',
    student_limit: '',
    is_active: true,
  });

  const { data: packages, isLoading } = useQuery({
    queryKey: ['school-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_packages')
        .select('*')
        .order('price_per_term', { ascending: true });

      if (error) throw error;
      return data as SchoolPackage[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('school_packages')
        .insert({
          name: data.name,
          description: data.description || null,
          school_level: data.school_level,
          price_per_term: parseFloat(data.price_per_term),
          student_limit: data.student_limit ? parseInt(data.student_limit) : null,
          is_active: data.is_active,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-packages'] });
      toast.success('Package created successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create package: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('school_packages')
        .update({
          name: data.name,
          description: data.description || null,
          school_level: data.school_level,
          price_per_term: parseFloat(data.price_per_term),
          student_limit: data.student_limit ? parseInt(data.student_limit) : null,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-packages'] });
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
        .from('school_packages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-packages'] });
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
      school_level: 'all',
      price_per_term: '',
      student_limit: '',
      is_active: true,
    });
    setEditingPackage(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (pkg: SchoolPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      school_level: pkg.school_level,
      price_per_term: pkg.price_per_term.toString(),
      student_limit: pkg.student_limit?.toString() || '',
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

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'kindergarten': return 'Kindergarten';
      case 'primary': return 'Primary School';
      case 'secondary': return 'Secondary School';
      case 'all': return 'All Levels';
      default: return level;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 safe-bottom">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">School Packages</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Per-term pricing for schools</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="touch-target">
              <Plus className="h-4 w-4 mr-2" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>{editingPackage ? 'Edit Package' : 'Create Package'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Package Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Basic, Standard, Premium"
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

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="school_level">School Level</Label>
                  <Select
                    value={formData.school_level}
                    onValueChange={(value) => setFormData({ ...formData, school_level: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="kindergarten">Kindergarten</SelectItem>
                      <SelectItem value="primary">Primary School</SelectItem>
                      <SelectItem value="secondary">Secondary School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_per_term">Price/Term (UGX)</Label>
                  <Input
                    id="price_per_term"
                    type="number"
                    value={formData.price_per_term}
                    onChange={(e) => setFormData({ ...formData, price_per_term: e.target.value })}
                    placeholder="500000"
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student_limit">Student Limit</Label>
                  <Input
                    id="student_limit"
                    type="number"
                    value={formData.student_limit}
                    onChange={(e) => setFormData({ ...formData, student_limit: e.target.value })}
                    placeholder="Unlimited"
                    className="h-12"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Label htmlFor="is_active">Active Status</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <DialogFooter className="gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="touch-target">
                  Cancel
                </Button>
                <Button type="submit" className="touch-target" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPackage ? 'Update Package' : 'Create Package'}
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
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No school packages found</p>
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
                    }).format(pkg.price_per_term)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    per term (3 terms/year)
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Level</span>
                    <span className="font-medium">{getLevelLabel(pkg.school_level)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Students
                    </span>
                    <span className="font-medium">{pkg.student_limit || 'Unlimited'}</span>
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

export default AdminSchoolPackages;