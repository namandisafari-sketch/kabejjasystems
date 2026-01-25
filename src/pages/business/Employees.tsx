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
import { Plus, Loader2, Users, UserCheck, Wallet, Search, Phone, Mail } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { format } from "date-fns";

const SCHOOL_DEPARTMENTS = ["Administration", "Teaching", "Accounts", "Library", "Sports", "Security", "Support Staff", "Other"];
const SCHOOL_ROLES = ["Head Teacher", "Deputy Head", "Director of Studies", "Bursar", "Teacher", "Librarian", "Secretary", "Security", "Support Staff"];
const RETAIL_DEPARTMENTS = ["Kitchen", "Service", "Management", "Housekeeping", "Security", "Accounts", "Other"];
const RETAIL_ROLES = ["Manager", "Supervisor", "Staff", "Intern"];

export default function Employees() {
  const tenantQuery = useTenant();
  const businessType = tenantQuery.data?.businessType;
  const isSchool = businessType?.includes('school') || false;
  const DEPARTMENTS = isSchool ? SCHOOL_DEPARTMENTS : RETAIL_DEPARTMENTS;
  const ROLES = isSchool ? SCHOOL_ROLES : RETAIL_ROLES;
  const tenantId = tenantQuery.data?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    salary: "",
    hire_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase.from('employees').insert({
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
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('employees').update({ is_active: !is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const resetForm = () => {
    setFormData({
      full_name: "", email: "", phone: "", role: "", department: "", salary: "",
      hire_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const filteredEmployees = employees?.filter(e =>
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeEmployees = employees?.filter(e => e.is_active).length || 0;
  const totalSalary = employees?.filter(e => e.is_active).reduce((sum, e) => sum + Number(e.salary || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">{isSchool ? "Staff" : "Employees"}</h1>
            <p className="text-xs text-muted-foreground">{employees?.length || 0} members</p>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setIsDrawerOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{employees?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-lg font-bold">{activeEmployees}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Payroll</p>
              <p className="text-sm font-bold">{(totalSalary / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </Card>
      </div>

      {/* EMPLOYEE LIST */}
      <ScrollArea className="flex-1 px-4 pb-20">
        {!filteredEmployees?.length ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No employees found</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsDrawerOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{employee.full_name}</p>
                      <Badge variant={employee.is_active ? "default" : "secondary"} className="text-xs">
                        {employee.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{employee.role}</span>
                      {employee.department && <span>• {employee.department}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      {employee.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {employee.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm font-semibold">{Number(employee.salary || 0).toLocaleString()}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => toggleStatus.mutate({ id: employee.id, is_active: employee.is_active })}
                    >
                      {employee.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* ADD DRAWER */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{isSchool ? "Add Staff Member" : "Add Employee"}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 max-h-[60vh]">
            <div className="space-y-4 pb-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+256..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Role</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Salary (UGX)</Label>
                  <Input type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label>Hire Date</Label>
                  <Input type="date" value={formData.hire_date} onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => createMutation.mutate()} disabled={!formData.full_name || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
