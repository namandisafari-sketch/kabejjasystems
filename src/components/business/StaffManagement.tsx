import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCircle, Edit, Trash2, Shield, Key, MessageCircle, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
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

// Schema for updating staff (email not required)
const staffUpdateSchema = z.object({
  phone: z.string().optional(),
  branch_id: z.string().optional(),
  allowed_modules: z.array(z.string()),
});

// Generate a strong 6-character password
const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Sanitize business name for email domain
const sanitizeForEmail = (name: string): string => {
  return name.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
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
  // Store recently created staff with their credentials for quick actions
  const [recentlyCreatedStaff, setRecentlyCreatedStaff] = useState<Array<{
    id: string;
    full_name: string;
    email: string;
    password: string;
    phone: string;
    created_at: Date;
  }>>([]);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    phone: "",
    branch_id: "",
    allowed_modules: ['dashboard'] as string[],
  });

  // Auto-generate email when username changes
  useEffect(() => {
    if (formData.username && businessName) {
      const domain = sanitizeForEmail(businessName);
      setFormData(prev => ({
        ...prev,
        email: `${formData.username.toLowerCase().replace(/\s+/g, '')}@${domain}.com`
      }));
    }
  }, [formData.username, businessName]);

  // Generate password when dialog opens for new staff
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
        .select('code, name, is_core, applicable_business_types')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      
      // Filter modules based on business type
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

      // Get emails from auth.users via edge function or just show what we have
      return profiles.map(profile => {
        const perm = permissions?.find(p => p.profile_id === profile.id);
        return {
          ...profile,
          branch_id: perm?.branch_id || null,
          branch_name: perm?.branches?.name || null,
          allowed_modules: perm?.allowed_modules || [],
          permission_id: perm?.id || null,
        };
      });
    },
    enabled: !!tenantId,
  });

  // Create staff account mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Check user limit before creating
      const currentTotal = 1 + (staff?.length || 0);
      if (currentTotal >= userLimit) {
        throw new Error(`You've reached your user limit of ${userLimit}. Upgrade your package to add more team members.`);
      }
      
      const validated = staffSchema.parse(data);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      // Call edge function to create account
      const response = await supabase.functions.invoke('create-staff-account', {
        body: {
          email: validated.email,
          password: generatedPassword,
          full_name: validated.full_name,
          phone: validated.phone || null,
          branch_id: validated.branch_id || null,
          allowed_modules: validated.allowed_modules,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create staff account');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
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
      
      // Store credentials to show WhatsApp option
      setCreatedStaffCredentials({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        phone: data.phone || '',
      });
      
      // Add to recently created staff list (keep last 5)
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

  // Function to open WhatsApp with credentials
  const openWhatsApp = (staffInfo: { full_name: string; email: string; password: string; phone: string }) => {
    // Clean phone number - remove spaces, dashes, and ensure it starts with country code
    const cleanPhone = staffInfo.phone
      .replace(/[\s\-\(\)]/g, '')
      .replace(/^0/, '256'); // Replace leading 0 with Uganda country code
    
    const message = encodeURIComponent(
`🏢 *${businessName}* Staff Account

👤 *Name:* ${staffInfo.full_name}
📧 *Email:* ${staffInfo.email}
🔑 *Password:* ${staffInfo.password}
🏷️ *Business Code:* ${businessCode}

📲 *Login Link:* ${window.location.origin}/login

Please login with your email and password. Use the business code if prompted.`
    );
    
    // If phone number provided, open direct chat, otherwise just pre-fill message
    const whatsappUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    setCreatedStaffCredentials(null);
  };

  const saveStaffMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingStaff) {
        // Use update schema for editing (no email required)
        const validated = staffUpdateSchema.parse(data);
        
        const { error } = await supabase
          .from('staff_permissions')
          .upsert({
            id: editingStaff.permission_id || undefined,
            profile_id: editingStaff.id,
            tenant_id: tenantId!,
            branch_id: validated.branch_id || null,
            allowed_modules: validated.allowed_modules,
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

  // Reset password and send credentials mutation
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
      // Open WhatsApp with new credentials
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
  };

  const handleEdit = (member: any) => {
    setEditingStaff(member);
    setFormData({
      username: "",
      email: "",
      full_name: member.full_name || "",
      phone: member.phone || "",
      branch_id: member.branch_id || "",
      allowed_modules: member.allowed_modules?.length > 0 ? member.allowed_modules : ['dashboard'],
    });
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

  // Calculate total users: owner (1) + staff
  const totalUsers = 1 + (staff?.length || 0);
  const canAddUser = totalUsers < userLimit;

  return (
    <>
      {/* WhatsApp Share Dialog for newly created staff */}
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
              <p><strong>Business Code:</strong> {businessCode}</p>
            </div>
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingStaff ? "Edit Staff Permissions" : "Add Staff Member"}</DialogTitle>
                  <DialogDescription>
                    {editingStaff 
                      ? "Update staff permissions and branch assignment"
                      : "Create a new staff account with login credentials"
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!editingStaff && (
                    <>
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
                        <p className="text-xs text-muted-foreground mt-1">
                          No spaces allowed. Email will be auto-generated.
                        </p>
                      </div>
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
                          placeholder="e.g. 0700123456 or +256700123456"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Used to send login credentials via WhatsApp
                        </p>
                      </div>
                      <div className="p-3 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="h-4 w-4" />
                          <Label>Generated Password</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={generatedPassword}
                            readOnly
                            className="font-mono bg-background"
                          />
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

                  <div>
                    <Label className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4" />
                      Page Access Permissions
                    </Label>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Dashboard is always accessible
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
                        Password: {recentStaff.password}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `Email: ${recentStaff.email}\nPassword: ${recentStaff.password}\nBusiness Code: ${businessCode}`
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
                    <TableHead>Phone</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Page Access</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name || 'N/A'}</TableCell>
                      <TableCell>{member.phone || '-'}</TableCell>
                      <TableCell>{member.branch_name || 'All branches'}</TableCell>
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
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {member.role}
                        </Badge>
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
