import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, GripVertical, Palette, Pencil, BookOpen, Music, MessageSquare, Eye, Calculator, Gamepad2, Heart, Bath, Sparkles } from 'lucide-react';

interface LearningActivity {
  id: string;
  tenant_id: string;
  name: string;
  icon: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

const DEFAULT_ACTIVITIES = [
  { name: 'Writing', icon: '✍️', description: 'Handwriting and pencil skills' },
  { name: 'Listening', icon: '👂', description: 'Attention and listening skills' },
  { name: 'Reading', icon: '📖', description: 'Reading readiness and recognition' },
  { name: 'Speaking', icon: '🗣️', description: 'Verbal communication skills' },
  { name: 'Drawing', icon: '🎨', description: 'Art and creative expression' },
  { name: 'Games', icon: '🎮', description: 'Play and game participation' },
  { name: 'Rhymes and Stories', icon: '📚', description: 'Songs, rhymes and storytelling' },
  { name: 'Music', icon: '🎵', description: 'Music and rhythm activities' },
  { name: 'Health Habits', icon: '🏥', description: 'Hygiene and health awareness' },
  { name: 'Toilet Habits', icon: '🚽', description: 'Toilet training and independence' },
];

const ECDLearningActivities = () => {
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<LearningActivity | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: '📝', description: '' });

  // Fetch learning activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['ecd-learning-activities', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_learning_activities')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order');
      if (error) throw error;
      return data as LearningActivity[];
    },
    enabled: !!tenantId,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingActivity) {
        const { error } = await supabase
          .from('ecd_learning_activities')
          .update({
            name: data.name,
            icon: data.icon,
            description: data.description || null,
          })
          .eq('id', editingActivity.id);
        if (error) throw error;
      } else {
        const maxOrder = activities.length > 0 
          ? Math.max(...activities.map(a => a.display_order)) + 1 
          : 0;
        const { error } = await supabase
          .from('ecd_learning_activities')
          .insert({
            tenant_id: tenantId,
            name: data.name,
            icon: data.icon,
            description: data.description || null,
            display_order: maxOrder,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-learning-activities'] });
      setDialogOpen(false);
      setEditingActivity(null);
      setFormData({ name: '', icon: '📝', description: '' });
      toast.success(editingActivity ? 'Activity updated' : 'Activity created');
    },
    onError: () => toast.error('Failed to save activity'),
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ecd_learning_activities')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-learning-activities'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ecd_learning_activities')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-learning-activities'] });
      toast.success('Activity deleted');
    },
    onError: () => toast.error('Failed to delete activity'),
  });

  // Seed default activities
  const seedMutation = useMutation({
    mutationFn: async () => {
      const activitiesToInsert = DEFAULT_ACTIVITIES.map((a, idx) => ({
        tenant_id: tenantId,
        name: a.name,
        icon: a.icon,
        description: a.description,
        display_order: idx,
        is_active: true,
      }));
      const { error } = await supabase
        .from('ecd_learning_activities')
        .insert(activitiesToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-learning-activities'] });
      toast.success('Default activities added!');
    },
    onError: () => toast.error('Failed to add default activities'),
  });

  const openEditDialog = (activity: LearningActivity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      icon: activity.icon,
      description: activity.description || '',
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingActivity(null);
    setFormData({ name: '', icon: '📝', description: '' });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-pink-500" />
            Learning Activities
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage activities for ECD report cards (Writing, Reading, Drawing, etc.)
          </p>
        </div>

        <div className="flex gap-2">
          {activities.length === 0 && (
            <Button 
              variant="outline" 
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Default Activities
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingActivity ? 'Edit Activity' : 'Add Learning Activity'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <Label>Icon</Label>
                    <Input
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="text-center text-2xl"
                      maxLength={4}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label>Activity Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Writing, Reading"
                    />
                  </div>
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the activity"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => saveMutation.mutate(formData)}
                  disabled={!formData.name || saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Activities List
          </CardTitle>
          <CardDescription>
            These activities appear in the "Performance in Learning Activities" section of ECD report cards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No learning activities configured yet</p>
              <p className="text-sm">Add default activities or create your own</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-3 sm:hidden">
                {activities.map(activity => (
                  <Card key={activity.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{activity.icon}</span>
                        <div>
                          <p className="font-medium">{activity.name}</p>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground">{activity.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={activity.is_active}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: activity.id, is_active: checked })}
                        />
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(activity)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Icon</TableHead>
                      <TableHead>Activity Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Active</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map(activity => (
                      <TableRow key={activity.id}>
                        <TableCell className="text-2xl">{activity.icon}</TableCell>
                        <TableCell className="font-medium">{activity.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {activity.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={activity.is_active}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: activity.id, is_active: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditDialog(activity)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(activity.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ECDLearningActivities;
