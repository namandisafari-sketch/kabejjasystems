import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCircle, Edit, Trash2, Shield, Key, MessageCircle, RefreshCw, GraduationCap, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherAssignments } from "./TeacherAssignments";
import { z } from "zod";

interface StaffManagementProps {
  tenantId: string | null;
  userLimit: number;
  businessName: string;
  businessCode: string;
  businessType: string | null;
}

const staffSchema = z.object({
  email: z.string().email("Valid email required"),
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  branch_id: z.string().optional(),
  allowed_modules: z.array(z.string()),
});

const staffUpdateSchema = z.object({
  phone: z.string().optional(),
  branch_id: z.string().optional(),
  allowed_modules: z.array(z.string()),
});

const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const sanitizeForEmail = (name: string): string => {
  return name.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
};

// Check if business type is a school
const isSchoolBusiness = (type: string | null): boolean => {
  return ['kindergarten', 'primary_school', 'secondary_school', 'school'].includes(type || '');
};

// School module groups for organized display
const SCHOOL_MODULE_GROUPS = {
  academics: ['students', 'classes', 'subjects', 'marks_entry', 'report_cards', 'exams', 'timetable'],
  attendance: ['attendance', 'gate_checkin'],
  admission: ['admission_links', 'admission_confirmations', 'admission_settings'],
  finance: ['fees', 'expenses', 'accounting'],
  operations: ['parents', 'student_cards', 'letters', 'discipline', 'requisitions'],
  uneb: ['uneb_candidates', 'exam_sessions', 'exam_results_import', 'exam_import_permissions', 'exam_access'],
};

