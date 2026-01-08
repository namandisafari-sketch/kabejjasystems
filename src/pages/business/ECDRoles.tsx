import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Award, Users, Star, Trash2, Edit2 } from 'lucide-react';

const ECDRoles = () => {
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('assignments');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Form states
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleBadge, setRoleBadge] = useState('⭐');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const badgeOptions = ['⭐', '🧸', '🧼', '🎵', '⚽', '✨', '📚', '🎨', '🍼', '🎀', '🧩', '🏆', '👑', '💫', '🌟'];

  // Fetch terms
  const { data: terms = [] } = useQuery({
    queryKey: ['academic-terms', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('year', { ascending: false });
      if (error) throw error;
      
      // Set current term as default
      const currentTerm = data.find(t => t.is_current);
      if (currentTerm && !selectedTerm) {
        setSelectedTerm(currentTerm.id);
      }
      
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['school-classes', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_classes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch class roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['ecd-class-roles', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_class_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ['students', tenantId, selectedClass],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('*, school_classes(name, section)')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      
      if (selectedClass && selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }
      
      const { data, error } = await query.order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch role assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['ecd-student-roles', tenantId, selectedTerm],
    queryFn: async () => {
      if (!selectedTerm) return [];
      const { data, error } = await supabase
        .from('ecd_student_roles')
        .select(`
          *,
          students(full_name, admission_number, class_id, school_classes(name, section)),
          ecd_class_roles(name, badge_icon)
        `)
        .eq('tenant_id', tenantId)
        .eq('term_id', selectedTerm)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!selectedTerm,
  });

  // Create/Update role mutation
  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      if (editingRole) {
        const { error } = await supabase
          .from('ecd_class_roles')
          .update({
            name: roleName,
            description: roleDescription,
            badge_icon: roleBadge,
          })
          .eq('id', editingRole.id);
        if (error) throw error;
      } else {
        const maxOrder = roles.length > 0 ? Math.max(...roles.map(r => r.display_order || 0)) : 0;
        const { error } = await supabase
          .from('ecd_class_roles')
          .insert({
            tenant_id: tenantId,
            name: roleName,
            description: roleDescription,
            badge_icon: roleBadge,
            display_order: maxOrder + 1,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-class-roles'] });
      setRoleDialogOpen(false);
      resetRoleForm();
      toast.success(editingRole ? 'Role updated' : 'Role created');
    },
    onError: () => toast.error('Failed to save role'),
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ecd_student_roles')
        .insert({
          tenant_id: tenantId,
          student_id: selectedStudent,
          role_id: selectedRole,
          term_id: selectedTerm,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-student-roles'] });
      setAssignDialogOpen(false);
      setSelectedStudent('');
      setSelectedRole('');
      toast.success('Role assigned');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('This learner already has this role');
      } else {
        toast.error('Failed to assign role');
      }
    },
  });

  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ecd_student_roles')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-student-roles'] });
      toast.success('Role removed');
    },
    onError: () => toast.error('Failed to remove role'),
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ecd_class_roles')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-class-roles'] });
      toast.success('Role deleted');
    },
    onError: () => toast.error('Failed to delete role'),
  });

  const resetRoleForm = () => {
    setRoleName('');
    setRoleDescription('');
    setRoleBadge('⭐');
    setEditingRole(null);
  };

  const openEditRole = (role: any) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleBadge(role.badge_icon || '⭐');
    setRoleDialogOpen(true);
  };

  // Filter students not already assigned the selected role
  const availableStudents = students.filter(
    s => !assignments.some(a => a.student_id === s.id && a.role_id === selectedRole)
  );

  // Filter assignments by class
  const filteredAssignments = selectedClass === 'all' 
    ? assignments 
    : assignments.filter(a => a.students?.class_id === selectedClass);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
            Class Roles & Badges
          </h1>
          <p className="text-sm text-muted-foreground">
            Assign leadership roles and badges to learners
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="assignments" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Role Assignments</span>
            <span className="sm:hidden">Assign</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Roles</span>
            <span className="sm:hidden">Roles</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map(term => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name} {term.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} {cls.section && `- ${cls.section}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={!selectedTerm}>
                  <Plus className="h-4 w-4" />
                  Assign Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Role to Learner</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.badge_icon} {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Select Learner</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a learner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStudents.map(student => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.full_name} - {student.school_classes?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => assignRoleMutation.mutate()}
                    disabled={!selectedStudent || !selectedRole || assignRoleMutation.isPending}
                  >
                    {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Assignments Display */}
          <Card>
            <CardContent className="pt-6">
              {assignmentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No role assignments found</p>
                  <p className="text-sm">Assign roles to recognize learner achievements</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAssignments.map(assignment => (
                    <Card key={assignment.id} className="relative overflow-hidden">
                      <div className="absolute top-2 right-2 text-3xl">
                        {assignment.ecd_class_roles?.badge_icon}
                      </div>
                      <CardContent className="pt-4">
                        <p className="font-medium pr-10">{assignment.students?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.students?.school_classes?.name}
                        </p>
                        <Badge className="mt-2" variant="secondary">
                          {assignment.ecd_class_roles?.name}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute bottom-2 right-2 text-destructive hover:text-destructive"
                          onClick={() => removeAssignmentMutation.mutate(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={roleDialogOpen} onOpenChange={(open) => {
              setRoleDialogOpen(open);
              if (!open) resetRoleForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Role Name</Label>
                    <Input 
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      placeholder="e.g., Class Helper"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input 
                      value={roleDescription}
                      onChange={(e) => setRoleDescription(e.target.value)}
                      placeholder="What this role involves..."
                    />
                  </div>
                  <div>
                    <Label>Badge Icon</Label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {badgeOptions.map(badge => (
                        <Button
                          key={badge}
                          type="button"
                          variant={roleBadge === badge ? 'default' : 'outline'}
                          className="text-xl h-12"
                          onClick={() => setRoleBadge(badge)}
                        >
                          {badge}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => saveRoleMutation.mutate()}
                    disabled={!roleName || saveRoleMutation.isPending}
                  >
                    {saveRoleMutation.isPending ? 'Saving...' : (editingRole ? 'Update Role' : 'Create Role')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {rolesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No roles defined yet</p>
                  <p className="text-sm">Create roles to assign to learners</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {roles.map(role => (
                    <Card key={role.id} className="relative">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{role.badge_icon}</span>
                          <div className="flex-1">
                            <p className="font-medium">{role.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {role.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditRole(role)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteRoleMutation.mutate(role.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ECDRoles;
