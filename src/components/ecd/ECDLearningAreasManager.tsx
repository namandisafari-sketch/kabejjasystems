import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, GripVertical, BookOpen, Sparkles } from 'lucide-react';

const DEFAULT_LEARNING_AREAS = [
  { name: 'Language Development', icon: '🗣️', description: 'Speaking, listening, and communication skills' },
  { name: 'Literacy', icon: '📚', description: 'Letters, writing, and reading readiness' },
  { name: 'Numeracy', icon: '🔢', description: 'Counting, shapes, and patterns' },
  { name: 'Creative Arts & Craft', icon: '🎨', description: 'Drawing, painting, and creative expression' },
  { name: 'Music, Dance & Drama', icon: '🎵', description: 'Songs, movement, and performance' },
  { name: 'Social & Emotional Skills', icon: '🤝', description: 'Sharing, empathy, and self-regulation' },
  { name: 'Health, Hygiene & Safety', icon: '🧼', description: 'Personal care and safety awareness' },
  { name: 'Science Through Play', icon: '🔬', description: 'Exploration and discovery' },
  { name: 'Games & Sports', icon: '⚽', description: 'Physical development and teamwork' },
];

const DEFAULT_RATING_SCALE = [
  { code: '4', label: 'Excellent', icon: '⭐', color: '#22C55E', numeric_value: 4, description: 'Exceeds expectations consistently' },
  { code: '3', label: 'Good', icon: '😊', color: '#3B82F6', numeric_value: 3, description: 'Meets expectations' },
  { code: '2', label: 'Developing', icon: '📈', color: '#F59E0B', numeric_value: 2, description: 'Making progress' },
  { code: '1', label: 'Needs Support', icon: '💪', color: '#EF4444', numeric_value: 1, description: 'Requires additional help' },
];

export default function ECDLearningAreasManager() {
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', icon: '📚', description: '' });

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
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch rating scale
  const { data: ratingScale = [] } = useQuery({
    queryKey: ['ecd-rating-scale', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_rating_scale')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Seed defaults mutation
  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      // Seed learning areas
      const areasToInsert = DEFAULT_LEARNING_AREAS.map((area, index) => ({
        tenant_id: tenantId!,
        name: area.name,
        icon: area.icon,
        description: area.description,
        display_order: index + 1,
        is_active: true,
      }));
      
      const { error: areasError } = await supabase
        .from('ecd_learning_areas')
        .upsert(areasToInsert, { onConflict: 'tenant_id,name', ignoreDuplicates: true });
      
      if (areasError) throw areasError;

      // Seed rating scale
      const scalesToInsert = DEFAULT_RATING_SCALE.map((scale, index) => ({
        tenant_id: tenantId!,
        code: scale.code,
        label: scale.label,
        icon: scale.icon,
        color: scale.color,
        numeric_value: scale.numeric_value,
        description: scale.description,
        display_order: index + 1,
        is_active: true,
      }));
      
      const { error: scalesError } = await supabase
        .from('ecd_rating_scale')
        .upsert(scalesToInsert, { onConflict: 'tenant_id,code', ignoreDuplicates: true });
      
      if (scalesError) throw scalesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-learning-areas'] });
      queryClient.invalidateQueries({ queryKey: ['ecd-rating-scale'] });
      toast.success('Default learning areas and rating scale created');
    },
    onError: () => toast.error('Failed to seed defaults'),
  });

  // Save learning area mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingArea) {
        const { error } = await supabase
          .from('ecd_learning_areas')
          .update(data)
          .eq('id', editingArea.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ecd_learning_areas')
          .insert({
            ...data,
            tenant_id: tenantId,
            display_order: learningAreas.length + 1,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-learning-areas'] });
      setShowAddDialog(false);
      setEditingArea(null);
      setFormData({ name: '', icon: '📚', description: '' });
      toast.success(editingArea ? 'Learning area updated' : 'Learning area added');
    },
    onError: () => toast.error('Failed to save learning area'),
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('ecd_learning_areas')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-learning-areas'] });
    },
  });

  const handleEdit = (area: any) => {
    setEditingArea(area);
    setFormData({ name: area.name, icon: area.icon || '📚', description: area.description || '' });
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Learning Areas
              </CardTitle>
              <CardDescription>
                Manage competency areas for ECD assessment
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {learningAreas.length === 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => seedDefaultsMutation.mutate()}
                  disabled={seedDefaultsMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Load Defaults
                </Button>
              )}
              <Button onClick={() => { setEditingArea(null); setFormData({ name: '', icon: '📚', description: '' }); setShowAddDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Area
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : learningAreas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No learning areas configured</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => seedDefaultsMutation.mutate()}
                disabled={seedDefaultsMutation.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Load Default Learning Areas
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Learning Area</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20">Active</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learningAreas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell>
                      <span className="text-xl">{area.icon}</span>
                    </TableCell>
                    <TableCell className="font-medium">{area.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{area.description}</TableCell>
                    <TableCell>
                      <Switch
                        checked={area.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: area.id, isActive: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(area)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rating Scale Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assessment Rating Scale (1-4)</CardTitle>
          <CardDescription>
            Used for scoring each learning area
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ratingScale.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>No rating scale configured. Click "Load Defaults" above to set up the standard 1-4 scale.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ratingScale.map((scale) => (
                <div 
                  key={scale.id} 
                  className="p-4 rounded-lg text-center"
                  style={{ backgroundColor: `${scale.color}20`, borderColor: scale.color, borderWidth: 2, borderStyle: 'solid' }}
                >
                  <div className="text-3xl mb-1">{scale.icon}</div>
                  <div className="font-bold text-lg" style={{ color: scale.color }}>{scale.code}</div>
                  <div className="font-medium">{scale.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{scale.description}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Edit Learning Area' : 'Add Learning Area'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Icon</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="📚"
                className="w-20 text-center text-xl"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Language Development"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {editingArea ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}