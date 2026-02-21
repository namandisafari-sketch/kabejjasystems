import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, differenceInHours } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LogOut,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  MessageSquare,
  Bell,
  Plus,
  Wallet,
  BookOpen,
  ShieldAlert,
  Award,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { DisciplineCasesView } from "@/components/parent/DisciplineCasesView";
import { ECDParentView } from "@/components/parent/ECDParentView";
import { NotificationCenter } from "@/components/parent/NotificationCenter";
import { RedListBanner } from "@/components/parent/RedListBanner";
import { ExamResultsCard } from "@/components/parent/ExamResultsCard";
import { useParentNotifications } from "@/hooks/use-parent-notifications";

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  school_classes?: {
    name: string;
  };
}

interface CheckinRecord {
  id: string;
  student_id: string;
  check_type: string;
  checked_at: string;
  is_late: boolean;
}

interface StudentFee {
  id: string;
  student_id: string;
  term_id: string;
  total_amount: number;
  amount_paid: number;
  balance: number | null;
  due_date: string | null;
  status: string;
  academic_terms?: {
    name: string;
    year: number;
  };
}

interface FeePayment {
  id: string;
  amount: number;
  payment_date: string | null;
  payment_method: string | null;
  receipt_number: string | null;
}

interface ReportCard {
  id: string;
  student_id: string;
  term_id: string;
  total_score: number | null;
  average_score: number | null;
  class_rank: number | null;
  total_students_in_class: number | null;
  status: string | null;
  academic_terms?: {
    name: string;
    year: number;
  };
}

