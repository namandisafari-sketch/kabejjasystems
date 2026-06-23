import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus, Loader2, Users, UserCheck, Wallet, Search, Phone, Mail,
  ClipboardList, Key, MessageCircle, Shield, RefreshCw, Eye, EyeOff,
  UserPlus, CheckCircle2, XCircle, GraduationCap, AlertCircle, Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { StaffRoleType } from "@/types/school-admin";
import { STAFF_ROLE_LABELS } from "@/types/school-admin";

const SCHOOL_DEPARTMENTS = ["Administration", "Teaching", "Accounts", "Library", "Sports", "Security", "Support Staff", "Other"];
const SCHOOL_ROLES = ["Head Teacher", "Deputy Head", "Director of Studies", "Bursar", "Teacher", "Librarian", "Secretary", "Security", "Support Staff"];
const RETAIL_DEPARTMENTS = ["Kitchen", "Service", "Management", "Housekeeping", "Security", "Accounts", "Other"];
const RETAIL_ROLES = ["Manager", "Supervisor", "Staff", "Intern"];

const ROLE_TO_STAFF_TYPE_MAP: Record<string, StaffRoleType> = {
  "Head Teacher": "head_teacher",
  "Deputy Head": "deputy_head_admin",
  "Director of Studies": "director_of_studies",
  "Bursar": "bursar",
  "Teacher": "subject_teacher",
  "Librarian": "librarian",
  "Secretary": "admissions_officer",
  "Security": "gate_keeper",
  "Support Staff": "store_keeper",
};

const STAFF_ROLE_IDS: StaffRoleType[] = Object.keys(STAFF_ROLE_LABELS) as StaffRoleType[];

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 6; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
  return password;
};

const sanitizeForEmail = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