export function StaffManagement({ tenantId, userLimit, businessName, businessCode, businessType }: StaffManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [createdStaffCredentials, setCreatedStaffCredentials] = useState<{
    full_name: string;
    email: string;
    password: string;
    phone: string;
  } | null>(null);
  const [recentlyCreatedStaff, setRecentlyCreatedStaff] = useState<Array<{
    id: string;
    full_name: string;
    email: string;
    password: string;
    phone: string;
    created_at: Date;
  }>>([]);
  
  // Staff type: 'general' or 'teacher'
  const [staffType, setStaffType] = useState<'general' | 'teacher'>('general');
  
  // Teacher-specific assignments
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<{ subjectId: string; classId?: string }[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [classTeacherId, setClassTeacherId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    phone: "",
    branch_id: "",
    allowed_modules: ['dashboard'] as string[],
  });

  const isSchool = isSchoolBusiness(businessType);

  useEffect(() => {
    if (formData.username && businessName) {
      const domain = sanitizeForEmail(businessName);
      setFormData(prev => ({
        ...prev,
        email: `${formData.username.toLowerCase().replace(/\s+/g, '')}@${domain}.com`
      }));
    }
  }, [formData.username, businessName]);

  useEffect(() => {
    if (isDialogOpen && !editingStaff) {
      setGeneratedPassword(generatePassword());
    }
  }, [isDialogOpen, editingStaff]);

  // Fetch available modules filtered by business type
  const { data: availableModules = [] } = useQuery({
    queryKey: ['business-modules', businessType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_modules')
        .select('code, name, is_core, applicable_business_types, category')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      
      return data.filter(module => {
        if (module.is_core) return true;
        const applicableTypes = module.applicable_business_types || [];
        if (applicableTypes.length === 0) return true;
        return businessType && applicableTypes.includes(businessType);
      });
    },
  });

  // Fetch branches for assignment
  const { data: branches = [] } = useQuery({
    queryKey: ['branches', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch staff with their permissions
  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff-with-permissions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, role, created_at')
        .eq('tenant_id', tenantId)
        .neq('role', 'tenant_owner')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: permissions, error: permError } = await supabase
        .from('staff_permissions')
        .select('*, branches(name)')
        .eq('tenant_id', tenantId);

      if (permError) throw permError;

      // Get teacher assignments
      const { data: classAssignments } = await supabase
        .from('teacher_class_assignments')
        .select('teacher_id, class_id, is_class_teacher, school_classes(name)')
        .eq('tenant_id', tenantId);

      const { data: subjectAssignments } = await supabase
        .from('teacher_subject_assignments')
        .select('teacher_id, subject_id, subjects(name)')
        .eq('tenant_id', tenantId);

      return profiles.map(profile => {
        const perm = permissions?.find(p => p.profile_id === profile.id);
        const teacherClasses = classAssignments?.filter(a => a.teacher_id === profile.id) || [];
        const teacherSubjects = subjectAssignments?.filter(a => a.teacher_id === profile.id) || [];
        
        return {
          ...profile,
          branch_id: perm?.branch_id || null,
          branch_name: perm?.branches?.name || null,
          allowed_modules: perm?.allowed_modules || [],
          permission_id: perm?.id || null,
          staff_type: perm?.staff_type || 'general',
          assigned_classes: teacherClasses,
          assigned_subjects: teacherSubjects,
          is_class_teacher: teacherClasses.some(c => c.is_class_teacher),
        };
      });
    },
    enabled: !!tenantId,
  });

  // Create staff account mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const currentTotal = 1 + (staff?.length || 0);
      if (currentTotal >= userLimit) {
        throw new Error(`You've reached your user limit of ${userLimit}. Upgrade your package to add more team members.`);
      }
      
      const validated = staffSchema.parse(data);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke('create-staff-account', {
        body: {
          email: validated.email,
          password: generatedPassword,
          full_name: validated.full_name,
          phone: validated.phone || null,
          branch_id: validated.branch_id || null,
          allowed_modules: validated.allowed_modules,
          staff_type: staffType,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create staff account');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // If teacher, save class and subject assignments
      if (staffType === 'teacher' && response.data?.profile_id) {
        const profileId = response.data.profile_id;
        
        // Save class assignments
        if (selectedClasses.length > 0) {
          const classInserts = selectedClasses.map(classId => ({
            teacher_id: profileId,
            class_id: classId,
            tenant_id: tenantId!,
            is_class_teacher: classId === classTeacherId,
          }));
          
          await supabase.from('teacher_class_assignments').insert(classInserts);
        }
        
        // Save subject assignments
        if (selectedSubjects.length > 0) {
          const subjectInserts = selectedSubjects.map(({ subjectId, classId }) => ({
            teacher_id: profileId,
            subject_id: subjectId,
            class_id: classId || null,
            tenant_id: tenantId!,
          }));
          
          await supabase.from('teacher_subject_assignments').insert(subjectInserts);
        }
        
        // Update class teacher if set
        if (classTeacherId) {
          await supabase
            .from('school_classes')
            .update({ class_teacher_id: profileId })
            .eq('id', classTeacherId);
        }
      }

      return {
        ...response.data,
        email: validated.email,
        full_name: validated.full_name,
        password: generatedPassword,
        phone: validated.phone || '',
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-with-permissions'] });
      setIsDialogOpen(false);
      resetForm();
      
      setCreatedStaffCredentials({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        phone: data.phone || '',
      });
      
      setRecentlyCreatedStaff(prev => [
        {
          id: data.profile_id || crypto.randomUUID(),
          full_name: data.full_name,
          email: data.email,
          password: data.password,
          phone: data.phone || '',
          created_at: new Date(),
        },
        ...prev,
      ].slice(0, 5));
      
      toast({
        title: "Staff Account Created",
        description: "Account created successfully. Share credentials with the staff member.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openWhatsApp = (staffInfo: { full_name: string; email: string; password: string; phone: string }) => {
    const cleanPhone = staffInfo.phone
      .replace(/[\s\-\(\)]/g, '')
      .replace(/^0/, '256');
    
    const message = encodeURIComponent(
`🏫 *${businessName}* Staff Account

👤 *Name:* ${staffInfo.full_name}
📧 *Email:* ${staffInfo.email}
🔑 *Password:* ${staffInfo.password}
🏷️ *School Code:* ${businessCode}

📲 *Login Link:* ${window.location.origin}/login

⚠️ *Important:* When logging in, you MUST enter the School Code: *${businessCode}*

Please login with your email, password, and school code.`
    );
    
    const whatsappUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    setCreatedStaffCredentials(null);
  };

  const saveStaffMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingStaff) {
        const validated = staffUpdateSchema.parse(data);
        
        const { error } = await supabase
          .from('staff_permissions')
          .upsert({
            id: editingStaff.permission_id || undefined,
            profile_id: editingStaff.id,
            tenant_id: tenantId!,
            branch_id: validated.branch_id || null,
            allowed_modules: validated.allowed_modules,
            staff_type: staffType,
          }, {
            onConflict: 'profile_id,tenant_id',
          });
        if (error) throw error;

        if (validated.phone) {
          await supabase
            .from('profiles')
            .update({ phone: validated.phone })
            .eq('id', editingStaff.id);
        }

        // Update teacher assignments if teacher type
        if (staffType === 'teacher') {
          // Clear existing assignments
          await supabase.from('teacher_class_assignments').delete().eq('teacher_id', editingStaff.id);
          await supabase.from('teacher_subject_assignments').delete().eq('teacher_id', editingStaff.id);
          
          // Insert new class assignments
          if (selectedClasses.length > 0) {
            const classInserts = selectedClasses.map(classId => ({
              teacher_id: editingStaff.id,
              class_id: classId,
              tenant_id: tenantId!,
              is_class_teacher: classId === classTeacherId,
            }));
            await supabase.from('teacher_class_assignments').insert(classInserts);
          }
          
          // Insert new subject assignments
          if (selectedSubjects.length > 0) {
            const subjectInserts = selectedSubjects.map(({ subjectId, classId }) => ({
              teacher_id: editingStaff.id,
              subject_id: subjectId,
              class_id: classId || null,
              tenant_id: tenantId!,
            }));
            await supabase.from('teacher_subject_assignments').insert(subjectInserts);
          }
          
          // Update class teacher
          if (classTeacherId) {
            // Clear previous class teacher assignments for this teacher
            await supabase
              .from('school_classes')
              .update({ class_teacher_id: null })
              .eq('class_teacher_id', editingStaff.id);
            
            // Set new class teacher
            await supabase
              .from('school_classes')
              .update({ class_teacher_id: editingStaff.id })
              .eq('id', classTeacherId);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-with-permissions'] });
      setIsDialogOpen(false);
      setEditingStaff(null);
      resetForm();
      toast({
        title: "Staff Updated",
        description: "Staff permissions have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePermissionsMutation = useMutation({
    mutationFn: async (profileId: string) => {
      // Delete teacher assignments first
      await supabase.from('teacher_class_assignments').delete().eq('teacher_id', profileId);
      await supabase.from('teacher_subject_assignments').delete().eq('teacher_id', profileId);
      
      // Clear class teacher
      await supabase
        .from('school_classes')
        .update({ class_teacher_id: null })
        .eq('class_teacher_id', profileId);
      
      const { error } = await supabase
        .from('staff_permissions')
        .delete()
        .eq('profile_id', profileId)
        .eq('tenant_id', tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-with-permissions'] });
      toast({
        title: "Permissions Removed",
        description: "Staff permissions have been cleared",
      });
    },
  });

  const [resettingStaffId, setResettingStaffId] = useState<string | null>(null);
  
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, phone }: { userId: string; phone: string }) => {
      const newPassword = generatePassword();
      
      const response = await supabase.functions.invoke('create-staff-account', {
        body: {
          action: 'reset_password',
          user_id: userId,
          password: newPassword,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to reset password');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return {
        ...response.data,
        password: newPassword,
        phone,
      };
    },
    onSuccess: (data) => {
      setResettingStaffId(null);
      openWhatsApp({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        phone: data.phone || '',
      });
      toast({
        title: "Password Reset",
        description: "New credentials sent via WhatsApp",
      });
    },
    onError: (error: any) => {
      setResettingStaffId(null);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      full_name: "",
      phone: "",
      branch_id: "",
      allowed_modules: ['dashboard'],
    });
    setGeneratedPassword(generatePassword());
    setStaffType('general');
    setSelectedClasses([]);
    setSelectedSubjects([]);
    setIsClassTeacher(false);
    setClassTeacherId('');
  };

  const handleEdit = (member: any) => {
    setEditingStaff(member);
    setStaffType(member.staff_type || 'general');
    setFormData({
      username: "",
      email: "",
      full_name: member.full_name || "",
      phone: member.phone || "",
      branch_id: member.branch_id || "",
      allowed_modules: member.allowed_modules?.length > 0 ? member.allowed_modules : ['dashboard'],
    });
    
    // Load teacher assignments
    if (member.assigned_classes) {
      setSelectedClasses(member.assigned_classes.map((c: any) => c.class_id));
      const classTeacher = member.assigned_classes.find((c: any) => c.is_class_teacher);
      if (classTeacher) {
        setClassTeacherId(classTeacher.class_id);
        setIsClassTeacher(true);
      }
    }
    if (member.assigned_subjects) {
      setSelectedSubjects(member.assigned_subjects.map((s: any) => ({ subjectId: s.subject_id })));
    }
    
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      saveStaffMutation.mutate(formData);
    } else {
      createStaffMutation.mutate(formData);
    }
  };

  const toggleModule = (code: string) => {
    setFormData(prev => {
      const modules = prev.allowed_modules.includes(code)
        ? prev.allowed_modules.filter(m => m !== code)
        : [...prev.allowed_modules, code];
      if (!modules.includes('dashboard')) modules.push('dashboard');
      return { ...prev, allowed_modules: modules };
    });
  };

  // Group modules by category for school display
  const getModulesByGroup = (group: string) => {
    const codes = SCHOOL_MODULE_GROUPS[group as keyof typeof SCHOOL_MODULE_GROUPS] || [];
    return availableModules.filter(m => codes.includes(m.code));
  };

  const totalUsers = 1 + (staff?.length || 0);
  const canAddUser = totalUsers < userLimit;

  return (
    <>
      {/* WhatsApp Share Dialog */}
      <Dialog open={!!createdStaffCredentials} onOpenChange={(open) => !open && setCreatedStaffCredentials(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Share Credentials
            </DialogTitle>
            <DialogDescription>
              Staff account created! Share the login credentials with {createdStaffCredentials?.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md space-y-2">
              <p><strong>Name:</strong> {createdStaffCredentials?.full_name}</p>
              <p><strong>Email:</strong> {createdStaffCredentials?.email}</p>
              <p><strong>Password:</strong> {createdStaffCredentials?.password}</p>
              <p><strong>School Code:</strong> {businessCode}</p>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Staff must enter the school code <strong>{businessCode}</strong> when logging in.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCreatedStaffCredentials(null)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => createdStaffCredentials && openWhatsApp(createdStaffCredentials)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Share via WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Staff Management
              </CardTitle>
              <CardDescription>
                Add staff members and manage their access ({totalUsers}/{userLimit} users)
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingStaff(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!canAddUser && !editingStaff}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingStaff ? "Edit Staff Permissions" : "Add Staff Member"}</DialogTitle>
                  <DialogDescription>
                    {editingStaff 
                      ? "Update staff permissions and assignments"
                      : "Create a new staff account with login credentials"
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Staff Type Selection (Schools only) */}
                  {isSchool && (
                    <div>
                      <Label className="mb-2 block">Staff Type</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={staffType === 'general' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStaffType('general')}
                        >
                          General Staff
                        </Button>
                        <Button
                          type="button"
                          variant={staffType === 'teacher' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStaffType('teacher')}
                          className="flex items-center gap-2"
                        >
                          <GraduationCap className="h-4 w-4" />
                          Teacher
                        </Button>
                      </div>
                    </div>
                  )}

                  {!editingStaff && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="full_name">Full Name *</Label>
                          <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="e.g. John Doe"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="username">Username *</Label>
                          <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                            placeholder="e.g. johndoe"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Generated Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">WhatsApp Number *</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="e.g. 0700123456"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="p-3 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="h-4 w-4" />
                          <Label>Generated Password</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={generatedPassword}
                              readOnly
                              className="font-mono bg-background pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setGeneratedPassword(generatePassword())}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {editingStaff && (
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  )}

                  {branches.length > 0 && (
                    <div>
                      <Label htmlFor="branch">Assign to Branch</Label>
                      <Select
                        value={formData.branch_id || "none"}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, branch_id: value === "none" ? "" : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No specific branch</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  {/* Teacher Assignments (Schools only, when teacher type selected) */}
                  {isSchool && staffType === 'teacher' && tenantId && (
                    <TeacherAssignments
                      tenantId={tenantId}
                      selectedClasses={selectedClasses}
                      selectedSubjects={selectedSubjects}
                      onClassesChange={setSelectedClasses}
                      onSubjectsChange={setSelectedSubjects}
                      isClassTeacher={isClassTeacher}
                      onClassTeacherChange={setIsClassTeacher}
                      classTeacherId={classTeacherId}
                      onClassTeacherIdChange={setClassTeacherId}
                    />
                  )}

                  {/* Module Permissions */}
                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4" />
                      Page Access Permissions
                    </Label>
                    
                    {isSchool ? (
                      <Tabs defaultValue="academics" className="w-full">
                        <TabsList className="grid w-full grid-cols-6 h-auto">
                          <TabsTrigger value="academics" className="text-xs">Academic</TabsTrigger>
                          <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
                          <TabsTrigger value="admission" className="text-xs">Admission</TabsTrigger>
                          <TabsTrigger value="finance" className="text-xs">Finance</TabsTrigger>
                          <TabsTrigger value="operations" className="text-xs">Operations</TabsTrigger>
                          <TabsTrigger value="uneb" className="text-xs">UNEB</TabsTrigger>
                        </TabsList>
                        
                        {Object.keys(SCHOOL_MODULE_GROUPS).map(group => (
                          <TabsContent key={group} value={group} className="border rounded-md p-3 mt-2">
                            <div className="grid grid-cols-2 gap-2">
                              {getModulesByGroup(group).map((module) => (
                                <div key={module.code} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={module.code}
                                    checked={formData.allowed_modules.includes(module.code)}
                                    onCheckedChange={() => toggleModule(module.code)}
                                    disabled={module.code === 'dashboard'}
                                  />
                                  <Label htmlFor={module.code} className="text-sm font-normal cursor-pointer">
                                    {module.name}
                                  </Label>
                                </div>
                              ))}
                              {getModulesByGroup(group).length === 0 && (
                                <p className="text-sm text-muted-foreground col-span-2">No modules in this category</p>
                              )}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                        {availableModules.map((module) => (
                          <div key={module.code} className="flex items-center space-x-2">
                            <Checkbox
                              id={module.code}
                              checked={formData.allowed_modules.includes(module.code)}
                              onCheckedChange={() => toggleModule(module.code)}
                              disabled={module.code === 'dashboard'}
                            />
                            <Label htmlFor={module.code} className="text-sm font-normal cursor-pointer">
                              {module.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      Dashboard is always accessible. {staffType === 'teacher' && 'Teachers are automatically restricted to their assigned classes.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingStaff(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createStaffMutation.isPending || saveStaffMutation.isPending}
                    >
                      {(createStaffMutation.isPending || saveStaffMutation.isPending) 
                        ? "Saving..." 
                        : editingStaff 
                          ? "Update Permissions" 
                          : "Create Account"
                      }
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Recently Created Staff Section */}
          {recentlyCreatedStaff.length > 0 && (
            <div className="mb-6 p-4 border rounded-lg bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  Recently Created Staff
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecentlyCreatedStaff([])}
                  className="text-muted-foreground text-xs"
                >
                  Clear
                </Button>
              </div>
              <div className="space-y-2">
                {recentlyCreatedStaff.map((recentStaff) => (
                  <div
                    key={recentStaff.id}
                    className="flex items-center justify-between p-3 bg-background rounded-md border"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{recentStaff.full_name}</p>
                      <p className="text-sm text-muted-foreground">{recentStaff.email}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Password: {recentStaff.password} | Code: {businessCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `Email: ${recentStaff.email}\nPassword: ${recentStaff.password}\nSchool Code: ${businessCode}`
                          );
                          toast({
                            title: "Copied",
                            description: "Credentials copied to clipboard",
                          });
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => openWhatsApp(recentStaff)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!canAddUser && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You've reached your user limit ({userLimit} users). Upgrade your subscription package to add more team members.
              </AlertDescription>
            </Alert>
          )}
          
          {isLoading ? (
            <p className="text-muted-foreground">Loading staff...</p>
          ) : !staff || staff.length === 0 ? (
            <div className="text-center py-8">
              <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No staff members yet</p>
              <Button onClick={() => setIsDialogOpen(true)} disabled={!canAddUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Staff Member
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assignments</TableHead>
                    <TableHead>Page Access</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.full_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{member.phone || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.staff_type === 'teacher' ? 'default' : 'secondary'} className="capitalize">
                          {member.staff_type === 'teacher' ? (
                            <><GraduationCap className="h-3 w-3 mr-1" /> Teacher</>
                          ) : (
                            member.role
                          )}
                        </Badge>
                        {member.is_class_teacher && (
                          <Badge variant="outline" className="ml-1 text-xs">CT</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.assigned_classes?.slice(0, 2).map((c: any) => (
                            <Badge key={c.class_id} variant="outline" className="text-xs">
                              {c.school_classes?.name}
                            </Badge>
                          ))}
                          {(member.assigned_classes?.length || 0) > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.assigned_classes.length - 2}
                            </Badge>
                          )}
                          {member.assigned_subjects?.slice(0, 1).map((s: any) => (
                            <Badge key={s.subject_id} variant="secondary" className="text-xs">
                              {s.subjects?.name}
                            </Badge>
                          ))}
                          {(member.assigned_subjects?.length || 0) > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              +{member.assigned_subjects.length - 1} subj
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.allowed_modules?.length > 0 ? (
                            member.allowed_modules.slice(0, 3).map((mod: string) => (
                              <Badge key={mod} variant="secondary" className="text-xs">
                                {mod}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                          {member.allowed_modules?.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{member.allowed_modules.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          disabled={resettingStaffId === member.id || resetPasswordMutation.isPending}
                          onClick={() => {
                            setResettingStaffId(member.id);
                            resetPasswordMutation.mutate({ 
                              userId: member.id, 
                              phone: member.phone || '' 
                            });
                          }}
                          title="Reset password and send via WhatsApp"
                        >
                          {resettingStaffId === member.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <MessageCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Remove this staff member\'s permissions?')) {
                              deletePermissionsMutation.mutate(member.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