interface ParentIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  response: string | null;
  created_at: string;
  student_id: string;
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "normal",
  });

  // Check auth and get parent data with tenant info
  const { data: parentData, isLoading: parentLoading } = useQuery({
    queryKey: ["parent-data"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/parent");
        return null;
      }

      const { data: parent, error } = await supabase
        .from("parents")
        .select("*, tenants(business_type, name)")
        .eq("user_id", user.id)
        .single();

      if (error || !parent) {
        toast.error("Parent account not found");
        navigate("/parent");
        return null;
      }

      return parent as typeof parent & { tenants?: { business_type: string; name: string } };
    },
  });

  // Determine school type for conditional rendering
  const schoolType = parentData?.tenants?.business_type || "primary_school";
  const isECD = schoolType === "kindergarten" || schoolType === "ecd";
  const isSecondary = schoolType === "secondary_school";
  const isPrimary = !isECD && !isSecondary;

  // Fetch linked students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["parent-students", parentData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_students")
        .select(`
          student_id,
          relationship,
          students (
            id,
            full_name,
            admission_number,
            school_classes (name)
          )
        `)
        .eq("parent_id", parentData?.id);

      if (error) throw error;
      // Filter out null students (e.g., if a student was deleted but the link remains)
      return data?.map(ps => ps.students as unknown as Student).filter(Boolean) || [];
    },
    enabled: !!parentData?.id,
  });

  // Set first student as selected by default
  useEffect(() => {
    if (students.length > 0 && students[0]?.id && !selectedStudent) {
      setSelectedStudent(students[0].id);
    }
  }, [students, selectedStudent]);

  // Enable parent notifications with realtime updates
  const { 
    notifications, 
    unreadCount, 
    isLoading: notificationsLoading, 
    markAsRead, 
    markAllAsRead 
  } = useParentNotifications(parentData?.id);

  // Calculate week dates
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + weekOffset * 7);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5);

  // Fetch attendance for selected student
  const { data: attendance = [] } = useQuery({
    queryKey: ["student-attendance", selectedStudent, weekOffset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gate_checkins")
        .select("*")
        .eq("student_id", selectedStudent)
        .gte("checked_at", weekStart.toISOString())
        .lte("checked_at", weekEnd.toISOString())
        .order("checked_at", { ascending: true });

      if (error) throw error;
      return data as CheckinRecord[];
    },
    enabled: !!selectedStudent,
  });

  // Fetch recent checkins
  const { data: recentCheckins = [] } = useQuery({
    queryKey: ["student-recent-checkins", selectedStudent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gate_checkins")
        .select("*")
        .eq("student_id", selectedStudent)
        .order("checked_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as CheckinRecord[];
    },
    enabled: !!selectedStudent,
  });

  // Fetch student fees
  const { data: studentFees = [] } = useQuery({
    queryKey: ["student-fees", selectedStudent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_fees")
        .select(`
          *,
          academic_terms (name, year)
        `)
        .eq("student_id", selectedStudent)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StudentFee[];
    },
    enabled: !!selectedStudent,
  });

  // Fetch fee payments
  const { data: feePayments = [] } = useQuery({
    queryKey: ["fee-payments", selectedStudent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_payments")
        .select("*")
        .eq("student_id", selectedStudent)
        .order("payment_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as FeePayment[];
    },
    enabled: !!selectedStudent,
  });

  // Fetch report cards
  const { data: reportCards = [] } = useQuery({
    queryKey: ["report-cards", selectedStudent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_report_cards")
        .select(`
          *,
          academic_terms (name, year)
        `)
        .eq("student_id", selectedStudent)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ReportCard[];
    },
    enabled: !!selectedStudent,
  });

  // Fetch parent issues
  const { data: issues = [] } = useQuery({
    queryKey: ["parent-issues", parentData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_issues")
        .select("*")
        .eq("parent_id", parentData?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ParentIssue[];
    },
    enabled: !!parentData?.id,
  });

  // Create issue mutation
  const createIssueMutation = useMutation({
    mutationFn: async () => {
      if (!parentData?.id || !selectedStudent) throw new Error("Missing data");
      
      const { error } = await supabase
        .from("parent_issues")
        .insert({
          parent_id: parentData.id,
          student_id: selectedStudent,
          tenant_id: parentData.tenant_id,
          ...newIssue,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-issues"] });
      setIssueDialogOpen(false);
      setNewIssue({ title: "", description: "", category: "general", priority: "normal" });
      toast.success("Issue reported successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to report issue");
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/parent");
  };

  // Get attendance status for a specific day
  const getAttendanceForDay = (day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const dayCheckins = attendance.filter(a => {
      const checkinDate = new Date(a.checked_at);
      return checkinDate >= dayStart && checkinDate <= dayEnd;
    });

    const arrival = dayCheckins.find(c => c.check_type === "arrival");
    const departure = dayCheckins.find(c => c.check_type === "departure");
    
    if (!arrival) return null;
    return {
      present: true,
      isLate: arrival.is_late,
      arrivalTime: format(new Date(arrival.checked_at), "h:mm a"),
      departureTime: departure ? format(new Date(departure.checked_at), "h:mm a") : null,
    };
  };

  // Check for attendance alerts (student hasn't arrived by expected time)
  const checkAttendanceAlert = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // Only check Mon-Fri
    if (dayOfWeek === 0 || dayOfWeek === 6) return null;
    
    const todayAttendance = getAttendanceForDay(now);
    const hour = now.getHours();
    
    // If it's past 9 AM and no arrival recorded
    if (hour >= 9 && !todayAttendance?.present) {
      return "Your child has not checked in at school today";
    }
    
    return null;
  };

  const attendanceAlert = checkAttendanceAlert();

  // Calculate fee totals
  const totalBalance = studentFees.reduce((sum, fee) => sum + (fee.balance || 0), 0);
  const totalPaid = studentFees.reduce((sum, fee) => sum + (fee.amount_paid || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (parentLoading || studentsLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const selectedStudentData = students.find(s => s?.id === selectedStudent);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-primary rounded-lg flex-shrink-0">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm sm:text-base">Parent Portal</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Welcome, {parentData?.full_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationCenter 
              notifications={notifications}
              unreadCount={unreadCount}
              isLoading={notificationsLoading}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
            />
            <Button variant="outline" size="sm" onClick={handleLogout} className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3">
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6">
        {/* Red List Banner */}
        {selectedStudent && parentData?.tenant_id && (
          <RedListBanner 
            studentId={selectedStudent}
            tenantId={parentData.tenant_id}
            studentName={selectedStudentData?.full_name || "Your child"}
          />
        )}

        {/* Attendance Alert */}
        {attendanceAlert && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">{attendanceAlert}</p>
                  <p className="text-sm text-muted-foreground">
                    Please contact the school if this is unexpected.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Selector */}
        {students.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {students.map(student => (
              <Button
                key={student.id}
                variant={selectedStudent === student.id ? "default" : "outline"}
                onClick={() => setSelectedStudent(student.id)}
                className="flex-shrink-0"
              >
                <User className="h-4 w-4 mr-2" />
                {student.full_name}
              </Button>
            ))}
          </div>
        )}

        {students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Students Linked</h3>
              <p className="text-muted-foreground">
                Please contact your school to link your child(ren) to your account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Student Info Card */}
            <Card>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0">
                      <AvatarFallback className="text-lg sm:text-xl bg-primary text-primary-foreground">
                        {selectedStudentData?.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-2xl font-bold truncate">{selectedStudentData?.full_name}</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {selectedStudentData?.admission_number} • {selectedStudentData?.school_classes?.name}
                      </p>
                    </div>
                  </div>
                  {totalBalance > 0 && (
                    <Badge variant="destructive" className="text-xs sm:text-sm self-start sm:self-auto flex-shrink-0 mt-1 sm:mt-0">
                      Balance: {formatCurrency(totalBalance)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Exam Results Check Card - Only for secondary schools */}
            {isSecondary && <ExamResultsCard />}

            {/* Main Tabs - Different based on school type */}
            <Tabs defaultValue="attendance" className="space-y-4">
              <TabsList className={`grid w-full ${isECD ? 'grid-cols-5' : 'grid-cols-5'}`}>
                <TabsTrigger value="attendance" className="flex gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Attendance</span>
                </TabsTrigger>
                <TabsTrigger value="fees" className="flex gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline">Fees</span>
                </TabsTrigger>
                
                {/* ECD-specific: Progress tab instead of Performance */}
                {isECD ? (
                  <TabsTrigger value="ecd" className="flex gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span className="hidden sm:inline">Progress</span>
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="performance" className="flex gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">{isSecondary ? 'Grades' : 'Performance'}</span>
                  </TabsTrigger>
                )}

                {!isECD && (
                  <TabsTrigger value="exams" className="flex gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span className="hidden sm:inline">Exams</span>
                  </TabsTrigger>
                )}
                
                <TabsTrigger value="discipline" className="flex gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="hidden sm:inline">Discipline</span>
                </TabsTrigger>
                <TabsTrigger value="issues" className="flex gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Issues</span>
                </TabsTrigger>
              </TabsList>

              {/* Attendance Tab */}
              <TabsContent value="attendance" className="space-y-4">
                {/* Weekly Attendance View */}
                <Card>
                  <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                          Weekly Attendance
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 sm:h-9 sm:w-9"
                          onClick={() => setWeekOffset(weekOffset - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                          onClick={() => setWeekOffset(0)}
                          disabled={weekOffset === 0}
                        >
                          Today
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 sm:h-9 sm:w-9"
                          onClick={() => setWeekOffset(weekOffset + 1)}
                          disabled={weekOffset >= 0}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    <div className="grid grid-cols-5 gap-1 sm:gap-2">
                      {weekDays.map(day => {
                        const dayAttendance = getAttendanceForDay(day);
                        const isFuture = day > new Date();
                        
                        return (
                          <div
                            key={day.toISOString()}
                            className={`p-2 sm:p-4 rounded-lg text-center border ${
                              isToday(day) ? "ring-2 ring-primary" : ""
                            } ${
                              isFuture ? "bg-muted/50" :
                              dayAttendance?.present ? 
                                (dayAttendance.isLate ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200" : "bg-green-50 dark:bg-green-950 border-green-200") :
                                "bg-red-50 dark:bg-red-950 border-red-200"
                            }`}
                          >
                            <p className="text-xs sm:text-sm font-medium">{format(day, "EEE")}</p>
                            <p className="text-base sm:text-lg font-bold">{format(day, "d")}</p>
                            
                            {isFuture ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : dayAttendance?.present ? (
                              <div className="mt-1 sm:mt-2">
                                {dayAttendance.isLate ? (
                                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-yellow-600" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-green-600" />
                                )}
                                <p className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 leading-tight">In: {dayAttendance.arrivalTime}</p>
                                {dayAttendance.departureTime && (
                                  <p className="text-[10px] sm:text-xs leading-tight">Out: {dayAttendance.departureTime}</p>
                                )}
                              </div>
                            ) : (
                              <div className="mt-1 sm:mt-2">
                                <XCircle className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-red-500" />
                                <p className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 text-red-600">Absent</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex gap-2 sm:gap-4 mt-3 sm:mt-4 justify-center text-xs sm:text-sm flex-wrap">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                        <span>Present</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                        <span>Late</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                        <span>Absent</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader className="px-3 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    {/* Mobile-friendly card layout */}
                    <div className="sm:hidden space-y-3">
                      {recentCheckins.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground text-sm">
                          No attendance records yet
                        </p>
                      ) : (
                        recentCheckins.map(checkin => (
                          <div key={checkin.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {format(new Date(checkin.checked_at), "EEE, MMM d")}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {format(new Date(checkin.checked_at), "h:mm a")}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={checkin.check_type === "arrival" ? "default" : "secondary"} className="text-xs">
                                {checkin.check_type === "arrival" ? "In" : "Out"}
                              </Badge>
                              {checkin.is_late ? (
                                <Badge variant="destructive" className="text-xs">
                                  Late
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  On Time
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Desktop table layout */}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentCheckins.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No attendance records yet
                              </TableCell>
                            </TableRow>
                          ) : (
                            recentCheckins.map(checkin => (
                              <TableRow key={checkin.id}>
                                <TableCell>
                                  {format(new Date(checkin.checked_at), "EEE, MMM d")}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {format(new Date(checkin.checked_at), "h:mm a")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={checkin.check_type === "arrival" ? "default" : "secondary"}>
                                    {checkin.check_type === "arrival" ? "Arrival" : "Departure"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {checkin.is_late ? (
                                    <Badge variant="destructive">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Late
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-green-600">
                                      On Time
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fees Tab */}
              <TabsContent value="fees" className="space-y-4">
                {/* Fee Summary Cards */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                      <div className="text-center">
                        <p className="text-xs sm:text-sm text-muted-foreground">Total Paid</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={totalBalance > 0 ? "border-destructive" : ""}>
                    <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                      <div className="text-center">
                        <p className="text-xs sm:text-sm text-muted-foreground">Outstanding Balance</p>
                        <p className={`text-lg sm:text-2xl font-bold ${totalBalance > 0 ? "text-destructive" : "text-green-600"}`}>
                          {formatCurrency(totalBalance)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Fee Breakdown */}
                <Card>
                  <CardHeader className="px-3 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">Fee Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    {/* Mobile card view */}
                    <div className="sm:hidden space-y-3">
                      {studentFees.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground text-sm">
                          No fee records found
                        </p>
                      ) : (
                        studentFees.map(fee => (
                          <div key={fee.id} className="p-3 rounded-lg border bg-card space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{fee.academic_terms?.name} {fee.academic_terms?.year}</p>
                                <p className="text-xs text-muted-foreground">Term Fees</p>
                              </div>
                              <Badge variant={
                                fee.status === "paid" ? "default" :
                                fee.status === "partial" ? "secondary" : "destructive"
                              } className="text-xs">
                                {fee.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Total</p>
                                <p className="text-xs font-mono font-medium">{formatCurrency(fee.total_amount)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Paid</p>
                                <p className="text-xs font-mono font-medium text-green-600">{formatCurrency(fee.amount_paid)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Balance</p>
                                <p className="text-xs font-mono font-medium text-destructive">{formatCurrency(fee.balance || 0)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Desktop table view */}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fee Type</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentFees.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No fee records found
                              </TableCell>
                            </TableRow>
                          ) : (
                            studentFees.map(fee => (
                              <TableRow key={fee.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{fee.academic_terms?.name} {fee.academic_terms?.year}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Term Fees
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatCurrency(fee.total_amount)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-green-600">
                                  {formatCurrency(fee.amount_paid)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-destructive">
                                  {formatCurrency(fee.balance || 0)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    fee.status === "paid" ? "default" :
                                    fee.status === "partial" ? "secondary" : "destructive"
                                  }>
                                    {fee.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment History */}
                <Card>
                  <CardHeader className="px-3 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">Payment History</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    {/* Mobile card view */}
                    <div className="sm:hidden space-y-3">
                      {feePayments.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground text-sm">
                          No payment records found
                        </p>
                      ) : (
                        feePayments.map(payment => (
                          <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {format(new Date(payment.payment_date), "MMM d, yyyy")}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground font-mono">
                                  #{payment.receipt_number}
                                </p>
                                <Badge variant="outline" className="text-xs">{payment.payment_method}</Badge>
                              </div>
                            </div>
                            <p className="text-sm font-mono font-bold text-green-600">
                              {formatCurrency(payment.amount)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Desktop table view */}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Receipt #</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {feePayments.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No payment records found
                              </TableCell>
                            </TableRow>
                          ) : (
                            feePayments.map(payment => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  {format(new Date(payment.payment_date), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {payment.receipt_number}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{payment.payment_method}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Performance Tab - for Primary and Secondary schools only */}
              {!isECD && (
                <TabsContent value="performance" className="space-y-4">
                  <Card>
                    <CardHeader className="px-3 sm:px-6">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                        {isSecondary ? 'Academic Grades' : 'Report Cards'}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        View your child's academic performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-6">
                      {reportCards.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">No published report cards yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {reportCards.map(card => (
                            <Card key={card.id} className="hover:bg-muted/50 transition-colors">
                              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <h4 className="font-semibold text-sm sm:text-base truncate">
                                      {card.academic_terms?.name} {card.academic_terms?.year}
                                    </h4>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                      Position: {card.class_rank || '-'} of {card.total_students_in_class || '-'}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-xl sm:text-2xl font-bold">{card.average_score?.toFixed(1)}%</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">Average</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* ECD Tab - for kindergarten/ECD schools only */}
              {isECD && (
                <TabsContent value="ecd" className="space-y-4">
                  {selectedStudentData && parentData && (
                    <ECDParentView 
                      studentId={selectedStudentData.id} 
                      tenantId={parentData.tenant_id}
                      studentName={selectedStudentData.full_name}
                    />
                  )}
                </TabsContent>
              )}

              {/* Exam Results Tab */}
              {!isECD && (
                <TabsContent value="exams" className="space-y-4">
                  {selectedStudentData && (
                    <ExamResultsCard />
                  )}
                </TabsContent>
              )}

              {/* Discipline Tab */}
              <TabsContent value="discipline" className="space-y-4">
                {selectedStudentData && (
                  <DisciplineCasesView 
                    studentId={selectedStudentData.id} 
                    studentName={selectedStudentData.full_name} 
                  />
                )}
              </TabsContent>

              {/* Issues Tab */}
              <TabsContent value="issues" className="space-y-4">
                <Card>
                  <CardHeader className="px-3 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                          Report an Issue
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Communicate with the school about any concerns
                        </CardDescription>
                      </div>
                      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            New Issue
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Report an Issue</DialogTitle>
                            <DialogDescription>
                              Describe your concern and we'll get back to you soon.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-sm">Category</Label>
                                <Select
                                  value={newIssue.category}
                                  onValueChange={(v) => setNewIssue({ ...newIssue, category: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="academic">Academic</SelectItem>
                                    <SelectItem value="behavior">Behavior</SelectItem>
                                    <SelectItem value="health">Health</SelectItem>
                                    <SelectItem value="transport">Transport</SelectItem>
                                    <SelectItem value="fees">Fees</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Priority</Label>
                                <Select
                                  value={newIssue.priority}
                                  onValueChange={(v) => setNewIssue({ ...newIssue, priority: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Title</Label>
                              <Input
                                placeholder="Brief summary of the issue"
                                value={newIssue.title}
                                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Description</Label>
                              <Textarea
                                placeholder="Provide details about your concern..."
                                rows={4}
                                value={newIssue.description}
                                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                              />
                            </div>
                          </div>
                          <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setIssueDialogOpen(false)}
                              className="w-full sm:w-auto"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => createIssueMutation.mutate()}
                              disabled={!newIssue.title || !newIssue.description || createIssueMutation.isPending}
                              className="w-full sm:w-auto"
                            >
                              {createIssueMutation.isPending ? "Submitting..." : "Submit Issue"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    {issues.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">No issues reported yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {issues.map(issue => (
                          <Card key={issue.id}>
                            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <Badge variant="outline" className="text-xs">{issue.category}</Badge>
                                  <Badge variant={
                                    issue.priority === "urgent" ? "destructive" :
                                    issue.priority === "high" ? "default" : "secondary"
                                  } className="text-xs">
                                    {issue.priority}
                                  </Badge>
                                  <Badge variant={
                                    issue.status === "open" ? "outline" :
                                    issue.status === "resolved" ? "default" : "secondary"
                                  } className="text-xs">
                                    {issue.status}
                                  </Badge>
                                  <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">
                                    {format(new Date(issue.created_at), "MMM d, yyyy")}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm sm:text-base">{issue.title}</h4>
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {issue.description}
                                  </p>
                                </div>
                                {issue.response && (
                                  <div className="p-2 sm:p-3 bg-muted rounded-lg">
                                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">
                                      School Response:
                                    </p>
                                    <p className="text-xs sm:text-sm">{issue.response}</p>
                                  </div>
                                )}
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
          </>
        )}
      </main>
    </div>
  );
}