export default function Employees() {
  const tenantQuery = useTenant();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const businessType = tenantQuery.data?.businessType;
  const tenantId = tenantQuery.data?.tenantId;
  const businessName = tenantQuery.data?.businessName || "";
  const businessCode = tenantQuery.data?.businessCode || "";
  const isSchool = businessType?.includes("school") || false;
  const DEPARTMENTS = isSchool ? SCHOOL_DEPARTMENTS : RETAIL_DEPARTMENTS;
  const ROLES = isSchool ? SCHOOL_ROLES : RETAIL_ROLES;

  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(["dashboard"]);
  const [createdStaffCredentials, setCreatedStaffCredentials] = useState<{
    full_name: string; email: string; password: string; phone: string;
  } | null>(null);
  const [recentlyCreated, setRecentlyCreated] = useState<Array<{
    id: string; full_name: string; email: string; password: string; phone: string;
  }>>([]);
  const [quickCreateTarget, setQuickCreateTarget] = useState<any>(null);
  const [quickCreateStaffType, setQuickCreateStaffType] = useState<StaffRoleType | "general">("general");
  const [formData, setFormData] = useState({
    full_name: "", email: "", phone: "", role: "", department: "",
    salary: "", hire_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [staffType, setStaffType] = useState<StaffRoleType | "general">("general");

  // --- Queries ---
  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: staffAccounts } = useQuery({
    queryKey: ["staff-accounts", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone, role, email")
        .eq("tenant_id", tenantId)
        .neq("role", "tenant_owner");
      const { data: permissions } = await supabase
        .from("staff_permissions")
        .select("profile_id, allowed_modules, staff_type, is_active")
        .eq("tenant_id", tenantId);
      return (profiles || []).map((p) => ({
        ...p,
        permissions: permissions?.find((perm) => perm.profile_id === p.id) || null,
      }));
    },
    enabled: !!tenantId,
  });

  const { data: availableModules } = useQuery({
    queryKey: ["business-modules", businessType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_modules")
        .select("code, name, is_core, applicable_business_types")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data || []).filter((m) => {
        if (m.is_core) return true;
        const types = m.applicable_business_types || [];
        if (types.length === 0) return true;
        return businessType && types.includes(businessType);
      });
    },
    enabled: !!businessType,
  });

  const employeesWithAccounts = (employees || []).map((emp) => {
    const account = (staffAccounts || []).find(
      (a) =>
        a.email?.toLowerCase() === emp.email?.toLowerCase() ||
        a.phone === emp.phone
    );
    return { ...emp, account: account || null };
  });

  const noAccountEmployees = employeesWithAccounts.filter((e) => !e.account);
  const withAccountEmployees = employeesWithAccounts.filter((e) => e.account);

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase.from("employees").insert({
        tenant_id: tenantId,
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role,
        department: formData.department || null,
        salary: formData.salary ? parseFloat(formData.salary) : 0,
        hire_date: formData.hire_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Employee added" });
      setIsDrawerOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-staff-account", {
        body: {
          email: formData.email,
          password: generatedPassword,
          full_name: formData.full_name,
          phone: formData.phone || null,
          allowed_modules: selectedModules,
          staff_type: staffType,
        },
      });
      if (response.error) throw new Error(response.error.message || "Failed");
      if (response.data?.error) throw new Error(response.data.error);
      return {
        ...response.data,
        email: formData.email,
        full_name: formData.full_name,
        password: generatedPassword,
        phone: formData.phone || "",
      };
    },
    onSuccess: (data) => {
      setCreatedStaffCredentials({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        phone: data.phone,
      });
      setRecentlyCreated((prev) =>
        [
          { id: data.profile_id || crypto.randomUUID(), ...data },
          ...prev,
        ].slice(0, 5)
      );
      queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });
      setIsDrawerOpen(false);
      resetForm();
      toast({ title: "Account Created", description: "Staff account created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createAccountForEmployee = useMutation({
    mutationFn: async (emp: any) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-staff-account", {
        body: {
          email: emp.email,
          password: generatedPassword,
          full_name: emp.full_name,
          phone: emp.phone || null,
          allowed_modules: ["dashboard"],
          staff_type: quickCreateStaffType,
        },
      });
      if (response.error) throw new Error(response.error.message || "Failed");
      if (response.data?.error) throw new Error(response.data.error);
      return {
        ...response.data,
        email: emp.email,
        full_name: emp.full_name,
        password: generatedPassword,
        phone: emp.phone || "",
      };
    },
    onSuccess: (data) => {
      setCreatedStaffCredentials({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        phone: data.phone,
      });
      setRecentlyCreated((prev) =>
        [
          { id: data.profile_id || crypto.randomUUID(), ...data },
          ...prev,
        ].slice(0, 5)
      );
      queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });
      toast({ title: "Account Created", description: "Login account created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("employees")
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, phone }: { userId: string; phone: string }) => {
      const newPassword = generatePassword();
      const response = await supabase.functions.invoke("create-staff-account", {
        body: { action: "reset_password", user_id: userId, password: newPassword },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return { ...response.data, password: newPassword, phone };
    },
    onSuccess: (data) => {
      setCreatedStaffCredentials({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        phone: data.phone || "",
      });
      toast({ title: "Password Reset", description: "New credentials ready to share" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // --- Helpers ---
  const resetForm = () => {
    setFormData({
      full_name: "", email: "", phone: "", role: "", department: "",
      salary: "", hire_date: format(new Date(), "yyyy-MM-dd"),
    });
    setShowAccountForm(false);
    setGeneratedPassword(generatePassword());
    setSelectedModules(["dashboard"]);
    setStaffType("general");
  };

  const openWhatsApp = (info: { full_name: string; email: string; password: string; phone: string }) => {
    const cleanPhone = info.phone.replace(/[\s\-\(\)]/g, "").replace(/^0/, "256");
    const message = encodeURIComponent(
      `🏫 *${businessName}* Staff Account\n\n👤 *Name:* ${info.full_name}\n📧 *Email:* ${info.email}\n🔑 *Password:* ${info.password}\n🏷️ *School Code:* ${businessCode}\n\n📲 *Login Link:* ${window.location.origin}/login\n\n⚠️ *Important:* When logging in, you MUST enter the School Code: *${businessCode}*\n\nPlease login with your email, password, and school code.`
    );
    window.open(
      cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`,
      "_blank"
    );
    setCreatedStaffCredentials(null);
  };

  const copyToClipboard = (info: { full_name: string; email: string; password: string; phone: string }) => {
    navigator.clipboard.writeText(
      `Name: ${info.full_name}\nEmail: ${info.email}\nPassword: ${info.password}\nSchool Code: ${businessCode}\nLogin: ${window.location.origin}/login`
    );
    toast({ title: "Copied", description: "Credentials copied to clipboard" });
  };

  const toggleModule = (code: string) => {
    setSelectedModules((prev) => {
      const next = prev.includes(code) ? prev.filter((m) => m !== code) : [...prev, code];
      if (!next.includes("dashboard")) next.push("dashboard");
      return next;
    });
  };

  const filteredEmployees = employeesWithAccounts.filter(
    (e) =>
      e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeEmployees = employees?.filter((e) => e.is_active).length || 0;
  const totalSalary =
    employees
      ?.filter((e) => e.is_active)
      .reduce((sum, e) => sum + Number(e.salary || 0), 0) || 0;

  // --- Render ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Credentials Share Dialog */}
      <Dialog
        open={!!createdStaffCredentials}
        onOpenChange={(open) => !open && setCreatedStaffCredentials(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Share Credentials
            </DialogTitle>
            <DialogDescription>
              Account created! Share login credentials with{" "}
              {createdStaffCredentials?.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md space-y-2 text-sm">
              <p><strong>Name:</strong> {createdStaffCredentials?.full_name}</p>
              <p><strong>Email:</strong> {createdStaffCredentials?.email}</p>
              <p>
                <strong>Password:</strong>{" "}
                <span className="font-mono">{createdStaffCredentials?.password}</span>
              </p>
              <p><strong>School Code:</strong> {businessCode}</p>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Staff must enter the school code <strong>{businessCode}</strong> when
                logging in.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreatedStaffCredentials(null)} className="flex-1">
                Close
              </Button>
              <Button variant="outline" onClick={() => createdStaffCredentials && copyToClipboard(createdStaffCredentials)} className="flex-1">
                <Copy className="h-4 w-4 mr-2" /> Copy
              </Button>
              <Button
                onClick={() => createdStaffCredentials && openWhatsApp(createdStaffCredentials)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">
              {isSchool ? t.staff.title : t.nav.employees}
            </h1>
            <p className="text-xs text-muted-foreground">
              {employees?.length || 0} {t.common.members} &middot;{" "}
              {noAccountEmployees.length} without login
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/business/employee-onboarding">
              <Button size="sm" variant="outline">
                <ClipboardList className="h-4 w-4 mr-1" /> Onboard
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setGeneratedPassword(generatePassword());
                setIsDrawerOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" /> Add
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.common.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rtl:pr-9 rtl:pl-3 h-10"
          />
        </div>
      </div>

      {/* RECENTLY CREATED */}
      {recentlyCreated.length > 0 && (
        <div className="mx-4 mt-4 p-3 border rounded-lg bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-1">
              <UserPlus className="h-4 w-4" /> Recently Created Accounts
            </h3>
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setRecentlyCreated([])}>
              Clear
            </Button>
          </div>
          <div className="space-y-1">
            {recentlyCreated.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs bg-background rounded p-2 border">
                <div>
                  <span className="font-medium">{r.full_name}</span>
                  <span className="text-muted-foreground ml-2">{r.email}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyToClipboard(r)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-green-600" onClick={() => openWhatsApp(r)}>
                    <MessageCircle className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Create Staff Type Dialog */}
      <Dialog open={!!quickCreateTarget} onOpenChange={(open) => { if (!open) setQuickCreateTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-600" />
              Create Login for {quickCreateTarget?.full_name}
            </DialogTitle>
            <DialogDescription>
              Select the workspace / dashboard type for this staff member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Workspace Type</Label>
              <Select
                value={quickCreateStaffType}
                onValueChange={(v) => setQuickCreateStaffType(v as StaffRoleType | "general")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Business Dashboard</SelectItem>
                  {STAFF_ROLE_IDS.filter((r) => !["senior_man","senior_woman","patron","matron"].includes(r)).map((roleId) => (
                    <SelectItem key={roleId} value={roleId}>
                      {STAFF_ROLE_LABELS[roleId]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Auto-suggested based on their role. Change if needed.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setQuickCreateTarget(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                createAccountForEmployee.mutate(quickCreateTarget);
                setQuickCreateTarget(null);
              }}
              disabled={createAccountForEmployee.isPending}
            >
              {createAccountForEmployee.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              <UserPlus className="h-4 w-4 mr-2" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t.staff.totalStaff}</p>
              <p className="text-lg font-bold">{employees?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t.staff.activeStaff}</p>
              <p className="text-lg font-bold">{activeEmployees}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t.staff.totalPayroll}</p>
              <p className="text-sm font-bold">
                {(totalSalary / 1000000).toFixed(1)}M
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* EMPLOYEE LIST */}
      <ScrollArea className="flex-1 px-4 pb-20">
        {!filteredEmployees?.length ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t.staff.noStaffFound}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                resetForm();
                setGeneratedPassword(generatePassword());
                setIsDrawerOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />{" "}
              {t.staff.addStaff}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{employee.full_name}</p>
                      <Badge
                        variant={employee.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {employee.is_active ? t.common.active : t.common.inactive}
                      </Badge>
                      {employee.account ? (
                        <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Has Login
                        </Badge>
                      ) : employee.email ? (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                          <XCircle className="h-3 w-3 mr-1" /> No Account
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{employee.role}</span>
                      {employee.department && <span>&middot; {employee.department}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                      {employee.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {employee.phone}
                        </span>
                      )}
                      {employee.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {employee.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-2 flex flex-col items-end gap-1">
                    <p className="text-sm font-semibold">
                      {Number(employee.salary || 0).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1">
                      {employee.account ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-2 text-green-600"
                          title="Reset Password"
                          onClick={() =>
                            resetPasswordMutation.mutate({
                              userId: employee.account.id,
                              phone: employee.phone || "",
                            })
                          }
                          disabled={resetPasswordMutation.isPending}
                        >
                          <Key className="h-3 w-3 mr-1" /> Reset
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-2 text-amber-600"
                          title="Create Login Account"
                          disabled={!employee.email}
                          onClick={() => {
                            const mapped = ROLE_TO_STAFF_TYPE_MAP[employee.role];
                            setQuickCreateStaffType(mapped || "general");
                            setQuickCreateTarget(employee);
                          }}
                        >
                          <UserPlus className="h-3 w-3 mr-1" /> Add Login
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* ADD DRAWER */}
      <Drawer open={isDrawerOpen} onOpenChange={(open) => { setIsDrawerOpen(open); if (!open) resetForm(); }}>
        <DrawerContent className="max-h-[95dvh]">
          <DrawerHeader>
            <DrawerTitle>{t.staff.addStaff}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[65dvh]">
            <div className="space-y-4 pb-4">
              <div>
                <Label className="text-sm">Full Name *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  className="h-11 sm:h-10"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="h-11 sm:h-10"
                  />
                </div>
                <div>
                  <Label className="text-sm">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+256..."
                    className="h-11 sm:h-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v) => {
                      setFormData({ ...formData, role: v });
                      const mapped = ROLE_TO_STAFF_TYPE_MAP[v];
                      if (mapped) setStaffType(mapped);
                    }}
                  >
                    <SelectTrigger className="h-11 sm:h-10">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(v) => setFormData({ ...formData, department: v })}
                  >
                    <SelectTrigger className="h-11 sm:h-10">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Salary (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="0"
                    className="h-11 sm:h-10"
                  />
                </div>
                <div>
                  <Label className="text-sm">Hire Date</Label>
                  <Input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="h-11 sm:h-10"
                  />
                </div>
              </div>

              <Separator className="my-2" />

              {/* Account Creation Toggle */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="createLogin"
                  checked={showAccountForm}
                  onCheckedChange={(v) => {
                    setShowAccountForm(!!v);
                    if (v) setGeneratedPassword(generatePassword());
                  }}
                  className="mt-0.5"
                />
                <Label htmlFor="createLogin" className="font-medium cursor-pointer text-sm leading-5">
                  Also create login account
                </Label>
              </div>

              {showAccountForm && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    An auth account will be created with email/password login.
                  </p>

                  <div>
                    <Label className="text-sm">Generated Password</Label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                      <div className="relative flex-1">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={generatedPassword}
                          readOnly
                          className="font-mono bg-background pr-11 h-11 sm:h-10 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 p-0 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setGeneratedPassword(generatePassword())}
                        className="h-11 sm:h-10 shrink-0"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Workspace / Dashboard Type</Label>
                    <Select value={staffType} onValueChange={(v) => setStaffType(v as StaffRoleType | "general")}>
                      <SelectTrigger className="h-11 sm:h-10">
                        <SelectValue placeholder="Select workspace" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Business Dashboard</SelectItem>
                        {STAFF_ROLE_IDS.filter((r) => !["senior_man","senior_woman","patron","matron"].includes(r)).map((roleId) => (
                          <SelectItem key={roleId} value={roleId}>
                            {STAFF_ROLE_LABELS[roleId]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Determines which dedicated portal the staff sees on login.
                    </p>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2 text-sm">
                      <Shield className="h-4 w-4 shrink-0" /> Page Access
                    </Label>
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 border rounded-md p-3">
                      {(availableModules || []).map((mod) => (
                        <div key={mod.code} className="flex items-center space-x-2 min-w-0">
                          <Checkbox
                            id={`mod-${mod.code}`}
                            checked={selectedModules.includes(mod.code)}
                            onCheckedChange={() => toggleModule(mod.code)}
                            disabled={mod.code === "dashboard"}
                            className="shrink-0"
                          />
                          <Label
                            htmlFor={`mod-${mod.code}`}
                            className="text-sm font-normal cursor-pointer truncate"
                          >
                            {mod.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dashboard is always accessible.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DrawerFooter className="flex-col-reverse sm:flex-row gap-2 px-4 pb-4 pt-2">
            <Button
              variant="outline"
              className="w-full sm:flex-1 h-11 sm:h-10"
              onClick={() => { setIsDrawerOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            {showAccountForm ? (
              <Button
                className="w-full sm:flex-1 h-11 sm:h-10"
                onClick={() => createAccountMutation.mutate()}
                disabled={!formData.full_name || !formData.email || createAccountMutation.isPending}
              >
                {createAccountMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account
              </Button>
            ) : (
              <Button
                className="w-full sm:flex-1 h-11 sm:h-10"
                onClick={() => createMutation.mutate()}
                disabled={!formData.full_name || createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {t.common.add}
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
