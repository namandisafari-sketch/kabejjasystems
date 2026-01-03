import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Search, Printer, Eye, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/hooks/use-database";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { format } from "date-fns";
import { LetterPreview } from "@/components/letters/LetterPreview";

interface LetterFormData {
  title: string;
  subject: string;
  content: string;
  letter_type: "general" | "personalized";
  student_id: string | null;
  class_id: string | null;
  letter_date: string;
  reference_number: string;
}

const Letters = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;

  // Fetch tenant details for the preview
  const { data: tenant } = useQuery({
    queryKey: ['tenant-for-letters', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewLetter, setPreviewLetter] = useState<any>(null);
  const [formData, setFormData] = useState<LetterFormData>({
    title: "",
    subject: "",
    content: "",
    letter_type: "general",
    student_id: null,
    class_id: null,
    letter_date: new Date().toISOString().split('T')[0],
    reference_number: "",
  });

  // Fetch letters
  const { data: letters, isLoading } = useQuery({
    queryKey: ['letters', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('letters')
        .select(`
          *,
          students(full_name, admission_number),
          school_classes(name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch students for personalized letters
  const { data: students } = useQuery({
    queryKey: ['students-for-letters', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_number')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes-for-letters', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('school_classes')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Create letter mutation
  const createMutation = useMutation({
    mutationFn: async (data: LetterFormData) => {
      const { error } = await supabase
        .from('letters')
        .insert({
          tenant_id: tenantId,
          title: data.title,
          subject: data.subject || null,
          content: data.content,
          letter_type: data.letter_type,
          student_id: data.student_id || null,
          class_id: data.class_id || null,
          letter_date: data.letter_date,
          reference_number: data.reference_number || null,
          status: 'draft',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      toast({ title: "Letter created successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error creating letter", description: error.message, variant: "destructive" });
    },
  });

  // Update letter mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LetterFormData }) => {
      const { error } = await supabase
        .from('letters')
        .update({
          title: data.title,
          subject: data.subject || null,
          content: data.content,
          letter_type: data.letter_type,
          student_id: data.student_id || null,
          class_id: data.class_id || null,
          letter_date: data.letter_date,
          reference_number: data.reference_number || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      toast({ title: "Letter updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error updating letter", description: error.message, variant: "destructive" });
    },
  });

  // Delete letter mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('letters')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      toast({ title: "Letter deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting letter", description: error.message, variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      title: "",
      subject: "",
      content: "",
      letter_type: "general",
      student_id: null,
      class_id: null,
      letter_date: new Date().toISOString().split('T')[0],
      reference_number: "",
    });
  };

  const handleEdit = (letter: any) => {
    setEditingId(letter.id);
    setFormData({
      title: letter.title,
      subject: letter.subject || "",
      content: letter.content,
      letter_type: letter.letter_type,
      student_id: letter.student_id,
      class_id: letter.class_id,
      letter_date: letter.letter_date,
      reference_number: letter.reference_number || "",
    });
    setIsDialogOpen(true);
  };

  const handlePreview = (letter: any) => {
    setPreviewLetter(letter);
    setIsPreviewOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredLetters = letters?.filter(letter =>
    letter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    letter.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Letters</h1>
            <p className="text-muted-foreground">Create and manage letters for students</p>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Letter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search letters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading letters...</p>
          ) : filteredLetters?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No letters found. Create your first letter!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Student/Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLetters?.map((letter) => (
                  <TableRow key={letter.id}>
                    <TableCell className="font-medium">{letter.title}</TableCell>
                    <TableCell>
                      <Badge variant={letter.letter_type === 'personalized' ? 'default' : 'secondary'}>
                        {letter.letter_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(letter.letter_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {letter.letter_type === 'personalized' && letter.students
                        ? letter.students.full_name
                        : letter.school_classes?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={letter.status === 'finalized' ? 'default' : 'outline'}>
                        {letter.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(letter)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(letter)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteMutation.mutate(letter.id)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Letter' : 'Create New Letter'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Holiday Notice"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="letter_type">Letter Type</Label>
                <Select
                  value={formData.letter_type}
                  onValueChange={(value: "general" | "personalized") => 
                    setFormData({ ...formData, letter_type: value, student_id: null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (All Students)</SelectItem>
                    <SelectItem value="personalized">Personalized (Specific Student)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.letter_type === 'personalized' && (
              <div className="space-y-2">
                <Label htmlFor="student">Select Student</Label>
                <Select
                  value={formData.student_id || ""}
                  onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name} ({student.admission_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.letter_type === 'general' && (
              <div className="space-y-2">
                <Label htmlFor="class">Target Class (Optional)</Label>
                <Select
                  value={formData.class_id || "all"}
                  onValueChange={(value) => setFormData({ ...formData, class_id: value === "all" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Letter Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.letter_date}
                  onChange={(e) => setFormData({ ...formData, letter_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="e.g., REF/2024/001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., End of Term Holiday Notice"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your letter content here..."
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Use placeholders: {"{{student_name}}"}, {"{{class_name}}"}, {"{{admission_number}}"} for personalized letters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Update' : 'Create'} Letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <LetterPreview
        letter={previewLetter}
        tenant={tenant}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default Letters;