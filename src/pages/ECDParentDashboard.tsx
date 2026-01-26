import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from "date-fns";
import {
  LogOut,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Bell,
  Plus,
  Star,
  Heart,
  Sparkles,
  Award,
  ShieldCheck,
  Sun,
  Cloud,
  Rainbow,
  Palette,
  Music,
  BookHeart,
} from "lucide-react";
import { toast } from "sonner";
import ECDReportCardPreview from "@/components/ecd/ECDReportCardPreview";
import { NotificationCenter } from "@/components/parent/NotificationCenter";
import { useParentNotifications } from "@/hooks/use-parent-notifications";

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  photo_url?: string;
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

interface ECDReportCard {
  id: string;
  student_id: string;
  term_id: string;
  average_score: number | null;
  class_rank: number | null;
  status: string | null;
  teacher_comment: string | null;
  academic_terms?: {
    name: string;
    year: number;
  };
  school_classes?: {
    name: string;
  };
}

interface StudentRole {
  id: string;
  role_id: string;
  ecd_class_roles: {
    name: string;
    badge_icon: string | null;
    description: string | null;
  };
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

export default function ECDParentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "normal",
  });

  const { data: parentData, isLoading: parentLoading } = useQuery({
    queryKey: ["ecd-parent-data"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/ecd-parent");
        return null;
      }

      const { data: parent, error } = await supabase
        .from("parents")
        .select("*, tenants(business_type, name, logo_url)")
        .eq("user_id", user.id)
        .single();

      if (error || !parent) {
        toast.error("Parent account not found");
        navigate("/ecd-parent");
        return null;
      }

      return parent as typeof parent & { tenants?: { business_type: string; name: string; logo_url: string | null } };
    },
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["ecd-parent-students", parentData?.id],
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
            photo_url,
            school_classes (name)
          )
        `)
        .eq("parent_id", parentData?.id);

      if (error) throw error;
      return data?.map(ps => ps.students as unknown as Student).filter(Boolean) || [];
    },
    enabled: !!parentData?.id,
  });

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

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + weekOffset * 7);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5);

  const { data: attendance = [] } = useQuery({
    queryKey: ["ecd-student-attendance", selectedStudent, weekOffset],
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

  const { data: ecdReportCards = [] } = useQuery({
    queryKey: ["ecd-report-cards", selectedStudent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecd_report_cards")
        .select(`*, academic_terms (name, year), school_classes (name)`)
        .eq("student_id", selectedStudent)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ECDReportCard[];
    },
    enabled: !!selectedStudent,
  });

  const { data: studentRoles = [] } = useQuery({
    queryKey: ["ecd-student-roles", selectedStudent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecd_student_roles")
        .select(`*, ecd_class_roles (name, badge_icon, description), academic_terms (name, year)`)
        .eq("student_id", selectedStudent)
        .eq("is_active", true);
      if (error) throw error;
      return data as StudentRole[];
    },
    enabled: !!selectedStudent,
  });

  const { data: pickupLogs = [] } = useQuery({
    queryKey: ["ecd-pickup-logs", selectedStudent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gate_checkins")
        .select("*")
        .eq("student_id", selectedStudent)
        .eq("check_type", "departure")
        .order("checked_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedStudent,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["ecd-parent-issues", parentData?.id],
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
      queryClient.invalidateQueries({ queryKey: ["ecd-parent-issues"] });
      setIssueDialogOpen(false);
      setNewIssue({ title: "", description: "", category: "general", priority: "normal" });
      toast.success("Message sent to school! 💌");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/ecd-parent");
  };

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

  const checkAttendanceAlert = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return null;
    const todayAttendance = getAttendanceForDay(now);
    const hour = now.getHours();
    if (hour >= 9 && !todayAttendance?.present) {
      return "Your little one hasn't checked in at school today";
    }
    return null;
  };

  const attendanceAlert = checkAttendanceAlert();

  if (parentLoading || studentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  const selectedStudentData = students.find(s => s?.id === selectedStudent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 relative">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Sun className="absolute top-4 right-8 h-12 w-12 text-yellow-300 opacity-40" />
        <Cloud className="absolute top-16 left-12 h-10 w-10 text-sky-200 opacity-50" />
        <Star className="absolute top-24 right-1/4 h-4 w-4 text-yellow-400 opacity-60" />
        <Heart className="absolute bottom-20 left-8 h-5 w-5 text-rose-300 opacity-40" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-rose-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {parentData?.tenants?.logo_url ? (
              <img 
                src={parentData.tenants.logo_url} 
                alt={parentData.tenants.name}
                className="h-10 w-10 rounded-2xl object-cover shadow-md"
              />
            ) : (
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-md">
                <span className="text-xl">🏫</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-sm bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent truncate">
                {parentData?.tenants?.name || "Little Ones Portal"}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                Hi, {parentData?.full_name?.split(' ')[0]}! 👋
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter 
              notifications={notifications}
              unreadCount={unreadCount}
              isLoading={notificationsLoading}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              className="flex-shrink-0 rounded-xl border-rose-200 hover:bg-rose-50 text-rose-600"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Bye!</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Attendance Alert */}
        {attendanceAlert && (
          <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl shadow-lg">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-orange-100 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-orange-700">{attendanceAlert}</p>
                  <p className="text-sm text-orange-600/80">
                    Please contact the school if this is unexpected 📞
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Child Selector */}
        {students.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {students.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all duration-200 flex-shrink-0 ${
                  selectedStudent === student.id
                    ? "border-rose-400 bg-gradient-to-r from-rose-50 to-pink-50 shadow-lg scale-105"
                    : "border-gray-200 bg-white hover:border-rose-200 hover:bg-rose-50/50"
                }`}
              >
                <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                  <AvatarImage src={student.photo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-rose-500 text-white font-bold">
                    {student.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{student.full_name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}

        {students.length === 0 ? (
          <Card className="rounded-3xl border-2 border-dashed border-rose-200 bg-white/60">
            <CardContent className="py-16 text-center">
              <div className="h-20 w-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                <span className="text-4xl">👶</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-rose-800">No Little Ones Linked Yet</h3>
              <p className="text-muted-foreground">
                Ask your child's teacher to link them to your account! 💝
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Child Profile Card */}
            <Card className="rounded-3xl border-2 border-rose-100 bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden">
              <div className="h-3 bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400" />
              <CardContent className="pt-6 pb-4 px-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-4 border-white shadow-xl">
                    <AvatarImage src={selectedStudentData?.photo_url} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-pink-400 to-rose-500 text-white font-bold">
                      {selectedStudentData?.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold truncate bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
                      {selectedStudentData?.full_name}
                    </h2>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      {selectedStudentData?.school_classes?.name || "Little Learner"}
                    </p>
                    {studentRoles.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {studentRoles.slice(0, 2).map(role => (
                          <Badge key={role.id} className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 rounded-full px-3">
                            {role.ecd_class_roles?.badge_icon || '🏅'} {role.ecd_class_roles?.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="attendance" className="space-y-4">
              <TabsList className="grid grid-cols-4 h-auto p-1 rounded-2xl bg-white/60 backdrop-blur-sm border-2 border-rose-100 shadow-lg">
                <TabsTrigger value="attendance" className="rounded-xl py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-sky-400 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
                  <Calendar className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Attendance</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="rounded-xl py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-400 data-[state=active]:to-rose-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
                  <Award className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Progress</span>
                </TabsTrigger>
                <TabsTrigger value="pickup" className="rounded-xl py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-400 data-[state=active]:to-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
                  <ShieldCheck className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Pickup</span>
                </TabsTrigger>
                <TabsTrigger value="messages" className="rounded-xl py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-400 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
                  <MessageSquare className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Messages</span>
                </TabsTrigger>
              </TabsList>

              {/* Attendance Tab */}
              <TabsContent value="attendance" className="space-y-4">
                <Card className="rounded-3xl border-2 border-sky-100 bg-white/80 shadow-lg overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-sky-400 to-blue-500" />
                  <CardHeader className="px-6 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-sky-700">
                          <Calendar className="h-5 w-5" />
                          This Week at School
                        </CardTitle>
                        <CardDescription>
                          {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-xl border-sky-200 hover:bg-sky-50"
                          onClick={() => setWeekOffset(weekOffset - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 rounded-xl border-sky-200 hover:bg-sky-50"
                          onClick={() => setWeekOffset(0)}
                          disabled={weekOffset === 0}
                        >
                          Today
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-xl border-sky-200 hover:bg-sky-50"
                          onClick={() => setWeekOffset(weekOffset + 1)}
                          disabled={weekOffset >= 0}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-6">
                    <div className="grid grid-cols-5 gap-2">
                      {weekDays.map(day => {
                        const dayAttendance = getAttendanceForDay(day);
                        const isFuture = day > new Date();
                        
                        return (
                          <div
                            key={day.toISOString()}
                            className={`p-3 rounded-2xl text-center border-2 transition-all ${
                              isToday(day) ? "ring-2 ring-sky-400 ring-offset-2" : ""
                            } ${
                              isFuture ? "bg-gray-50 border-gray-100" :
                              dayAttendance?.present ? 
                                (dayAttendance.isLate 
                                  ? "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200" 
                                  : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200") 
                                : "bg-gradient-to-br from-red-50 to-rose-50 border-red-200"
                            }`}
                          >
                            <p className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</p>
                            <p className="text-xl font-bold">{format(day, "d")}</p>
                            
                            {isFuture ? (
                              <span className="text-2xl opacity-30">📅</span>
                            ) : dayAttendance?.present ? (
                              <div className="mt-1">
                                <span className="text-2xl">{dayAttendance.isLate ? "⏰" : "✅"}</span>
                                <p className="text-[10px] mt-1 font-medium">{dayAttendance.arrivalTime}</p>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <span className="text-2xl">😴</span>
                                <p className="text-[10px] mt-1 text-red-500 font-medium">Absent</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex gap-4 mt-4 justify-center text-sm">
                      <div className="flex items-center gap-1"><span>✅</span> Present</div>
                      <div className="flex items-center gap-1"><span>⏰</span> Late</div>
                      <div className="flex items-center gap-1"><span>😴</span> Absent</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-4">
                <Card className="rounded-3xl border-2 border-rose-100 bg-white/80 shadow-lg overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-pink-400 to-rose-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-rose-700">
                      <Award className="h-5 w-5" />
                      Progress Reports
                    </CardTitle>
                    <CardDescription>See how your little one is growing! 🌱</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ecdReportCards.length === 0 ? (
                      <div className="text-center py-12">
                        <span className="text-6xl">📝</span>
                        <p className="text-muted-foreground mt-4">No reports yet - coming soon!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ecdReportCards.map(report => (
                          <Card 
                            key={report.id} 
                            className="cursor-pointer hover:shadow-lg transition-all rounded-2xl border-rose-100 hover:border-rose-300" 
                            onClick={() => { setSelectedReportId(report.id); setShowReportDialog(true); }}
                          >
                            <CardContent className="py-4 px-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                                    <BookHeart className="h-6 w-6 text-rose-500" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold">{report.academic_terms?.name} {report.academic_terms?.year}</h4>
                                    <p className="text-xs text-muted-foreground">{report.school_classes?.name}</p>
                                  </div>
                                </div>
                                <Badge className="bg-gradient-to-r from-pink-400 to-rose-400 text-white border-0 rounded-full">
                                  View 📖
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Roles Card */}
                {studentRoles.length > 0 && (
                  <Card className="rounded-3xl border-2 border-yellow-100 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-yellow-400 to-orange-400" />
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-yellow-700">
                        <Star className="h-5 w-5" />
                        Special Roles
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {studentRoles.map(role => (
                          <div key={role.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 border-2 border-yellow-100">
                            <span className="text-4xl">{role.ecd_class_roles?.badge_icon || '🏅'}</span>
                            <div className="flex-1">
                              <h4 className="font-bold text-yellow-800">{role.ecd_class_roles?.name}</h4>
                              <p className="text-sm text-yellow-600">{role.academic_terms?.name}</p>
                            </div>
                            <Badge className="bg-yellow-500 text-white border-0 rounded-full">Active ⭐</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Pickup Tab */}
              <TabsContent value="pickup">
                <Card className="rounded-3xl border-2 border-green-100 bg-white/80 shadow-lg overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-500" />
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <ShieldCheck className="h-5 w-5" />
                      Pickup History
                    </CardTitle>
                    <CardDescription>Safe pickups logged here 🚗</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pickupLogs.length === 0 ? (
                      <div className="text-center py-12">
                        <span className="text-6xl">🚗</span>
                        <p className="text-muted-foreground mt-4">No pickup records yet</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {pickupLogs.map(log => (
                            <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">🏠</span>
                                <p className="font-medium">{format(new Date(log.checked_at), "EEE, MMM d, yyyy")}</p>
                              </div>
                              <Badge variant="outline" className="rounded-full border-green-300 text-green-700 font-mono">
                                {format(new Date(log.checked_at), "h:mm a")}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages" className="space-y-4">
                <Card className="rounded-3xl border-2 border-purple-100 bg-white/80 shadow-lg overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-purple-400 to-violet-500" />
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                          <MessageSquare className="h-5 w-5" />
                          Messages to School
                        </CardTitle>
                        <CardDescription>Questions or concerns? Let us know! 💬</CardDescription>
                      </div>
                      <Button 
                        onClick={() => setIssueDialogOpen(true)}
                        className="rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Message
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {issues.length === 0 ? (
                      <div className="text-center py-12">
                        <span className="text-6xl">💌</span>
                        <p className="text-muted-foreground mt-4">No messages yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {issues.map(issue => (
                          <Card key={issue.id} className="rounded-2xl border-purple-100">
                            <CardContent className="py-4 px-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <h4 className="font-bold">{issue.title}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {format(new Date(issue.created_at), "MMM d, yyyy")}
                                  </p>
                                  {issue.response && (
                                    <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-100">
                                      <p className="text-xs font-medium text-purple-700 mb-1">School's Response:</p>
                                      <p className="text-sm">{issue.response}</p>
                                    </div>
                                  )}
                                </div>
                                <Badge 
                                  className={`rounded-full ${
                                    issue.status === "resolved" 
                                      ? "bg-green-100 text-green-700" 
                                      : issue.status === "in_progress"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {issue.status === "resolved" ? "✅ Done" : issue.status === "in_progress" ? "⏳ Working" : "📬 Sent"}
                                </Badge>
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

      {/* New Issue Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              Send a Message to School
            </DialogTitle>
            <DialogDescription>
              Questions, feedback, or concerns - we're here to help! 💜
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="What's this about?"
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newIssue.category}
                onValueChange={(value) => setNewIssue({ ...newIssue, category: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">💬 General Question</SelectItem>
                  <SelectItem value="health">🏥 Health Concern</SelectItem>
                  <SelectItem value="behavior">🌟 Behavior</SelectItem>
                  <SelectItem value="academic">📚 Learning</SelectItem>
                  <SelectItem value="other">🎯 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Your Message</Label>
              <Textarea
                placeholder="Tell us more..."
                value={newIssue.description}
                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                rows={4}
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIssueDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => createIssueMutation.mutate()}
              disabled={!newIssue.title || !newIssue.description || createIssueMutation.isPending}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-violet-500"
            >
              {createIssueMutation.isPending ? "Sending..." : "Send Message 💌"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Card Preview Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookHeart className="h-5 w-5 text-rose-500" />
              Progress Report Card
            </DialogTitle>
          </DialogHeader>
          {selectedReportId && <ECDReportCardPreview reportCardId={selectedReportId} onClose={() => setShowReportDialog(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
