import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  ClipboardCheck, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  Search,
  Save,
  Baby,
  Sun,
  Sparkles,
  Heart,
  Star,
  Cloud,
  Smile,
  Frown,
  Meh
} from "lucide-react";
import { cn } from "@/lib/utils";

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentAttendance {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
  students?: {
    id: string;
    full_name: string;
    admission_number: string;
  };
}

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  class_id: string;
  photo_url?: string;
}

const ECD_LEVELS = [
  { value: 'ecd1', label: 'Baby Class', emoji: '🍼', color: 'from-pink-400 to-rose-500' },
  { value: 'ecd2', label: 'Middle Class', emoji: '🌟', color: 'from-blue-400 to-cyan-500' },
  { value: 'ecd3', label: 'Top Class', emoji: '🎓', color: 'from-green-400 to-emerald-500' },
];

const Attendance = () => {
  const { data: tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceStatus>>({});
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isECD = tenant?.businessType === 'ecd' || tenant?.businessType === 'kindergarten';

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['school-classes', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from('school_classes')
        .select('id, name, grade, level')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .order('level');
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  // Fetch students for selected class
  const { data: students = [] } = useQuery({
    queryKey: ['class-students', tenant?.tenantId, selectedClassId],
    queryFn: async () => {
      if (!tenant?.tenantId || !selectedClassId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_number, class_id, photo_url')
        .eq('tenant_id', tenant.tenantId)
        .eq('class_id', selectedClassId)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!tenant?.tenantId && !!selectedClassId,
  });

  // Fetch existing attendance for selected class and date
  const { data: existingAttendance = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['class-attendance', tenant?.tenantId, selectedClassId, dateStr],
    queryFn: async () => {
      if (!tenant?.tenantId || !selectedClassId) return [];
      const { data, error } = await supabase
        .from('student_attendance')
        .select(`
          id, student_id, class_id, date, status, notes
        `)
        .eq('tenant_id', tenant.tenantId)
        .eq('class_id', selectedClassId)
        .eq('date', dateStr);
      if (error) throw error;
      return data as StudentAttendance[];
    },
    enabled: !!tenant?.tenantId && !!selectedClassId,
  });

  // Get attendance summary for today
  const { data: todaySummary } = useQuery({
    queryKey: ['attendance-summary', tenant?.tenantId, dateStr],
    queryFn: async () => {
      if (!tenant?.tenantId) return { present: 0, absent: 0, late: 0, total: 0 };
      const { data, error } = await supabase
        .from('student_attendance')
        .select('status')
        .eq('tenant_id', tenant.tenantId)
        .eq('date', dateStr);
      if (error) throw error;
      
      const present = data?.filter(a => a.status === 'present').length || 0;
      const absent = data?.filter(a => a.status === 'absent').length || 0;
      const late = data?.filter(a => a.status === 'late').length || 0;
      const excused = data?.filter(a => a.status === 'excused').length || 0;
      
      return { present, absent, late, excused, total: data?.length || 0 };
    },
    enabled: !!tenant?.tenantId,
  });

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async (records: { student_id: string; status: AttendanceStatus }[]) => {
      if (!tenant?.tenantId || !selectedClassId) throw new Error("Missing required data");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('student_attendance')
        .delete()
        .eq('tenant_id', tenant.tenantId)
        .eq('class_id', selectedClassId)
        .eq('date', dateStr);
      
      const inserts = records.map(r => ({
        tenant_id: tenant.tenantId,
        student_id: r.student_id,
        class_id: selectedClassId,
        date: dateStr,
        status: r.status,
        recorded_by: user?.id,
      }));
      
      const { error } = await supabase
        .from('student_attendance')
        .insert(inserts);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      setIsTakingAttendance(false);
      setAttendanceRecords({});
      toast({
        title: isECD ? "🎉 Attendance saved!" : "Attendance saved",
        description: `Attendance for ${format(selectedDate, "PPP")} has been recorded`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving attendance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startTakingAttendance = () => {
    const records: Record<string, AttendanceStatus> = {};
    
    existingAttendance.forEach(a => {
      records[a.student_id] = a.status as AttendanceStatus;
    });
    
    students.forEach(s => {
      if (!records[s.id]) {
        records[s.id] = 'present';
      }
    });
    
    setAttendanceRecords(records);
    setIsTakingAttendance(true);
  };

  const handleSaveAttendance = () => {
    const records = Object.entries(attendanceRecords).map(([student_id, status]) => ({
      student_id,
      status,
    }));
    saveAttendanceMutation.mutate(records);
  };

  const setAllStatus = (status: AttendanceStatus) => {
    const records: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      records[s.id] = status;
    });
    setAttendanceRecords(records);
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const attendanceMap = existingAttendance.reduce((acc, a) => {
    acc[a.student_id] = a;
    return acc;
  }, {} as Record<string, StudentAttendance>);

  // ECD-themed render
  if (isECD) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FFE4EC 0%, #E0F7FA 100%)' }}>
        <div className="container mx-auto px-4 py-8">
          {/* Playful Header - matching ID card colors */}
          <div className="mb-8 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)' }}>
                    <ClipboardCheck className="h-8 w-8 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-2xl animate-pulse">🌟</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: '#FF6B9D' }}>
                    Daily Attendance 📋
                  </h1>
                  <p className="flex items-center gap-2" style={{ color: '#4ECDC4' }}>
                    <Sun className="h-4 w-4 text-yellow-500" />
                    Who's here today?
                  </p>
                </div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 opacity-20 pointer-events-none hidden lg:block text-6xl">
              🎈
            </div>
          </div>

          {/* Colorful Summary Cards - matching ID card theme */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="text-white border-0 shadow-lg overflow-hidden relative" style={{ background: '#4ECDC4', borderRadius: '16px', border: '3px solid #FF6B9D' }}>
              <div className="absolute top-0 right-0 opacity-30 text-5xl -mt-2 -mr-2">😊</div>
              <CardContent className="pt-4">
                <p className="text-3xl font-bold">{todaySummary?.present || 0}</p>
                <p className="text-sm opacity-90">Here Today! 🌟</p>
              </CardContent>
            </Card>

            <Card className="text-white border-0 shadow-lg overflow-hidden relative" style={{ background: '#FF6B9D', borderRadius: '16px', border: '3px solid #4ECDC4' }}>
              <div className="absolute top-0 right-0 opacity-30 text-5xl -mt-2 -mr-2">😢</div>
              <CardContent className="pt-4">
                <p className="text-3xl font-bold">{todaySummary?.absent || 0}</p>
                <p className="text-sm opacity-90">Missing Today</p>
              </CardContent>
            </Card>

            <Card className="text-white border-0 shadow-lg overflow-hidden relative" style={{ background: '#FFD93D', borderRadius: '16px', border: '3px solid #FF6B9D' }}>
              <div className="absolute top-0 right-0 opacity-30 text-5xl -mt-2 -mr-2">🏃</div>
              <CardContent className="pt-4" style={{ color: '#1e293b' }}>
                <p className="text-3xl font-bold">{todaySummary?.late || 0}</p>
                <p className="text-sm opacity-90">Running Late</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg overflow-hidden relative" style={{ background: 'white', borderRadius: '16px', border: '3px solid #4ECDC4' }}>
              <div className="absolute top-0 right-0 opacity-30 text-5xl -mt-2 -mr-2">⭐</div>
              <CardContent className="pt-4" style={{ color: '#1e293b' }}>
                <p className="text-3xl font-bold" style={{ color: '#FF6B9D' }}>{todaySummary?.total || 0}</p>
                <p className="text-sm opacity-90">Total Recorded</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters Card - matching ID card theme */}
          <Card className="mb-6 shadow-lg overflow-hidden relative" style={{ background: 'white', borderRadius: '16px', border: '3px solid #4ECDC4' }}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2" style={{ color: '#FF6B9D', fontWeight: 600 }}>
                    📅 Pick a Day
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        style={{ borderRadius: '10px', border: '2px solid #FF6B9D' }}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" style={{ color: '#FF6B9D' }} />
                        {format(selectedDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="flex items-center gap-2 mb-2" style={{ color: '#4ECDC4', fontWeight: 600 }}>
                    🎒 Choose Class
                  </Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger style={{ borderRadius: '10px', border: '2px solid #4ECDC4' }}>
                      <SelectValue placeholder="Pick a classroom..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => {
                        const ecdLevel = ECD_LEVELS.find(l => cls.level?.toLowerCase().includes(l.value.replace('ecd', '')));
                        return (
                          <SelectItem key={cls.id} value={cls.id}>
                            {ecdLevel?.emoji} {cls.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="flex items-center gap-2 mb-2" style={{ color: '#FF6B9D', fontWeight: 600 }}>
                    🔍 Find a Pupil
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#4ECDC4' }} />
                    <Input
                      placeholder="Type a name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                      style={{ borderRadius: '10px', border: '2px solid #4ECDC4' }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Area - matching ID card theme */}
          {selectedClassId ? (
            <Card className="shadow-lg overflow-hidden relative" style={{ background: 'white', borderRadius: '16px', border: '3px solid #FF6B9D' }}>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2" style={{ color: '#1e293b' }}>
                  🌈 {format(selectedDate, "EEEE, MMMM d")}
                </CardTitle>
                {!isTakingAttendance ? (
                  <Button 
                    onClick={startTakingAttendance} 
                    disabled={students.length === 0}
                    className="shadow-lg text-white"
                    style={{ background: '#4ECDC4', borderRadius: '10px' }}
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Take Attendance ✨
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      style={{ borderColor: '#4ECDC4', color: '#4ECDC4', borderRadius: '10px' }}
                      onClick={() => setAllStatus('present')}
                    >
                      😊 All Here
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      style={{ borderColor: '#FF6B9D', color: '#FF6B9D', borderRadius: '10px' }}
                      onClick={() => setAllStatus('absent')}
                    >
                      😢 All Away
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsTakingAttendance(false);
                        setAttendanceRecords({});
                      }}
                      style={{ borderRadius: '10px' }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveAttendance}
                      disabled={saveAttendanceMutation.isPending}
                      className="text-white shadow-lg"
                      style={{ background: '#FF6B9D', borderRadius: '10px' }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save 🎉
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👶</div>
                    <p className="text-lg" style={{ color: '#FF6B9D' }}>No little ones in this class yet!</p>
                    <p className="text-sm" style={{ color: '#4ECDC4' }}>Enroll pupils to start taking attendance</p>
                  </div>
                ) : isTakingAttendance ? (
                  // Card-based attendance for ECD - matching ID card style
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredStudents.map((student) => {
                      const status = attendanceRecords[student.id];
                      return (
                        <div
                          key={student.id}
                          className="relative p-4 transition-all duration-200"
                          style={{
                            borderRadius: '16px',
                            border: `3px solid ${status === 'present' ? '#4ECDC4' : status === 'absent' ? '#FF6B9D' : status === 'late' ? '#FFD93D' : '#ccc'}`,
                            background: status === 'present' ? '#E0F7FA' : status === 'absent' ? '#FFE4EC' : status === 'late' ? '#FFF9E0' : '#f9f9f9',
                          }}
                        >
                          <div className="text-center mb-3">
                            {student.photo_url ? (
                              <img 
                                src={student.photo_url} 
                                alt="" 
                                className="w-16 h-16 rounded-full mx-auto object-cover shadow-md"
                                style={{ border: '3px solid #4ECDC4' }}
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)' }}>
                                <span className="text-2xl">👶</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium text-center truncate" style={{ color: '#1e293b' }}>{student.full_name}</p>
                          
                          {/* Status buttons - matching ID card colors */}
                          <div className="flex justify-center gap-1 mt-3">
                            <button
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                              style={{
                                background: status === 'present' ? '#4ECDC4' : '#f0f0f0',
                                transform: status === 'present' ? 'scale(1.1)' : 'scale(1)',
                                boxShadow: status === 'present' ? '0 2px 8px rgba(78,205,196,0.4)' : 'none',
                              }}
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: 'present' }))}
                              title="Present"
                            >
                              😊
                            </button>
                            <button
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                              style={{
                                background: status === 'absent' ? '#FF6B9D' : '#f0f0f0',
                                transform: status === 'absent' ? 'scale(1.1)' : 'scale(1)',
                                boxShadow: status === 'absent' ? '0 2px 8px rgba(255,107,157,0.4)' : 'none',
                              }}
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: 'absent' }))}
                              title="Absent"
                            >
                              😢
                            </button>
                            <button
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                              style={{
                                background: status === 'late' ? '#FFD93D' : '#f0f0f0',
                                transform: status === 'late' ? 'scale(1.1)' : 'scale(1)',
                                boxShadow: status === 'late' ? '0 2px 8px rgba(255,217,61,0.4)' : 'none',
                              }}
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: 'late' }))}
                              title="Late"
                            >
                              🏃
                            </button>
                            <button
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                              style={{
                                background: status === 'excused' ? '#B19CD9' : '#f0f0f0',
                                transform: status === 'excused' ? 'scale(1.1)' : 'scale(1)',
                                boxShadow: status === 'excused' ? '0 2px 8px rgba(177,156,217,0.4)' : 'none',
                              }}
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: 'excused' }))}
                              title="Excused"
                            >
                              🏠
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // View-only grid for ECD - matching ID card style
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredStudents.map((student) => {
                      const attendance = attendanceMap[student.id];
                      const status = attendance?.status;
                      return (
                        <div
                          key={student.id}
                          className="p-4"
                          style={{
                            borderRadius: '16px',
                            border: `3px solid ${status === 'present' ? '#4ECDC4' : status === 'absent' ? '#FF6B9D' : status === 'late' ? '#FFD93D' : '#ddd'}`,
                            background: status === 'present' ? '#E0F7FA' : status === 'absent' ? '#FFE4EC' : status === 'late' ? '#FFF9E0' : '#f9f9f9',
                          }}
                        >
                          <div className="text-center mb-2">
                            {student.photo_url ? (
                              <img 
                                src={student.photo_url} 
                                alt="" 
                                className="w-14 h-14 rounded-full mx-auto object-cover shadow-md"
                                style={{ border: '2px solid #FF6B9D' }}
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)' }}>
                                <span className="text-xl">👶</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium text-center truncate" style={{ color: '#1e293b' }}>{student.full_name}</p>
                          <div className="text-center mt-2">
                            {status === 'present' && <span className="text-lg">😊</span>}
                            {status === 'absent' && <span className="text-lg">😢</span>}
                            {status === 'late' && <span className="text-lg">🏃</span>}
                            {status === 'excused' && <span className="text-lg">🏠</span>}
                            {!status && <span className="text-sm" style={{ color: '#999' }}>Not recorded</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg" style={{ background: 'white', borderRadius: '16px', border: '3px solid #4ECDC4' }}>
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)' }}>
                  <span className="text-4xl">👶</span>
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#FF6B9D' }}>Choose a Classroom! 🎒</h3>
                <p style={{ color: '#4ECDC4' }}>Pick a class above to see and record attendance</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Standard school render (non-ECD)
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-success text-success-foreground">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge className="bg-amber-500 text-white">Late</Badge>;
      case 'excused':
        return <Badge variant="secondary">Excused</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-8 w-8" />
          Student Attendance
        </h1>
        <p className="text-muted-foreground">Track and manage daily student attendance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{todaySummary?.present || 0}</p>
                <p className="text-xs text-muted-foreground">Present Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{todaySummary?.absent || 0}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{todaySummary?.late || 0}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{todaySummary?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total Recorded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.level} - {cls.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or admission number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      {selectedClassId ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Attendance for {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
            {!isTakingAttendance ? (
              <Button onClick={startTakingAttendance} disabled={students.length === 0}>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Take Attendance
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAllStatus('present')}
                >
                  All Present
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAllStatus('absent')}
                >
                  All Absent
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsTakingAttendance(false);
                    setAttendanceRecords({});
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveAttendance}
                  disabled={saveAttendanceMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Attendance
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No students enrolled in this class
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono">
                        {student.admission_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.full_name}
                      </TableCell>
                      <TableCell className="text-center">
                        {isTakingAttendance ? (
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant={attendanceRecords[student.id] === 'present' ? 'default' : 'outline'}
                              className={cn(
                                attendanceRecords[student.id] === 'present' && "bg-success hover:bg-success/90"
                              )}
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: 'present' }))}
                            >
                              P
                            </Button>
                            <Button
                              size="sm"
                              variant={attendanceRecords[student.id] === 'absent' ? 'destructive' : 'outline'}
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: 'absent' }))}
                            >
                              A
                            </Button>
                            <Button
                              size="sm"
                              variant={attendanceRecords[student.id] === 'late' ? 'default' : 'outline'}
                              className={cn(
                                attendanceRecords[student.id] === 'late' && "bg-amber-500 hover:bg-amber-600"
                              )}
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: 'late' }))}
                            >
                              L
                            </Button>
                            <Button
                              size="sm"
                              variant={attendanceRecords[student.id] === 'excused' ? 'secondary' : 'outline'}
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [student.id]: 'excused' }))}
                            >
                              E
                            </Button>
                          </div>
                        ) : (
                          attendanceMap[student.id] 
                            ? getStatusBadge(attendanceMap[student.id].status)
                            : <span className="text-muted-foreground text-sm">Not recorded</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Please select a class to view or record attendance</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Attendance;
