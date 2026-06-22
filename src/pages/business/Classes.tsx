import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  secondary_level?: string | null;
  is_active: boolean;
}

export default function Classes() {
  const { t } = useLanguage();
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
    secondary_level: "",
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
        secondary_level: data.secondary_level || null,
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
        secondary_level: data.secondary_level || null,
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
    setFormData({ name: "", level: defaultLevel, grade: "", section: "", capacity: "", secondary_level: "" });
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
      secondary_level: (cls as any).secondary_level || "",
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.classes.title}</h1>
          <p className="text-muted-foreground">Manage classes and sections</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t.classes.addClass}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingClass ? t.common.edit : t.classes.addClass}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSecondarySchool ? (
                <>
                  <div>
                    <Label htmlFor="grade">{t.classes.className} *</Label>
                    <Select
                      value={formData.grade}
                      onValueChange={value => {
                        const classInfo = secondaryClassOptions.find(c => c.value === value);
                        setFormData({ 
                          ...formData, 
                          grade: value,
                          name: classInfo?.label || value,
                          level: "secondary",
                          secondary_level: classInfo?.level || "o-level"
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.common.filter} />
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
                    <Label htmlFor="section">{t.classes.stream} *</Label>
                    <Select
                      value={formData.section}
                      onValueChange={value => {
                        const classLabel = secondaryClassOptions.find(c => c.value === formData.grade)?.label || formData.grade;
                        setFormData({ 
                          ...formData, 
                          section: value,
                          name: `${classLabel} ${value}`,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.classes.stream} />
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
                    <Label htmlFor="name">{t.classes.className} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t.classes.className}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="level">{t.classes.section} *</Label>
                    <Select
                      value={formData.level}
                      onValueChange={value => setFormData({ ...formData, level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.common.filter} />
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
                    <Label htmlFor="grade">{t.exams.grade}</Label>
                    <Input
                      id="grade"
                      value={formData.grade}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="e.g. P1, Baby"
                    />
                  </div>
                  <div>
                    <Label htmlFor="section">{t.classes.section}</Label>
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
                <Label htmlFor="capacity">{t.common.quantity}</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="Max students"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>{t.common.cancel}</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingClass ? t.common.edit : t.classes.addClass}
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
                placeholder={t.common.search}
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
              <h3 className="text-lg font-medium">{t.common.noResults}</h3>
              <p className="text-muted-foreground">{t.classes.addClass}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredClasses.map(cls => (
                <Card key={cls.id} className="p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{cls.level || "-"} {cls.section ? `• ${cls.section}` : ""}</p>
                    </div>
                    <Badge variant={cls.is_active ? "default" : "secondary"}>
                      {cls.is_active ? t.common.active : t.common.inactive}
                    </Badge>
                  </div>
                  {cls.capacity && <p className="text-sm text-muted-foreground">{t.common.quantity}: {cls.capacity}</p>}
                  <div className="flex justify-end gap-1 mt-3">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(cls)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(cls.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
