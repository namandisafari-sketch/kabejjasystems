import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Home,
  Search,
  Plus,
  AlertTriangle,
  DollarSign,
  Heart,
  Shield,
  CheckCircle,
  X,
  Filter,
} from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  school_classes: { name: string } | null;
}

interface SendHomeRecord {
  id: string;
  student_id: string;
  send_home_date: string;
  reason: string;
  reason_category: string;
  is_active: boolean;
  notified_parent: boolean;
  gate_blocked: boolean;
  created_at: string;
  cleared_at: string | null;
  students: Student;
}

const REASON_CATEGORIES = [
  { value: "fees", label: "Fee Balances", icon: DollarSign, color: "text-orange-500" },
  { value: "discipline", label: "Discipline", icon: Shield, color: "text-red-500" },
  { value: "health", label: "Health", icon: Heart, color: "text-pink-500" },
  { value: "other", label: "Other", icon: AlertTriangle, color: "text-yellow-500" },
];

export default function SendHome() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SendHomeRecord | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkCategory, setBulkCategory] = useState("fees");
  const [clearReason, setClearReason] = useState("");

  // Fetch all students
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-send-home", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number, school_classes(name)")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data as Student[];
    },
    enabled: !!tenantId,
  });

  // Fetch students with fee balances
  const { data: studentsWithBalances = [] } = useQuery({
    queryKey: ["students-with-balances", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_fees")
        .select(`
          student_id,
          balance,
          students (
            id,
            full_name,
            admission_number,
            school_classes (name)
          )
        `)
        .eq("tenant_id", tenantId!)
        .gt("balance", 0);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch today's send home records
  const { data: sendHomeRecords = [] } = useQuery({
    queryKey: ["send-home-records", tenantId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("send_home_records")
        .select(`
          *,
          students (
            id,
            full_name,
            admission_number,
            school_classes (name)
          )
        `)
        .eq("tenant_id", tenantId!)
        .gte("send_home_date", today.toISOString().split("T")[0])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SendHomeRecord[];
    },
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  // Create send home records mutation
  const createMutation = useMutation({
    mutationFn: async ({
      studentIds,
      reason,
      reasonCategory,
    }: {
      studentIds: string[];
      reason: string;
      reasonCategory: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const records = studentIds.map((studentId) => ({
        tenant_id: tenantId,
        student_id: studentId,
        reason,
        reason_category: reasonCategory,
        created_by: userData.user?.id,
        gate_blocked: true,
        is_active: true,
      }));

      const { error } = await supabase.from("send_home_records").insert(records);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Students marked to be sent home");
      queryClient.invalidateQueries({ queryKey: ["send-home-records"] });
      setShowAddDialog(false);
      setSelectedStudents([]);
      setBulkReason("");
      setBulkCategory("fees");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Clear send home record mutation
  const clearMutation = useMutation({
    mutationFn: async ({ recordId, reason }: { recordId: string; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("send_home_records")
        .update({
          is_active: false,
          gate_blocked: false,
          cleared_by: userData.user?.id,
          cleared_at: new Date().toISOString(),
          cleared_reason: reason,
        })
        .eq("id", recordId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student cleared to enter");
      queryClient.invalidateQueries({ queryKey: ["send-home-records"] });
      setShowClearDialog(false);
      setSelectedRecord(null);
      setClearReason("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAddStudents = () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }
    if (!bulkReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    createMutation.mutate({
      studentIds: selectedStudents,
      reason: bulkReason,
      reasonCategory: bulkCategory,
    });
  };

  const activeRecords = sendHomeRecords.filter((r) => r.is_active);
  const clearedRecords = sendHomeRecords.filter((r) => !r.is_active);

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    const cat = REASON_CATEGORIES.find((c) => c.value === category);
    if (!cat) return AlertTriangle;
    return cat.icon;
  };

  const getCategoryColor = (category: string) => {
    const cat = REASON_CATEGORIES.find((c) => c.value === category);
    return cat?.color || "text-muted-foreground";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Home className="h-8 w-8" />
            Send Home Management
          </h1>
          <p className="text-muted-foreground">
            Mark students to be sent home. Gate will be alerted when they try to enter.
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Send Students Home
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Home className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Today</p>
                <p className="text-2xl font-bold">{activeRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due to Fees</p>
                <p className="text-2xl font-bold">
                  {activeRecords.filter((r) => r.reason_category === "fees").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cleared Today</p>
                <p className="text-2xl font-bold">{clearedRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Students with Balances</p>
                <p className="text-2xl font-bold">{studentsWithBalances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Active ({activeRecords.length})
          </TabsTrigger>
          <TabsTrigger value="cleared" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Cleared ({clearedRecords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Students to Send Home Today</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {REASON_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No students marked to be sent home today
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeRecords
                      .filter(
                        (r) => selectedCategory === "all" || r.reason_category === selectedCategory
                      )
                      .map((record) => {
                        const CategoryIcon = getCategoryIcon(record.reason_category);
                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{record.students?.full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {record.students?.admission_number}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{record.students?.school_classes?.name || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <CategoryIcon
                                  className={`h-3 w-3 ${getCategoryColor(record.reason_category)}`}
                                />
                                {REASON_CATEGORIES.find((c) => c.value === record.reason_category)
                                  ?.label || record.reason_category}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {record.reason}
                            </TableCell>
                            <TableCell>
                              {record.gate_blocked ? (
                                <Badge variant="destructive">Gate Blocked</Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setShowClearDialog(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Clear
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cleared">
          <Card>
            <CardHeader>
              <CardTitle>Cleared Students Today</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Original Reason</TableHead>
                    <TableHead>Cleared Reason</TableHead>
                    <TableHead>Cleared At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clearedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No cleared records today
                      </TableCell>
                    </TableRow>
                  ) : (
                    clearedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.students?.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {record.students?.admission_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{record.reason}</TableCell>
                        <TableCell>{record.cleared_at || "-"}</TableCell>
                        <TableCell>
                          {record.cleared_at
                            ? format(new Date(record.cleared_at), "h:mm a")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Students Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Students Home</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Reason Category</Label>
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className={`h-4 w-4 ${cat.color}`} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reason *</Label>
              <Textarea
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Describe the reason for sending these students home..."
                rows={2}
              />
            </div>

            <div>
              <Label>Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or admission number..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No students found</p>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudents([...selectedStudents, student.id]);
                        } else {
                          setSelectedStudents(selectedStudents.filter((id) => id !== student.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.admission_number} • {student.school_classes?.name}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {selectedStudents.length} student(s) selected
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStudents}
              disabled={createMutation.isPending || selectedStudents.length === 0}
            >
              {createMutation.isPending ? "Saving..." : "Send Home"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Student</AlertDialogTitle>
            <AlertDialogDescription>
              Clear {selectedRecord?.students?.full_name} to allow them to enter the school?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Reason for Clearing</Label>
            <Textarea
              value={clearReason}
              onChange={(e) => setClearReason(e.target.value)}
              placeholder="e.g., Fees paid, Parent contacted, Issue resolved..."
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedRecord) {
                  clearMutation.mutate({
                    recordId: selectedRecord.id,
                    reason: clearReason,
                  });
                }
              }}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? "Clearing..." : "Clear Student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
