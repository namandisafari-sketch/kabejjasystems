import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const defaultSubjects = {
  'o-level': [
    { name: 'English Language', code: 'ENG', category: 'core' },
    { name: 'Mathematics', code: 'MTH', category: 'core' },
    { name: 'Physics', code: 'PHY', category: 'core' },
    { name: 'Chemistry', code: 'CHE', category: 'core' },
    { name: 'Biology', code: 'BIO', category: 'core' },
    { name: 'Geography', code: 'GEO', category: 'core' },
    { name: 'History', code: 'HIS', category: 'core' },
    { name: 'Religious Education', code: 'RE', category: 'core' },
    { name: 'Kiswahili', code: 'KIS', category: 'elective' },
    { name: 'Computer Studies', code: 'CMP', category: 'elective' },
    { name: 'Agriculture', code: 'AGR', category: 'elective' },
    { name: 'Fine Art', code: 'ART', category: 'elective' },
    { name: 'Entrepreneurship', code: 'ENT', category: 'core' },
    { name: 'Physical Education', code: 'PE', category: 'core' },
  ],
  'a-level': [
    { name: 'General Paper', code: 'GP', category: 'core' },
    { name: 'Sub-Math', code: 'SMT', category: 'core' },
    { name: 'Physics', code: 'PHY', category: 'elective' },
    { name: 'Chemistry', code: 'CHE', category: 'elective' },
    { name: 'Biology', code: 'BIO', category: 'elective' },
    { name: 'Mathematics', code: 'MTH', category: 'elective' },
    { name: 'Economics', code: 'ECO', category: 'elective' },
    { name: 'Geography', code: 'GEO', category: 'elective' },
    { name: 'History', code: 'HIS', category: 'elective' },
    { name: 'Divinity', code: 'DIV', category: 'elective' },
    { name: 'Literature', code: 'LIT', category: 'elective' },
    { name: 'Computer Science', code: 'CS', category: 'elective' },
    { name: 'Entrepreneurship', code: 'ENT', category: 'elective' },
  ],
};

export function SubjectsManager() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [deleteSubject, setDeleteSubject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'core',
    level: 'o-level',
  });

  // Fetch subjects
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['school-subjects', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_subjects')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .order('level')
        .order('category')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Add/Update subject mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('school_subjects')
          .update({
            name: data.name,
            code: data.code,
            category: data.category,
            level: data.level,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('school_subjects')
          .insert({
            tenant_id: tenantData!.tenantId,
            name: data.name,
            code: data.code,
            category: data.category,
            level: data.level,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-subjects'] });
      setIsDialogOpen(false);
      setEditingSubject(null);
      resetForm();
      toast({ title: "Subject saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete subject mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('school_subjects')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-subjects'] });
      setDeleteSubject(null);
      toast({ title: "Subject deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Initialize default subjects mutation
  const initMutation = useMutation({
    mutationFn: async (level: 'o-level' | 'a-level') => {
      const subjectsToAdd = defaultSubjects[level].map(s => ({
        tenant_id: tenantData!.tenantId,
        name: s.name,
        code: s.code,
        category: s.category,
        level: level,
      }));

      const { error } = await supabase
        .from('school_subjects')
        .upsert(subjectsToAdd, { onConflict: 'tenant_id,name,level' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-subjects'] });
      toast({ title: "Default subjects added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', code: '', category: 'core', level: 'o-level' });
  };

  const handleEdit = (subject: any) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code || '',
      category: subject.category,
      level: subject.level,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingSubject?.id,
    });
  };

  const oLevelSubjects = subjects.filter(s => s.level === 'o-level');
  const aLevelSubjects = subjects.filter(s => s.level === 'a-level');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                School Subjects
              </CardTitle>
              <CardDescription>
                Manage subjects offered at your school for report cards
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => initMutation.mutate('o-level')}
                disabled={initMutation.isPending}
              >
                Add O-Level Defaults
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => initMutation.mutate('a-level')}
                disabled={initMutation.isPending}
              >
                Add A-Level Defaults
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setEditingSubject(null);
                  resetForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Subject Name</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Mathematics"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Code</Label>
                        <Input
                          value={formData.code}
                          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="e.g., MTH"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Level</Label>
                        <Select
                          value={formData.level}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="o-level">O-Level (S1-S4)</SelectItem>
                            <SelectItem value="a-level">A-Level (S5-S6)</SelectItem>
                            <SelectItem value="both">Both Levels</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="core">Core</SelectItem>
                            <SelectItem value="elective">Elective</SelectItem>
                            <SelectItem value="optional">Optional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Saving...' : 'Save Subject'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* O-Level Subjects */}
          <div>
            <h3 className="font-semibold mb-3">O-Level Subjects (S1-S4)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oLevelSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No O-Level subjects added. Click "Add O-Level Defaults" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  oLevelSubjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>{subject.code || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={subject.category === 'core' ? 'default' : 'secondary'}>
                          {subject.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(subject)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteSubject(subject)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* A-Level Subjects */}
          <div>
            <h3 className="font-semibold mb-3">A-Level Subjects (S5-S6)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aLevelSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No A-Level subjects added. Click "Add A-Level Defaults" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  aLevelSubjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>{subject.code || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={subject.category === 'core' ? 'default' : 'secondary'}>
                          {subject.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(subject)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteSubject(subject)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteSubject} onOpenChange={() => setDeleteSubject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSubject?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteSubject.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
