import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, GripVertical, BookOpen, Sparkles } from 'lucide-react';

interface LearningArea {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number | null;
  is_active: boolean | null;
}

export default function ECDLearningAreas() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<LearningArea | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📚',
    is_active: true,
  });

  // Fetch learning areas
  const { data: learningAreas = [], isLoading } = useQuery({
    queryKey: ['ecd-learning-areas', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_learning_areas')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order');
      if (error) throw error;
      return data as LearningArea[];
    },
    enabled: !!tenantId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const maxOrder = Math.max(0, ...learningAreas.map(a => a.display_order || 0));
      const { error } = await supabase
        .from('ecd_learning_areas')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          description: data.description || null,
          icon: data.icon || '📚',
          is_active: data.is_active,
          display_order: maxOrder + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-learning-areas'] });
      toast.success('Learning area created');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('ecd_learning_areas')
        .update({
          name: data.name,
          description: data.description || null,
          icon: data.icon || '📚',
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-learning-areas'] });
      toast.success('Learning area updated');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ecd_learning_areas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-learning-areas'] });
      toast.success('Learning area deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleOpenDialog = (area?: LearningArea) => {
    if (area) {
      setEditingArea(area);
      setFormData({
        name: area.name,
        description: area.description || '',
        icon: area.icon || '📚',
        is_active: area.is_active ?? true,
      });
    } else {
      setEditingArea(null);
      setFormData({
        name: '',
        description: '',
        icon: '📚',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingArea(null);
    setFormData({
      name: '',
      description: '',
      icon: '📚',
      is_active: true,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const commonIcons = ['📚', '✏️', '🎨', '🎵', '🤝', '🏃', '🧮', '🔬', '💬', '❤️', '🌱', '🧠'];

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            ECD Learning Areas
          </h1>
          <p className="text-muted-foreground">Manage learning areas for ECD progress reports</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Learning Area
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingArea ? 'Edit Learning Area' : 'Add Learning Area'}</DialogTitle>
              <DialogDescription>
                Define a learning area for ECD pupil assessments
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {commonIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                      className={`text-2xl p-2 rounded-lg hover:bg-muted ${formData.icon === icon ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Language Development"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description of this learning area"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingArea ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Learning Areas List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Learning Areas ({learningAreas.length})
          </CardTitle>
          <CardDescription>
            These areas are used for assessing ECD pupil progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {learningAreas.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No learning areas yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add learning areas to start assessing pupil progress
              </p>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Learning Area
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Learning Area</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learningAreas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell>
                      <span className="text-2xl">{area.icon}</span>
                    </TableCell>
                    <TableCell className="font-medium">{area.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {area.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={area.is_active ? 'default' : 'secondary'}>
                        {area.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(area)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this learning area?')) {
                              deleteMutation.mutate(area.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
}
