import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Secondary school levels (Uganda - O-Level & A-Level)
const secondaryLevelOptions = [
  { value: "o-level", label: "O-Level (S1-S4)" },
  { value: "a-level", label: "A-Level (S5-S6)" },
];

// Secondary school classes
const secondaryClassOptions = [
  { value: "S1", label: "Senior 1", level: "o-level" },
  { value: "S2", label: "Senior 2", level: "o-level" },
  { value: "S3", label: "Senior 3", level: "o-level" },
  { value: "S4", label: "Senior 4", level: "o-level" },
  { value: "S5", label: "Senior 5", level: "a-level" },
  { value: "S6", label: "Senior 6", level: "a-level" },
];

// Primary school levels
const primaryLevelOptions = [
  { value: "kindergarten", label: "Kindergarten" },
  { value: "primary", label: "Primary" },
];

// Default stream/section names (will be overridden by school settings)
const defaultStreamOptions = ["East", "West", "North", "South", "A", "B", "C", "D"];

interface SchoolClass {
  id: string;
  name: string;
  level: string;
  grade: string;
  section: string | null;
  capacity: number | null;
  class_teacher_id: string | null;
  is_active: boolean;
}

export default function Classes() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  
  // Determine school type
  const isSecondarySchool = tenantData?.businessType?.includes('secondary') || false;
  const levelOptions = isSecondarySchool ? secondaryLevelOptions : primaryLevelOptions;
  const defaultLevel = isSecondarySchool ? "o-level" : "primary";
  
  const [formData, setFormData] = useState({
    name: "",
    level: defaultLevel,
    grade: "",
    section: "",
    capacity: "",
  });

  // Fetch school settings for custom streams
  const { data: schoolSettings } = useQuery({
    queryKey: ['school-settings', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId && isSecondarySchool,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('streams')
        .eq('tenant_id', tenantData!.tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Use custom streams if available, otherwise use defaults
  const streamOptions = schoolSettings?.streams || defaultStreamOptions;

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['school-classes', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_classes')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .order('name');
      if (error) throw error;
      return (data || []) as SchoolClass[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('school_classes').insert({
        tenant_id: tenantData!.tenantId,
        name: data.name,
        level: data.level,
        grade: data.grade || data.name,
        section: data.section || null,
        capacity: data.capacity ? parseInt(data.capacity) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-classes'] });
      toast({ title: "Class added successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase.from('school_classes').update({
        name: data.name,
        level: data.level,
        grade: data.grade || data.name,
        section: data.section || null,
        capacity: data.capacity ? parseInt(data.capacity) : null,
      }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-classes'] });
      toast({ title: "Class updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('school_classes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-classes'] });
      toast({ title: "Class deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", level: defaultLevel, grade: "", section: "", capacity: "" });
    setEditingClass(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      level: cls.level || defaultLevel,
      grade: cls.grade || "",
      section: cls.section || "",
      capacity: cls.capacity?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClass) {
      updateMutation.mutate({ ...formData, id: editingClass.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Classes</h1>
          <p className="text-muted-foreground">Manage classes and sections</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingClass ? "Edit Class" : "Add Class"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSecondarySchool ? (
                <>
                  <div>
                    <Label htmlFor="grade">Class *</Label>
                    <Select
                      value={formData.grade}
                      onValueChange={value => {
                        const classInfo = secondaryClassOptions.find(c => c.value === value);
                        setFormData({ 
                          ...formData, 
                          grade: value,
                          name: classInfo?.label || value,
                          level: classInfo?.level || "o-level"
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {secondaryClassOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="section">Stream *</Label>
                    <Select
                      value={formData.section}
                      onValueChange={value => {
                        const classLabel = secondaryClassOptions.find(c => c.value === formData.grade)?.label || formData.grade;
                        setFormData({ 
                          ...formData, 
                          section: value,
                          name: `${classLabel} ${value}`
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stream" />
                      </SelectTrigger>
                      <SelectContent>
                        {streamOptions.map(stream => (
                          <SelectItem key={stream} value={stream}>
                            {stream}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="name">Class Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Primary 1, Baby Class"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="level">Level *</Label>
                    <Select
                      value={formData.level}
                      onValueChange={value => setFormData({ ...formData, level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {levelOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="grade">Grade</Label>
                    <Input
                      id="grade"
                      value={formData.grade}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="e.g. P1, Baby"
                    />
                  </div>
                  <div>
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      value={formData.section}
                      onChange={e => setFormData({ ...formData, section: e.target.value })}
                      placeholder="e.g. A, B, C"
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="Max students"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingClass ? "Update" : "Add"} Class
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No classes yet</h3>
              <p className="text-muted-foreground">Add your first class to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map(cls => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.level || "-"}</TableCell>
                    <TableCell>{cls.section || "-"}</TableCell>
                    <TableCell>{cls.capacity || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={cls.is_active ? "default" : "secondary"}>
                        {cls.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(cls)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(cls.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
