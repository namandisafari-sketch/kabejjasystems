import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { handleGateScan, parseQRCode } from "@/hooks/use-qr-scan-logic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  ScanLine, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldAlert,
  Check,
  X,
  Lock,
  Baby,
  Sun
} from "lucide-react";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  class_id: string;
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
  notes: string | null;
  students: {
    id: string;
    full_name: string;
    admission_number: string;
    school_classes: { name: string } | null;
  } | null;
}

interface EarlyDepartureRequest {
  id: string;
  student_id: string;
  reason: string;
  status: string;
  requested_at: string;
  approved_at: string | null;
  students: {
    full_name: string;
    admission_number: string;
    school_classes: { name: string } | null;
  };
}

export default function GateCheckin() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const isECD = tenantData?.businessType === 'ecd' || tenantData?.businessType === 'kindergarten';
  const queryClient = useQueryClient();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [checkType, setCheckType] = useState<"arrival" | "departure">("arrival");
  const [lastScanned, setLastScanned] = useState<Student | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error" | "late">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Early departure dialog state
  const [showEarlyDepartureDialog, setShowEarlyDepartureDialog] = useState(false);
  const [earlyDepartureReason, setEarlyDepartureReason] = useState("");
  const [pendingStudent, setPendingStudent] = useState<Student | null>(null);

  // Check if current user is an administrator (can approve requests)
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
      
      if (error) return null;
      return data;
    },
  });

  // Administrators who can approve: tenant_owner, admin, superadmin
  const canApproveRequests = userProfile?.role && 
    ["tenant_owner", "admin", "superadmin"].includes(userProfile.role);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch today's check-ins
  const { data: todayCheckins = [] } = useQuery({
    queryKey: ["gate-checkins", tenantId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("gate_checkins")
        .select(`
          *,
          students (
            id,
            full_name,
            admission_number,
            school_classes (name)
          )
        `)
        .eq("tenant_id", tenantId)
        .gte("checked_at", today.toISOString())
        .order("checked_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CheckinRecord[];
    },
    enabled: !!tenantId,
    refetchInterval: 5000,
  });

  // Fetch pending early departure requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["early-departure-requests", tenantId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("early_departure_requests")
        .select(`
          *,
          students (
            full_name,
            admission_number,
            school_classes (name)
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .gte("requested_at", today.toISOString())
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return (data || []) as EarlyDepartureRequest[];
    },
    enabled: !!tenantId,
    refetchInterval: 5000,
  });

  // Get tenant settings
  const { data: tenantSettings } = useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("late_arrival_minutes, school_start_time, school_end_time, require_early_departure_reason")
        .eq("id", tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Check if current time is before school end time
  const isBeforeEndTime = () => {
    if (!tenantSettings?.school_end_time) return false;
    const now = new Date();
    const [hours, minutes] = tenantSettings.school_end_time.split(":");
    const endTime = new Date();
    endTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return now < endTime;
  };

  // Create early departure request
  const createEarlyDepartureMutation = useMutation({
    mutationFn: async ({ studentId, reason }: { studentId: string; reason: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("early_departure_requests")
        .insert({
          tenant_id: tenantId,
          student_id: studentId,
          reason: reason,
          requested_by: userData.user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Early departure request submitted for approval");
      queryClient.invalidateQueries({ queryKey: ["early-departure-requests"] });
      setShowEarlyDepartureDialog(false);
      setEarlyDepartureReason("");
      setPendingStudent(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Approve early departure
  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const request = pendingRequests.find(r => r.id === requestId);
      
      if (!request) throw new Error("Request not found");

      // Update request status
      const { error: updateError } = await supabase
        .from("early_departure_requests")
        .update({
          status: "approved",
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Record the departure
      const { data: checkinData, error: checkinError } = await supabase
        .from("gate_checkins")
        .insert({
          tenant_id: tenantId,
          student_id: request.student_id,
          check_type: "departure",
          is_late: false,
          notes: `Early departure: ${request.reason}`,
        })
        .select()
        .single();

      if (checkinError) throw checkinError;

      // Link the checkin to the request
      await supabase
        .from("early_departure_requests")
        .update({ gate_checkin_id: checkinData.id })
        .eq("id", requestId);
    },
    onSuccess: () => {
      toast.success("Early departure approved and student checked out");
      queryClient.invalidateQueries({ queryKey: ["early-departure-requests"] });
      queryClient.invalidateQueries({ queryKey: ["gate-checkins"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reject early departure
  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("early_departure_requests")
        .update({
          status: "rejected",
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Early departure request rejected");
      queryClient.invalidateQueries({ queryKey: ["early-departure-requests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (admissionNumber: string) => {
      // Find student by admission number
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          full_name,
          admission_number,
          class_id,
          school_classes (name)
        `)
        .eq("tenant_id", tenantId)
        .eq("admission_number", admissionNumber)
        .single();

      if (studentError || !student) {
        throw new Error("Student not found with this ID");
      }

      // Check if student is marked to be sent home (for arrivals)
      if (checkType === "arrival") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: sendHomeRecord } = await supabase
          .from("send_home_records")
          .select("id, reason, reason_category")
          .eq("student_id", student.id)
          .eq("is_active", true)
          .eq("gate_blocked", true)
          .gte("send_home_date", today.toISOString().split("T")[0])
          .maybeSingle();

        if (sendHomeRecord) {
          throw new Error(`BLOCKED: ${student.full_name} is not allowed to enter. Reason: ${sendHomeRecord.reason}`);
        }
      }

      // For departures, check if it's before end time
      if (checkType === "departure" && isBeforeEndTime() && tenantSettings?.require_early_departure_reason) {
        // Check if there's already an approved request for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: approvedRequest } = await supabase
          .from("early_departure_requests")
          .select("id")
          .eq("student_id", student.id)
          .eq("status", "approved")
          .gte("requested_at", today.toISOString())
          .maybeSingle();

        if (!approvedRequest) {
          // Need to request early departure
          setPendingStudent(student);
          setShowEarlyDepartureDialog(true);
          throw new Error("EARLY_DEPARTURE_REQUIRED");
        }
      }

      // Check if already checked in today (for arrivals)
      if (checkType === "arrival") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: existing } = await supabase
          .from("gate_checkins")
          .select("id")
          .eq("student_id", student.id)
          .eq("check_type", "arrival")
          .gte("checked_at", today.toISOString())
          .maybeSingle();

        if (existing) {
          throw new Error("Student already checked in today");
        }
      }

      // Determine if late
      let isLate = false;
      if (checkType === "arrival" && tenantSettings?.school_start_time) {
        const now = new Date();
        const [hours, minutes] = tenantSettings.school_start_time.split(":");
        const startTime = new Date();
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const lateThreshold = new Date(startTime.getTime() + (tenantSettings.late_arrival_minutes || 30) * 60000);
        isLate = now > lateThreshold;
      }

      // Record check-in
      const { error: checkinError } = await supabase
        .from("gate_checkins")
        .insert({
          tenant_id: tenantId,
          student_id: student.id,
          check_type: checkType,
          is_late: isLate,
        });

      if (checkinError) throw checkinError;

      return { student, isLate };
    },
    onSuccess: ({ student, isLate }) => {
      setLastScanned(student);
      setScanStatus(isLate ? "late" : "success");
      toast.success(
        `${student.full_name} checked ${checkType === "arrival" ? "in" : "out"}${isLate ? " (LATE)" : ""}`,
        { duration: 3000 }
      );
      queryClient.invalidateQueries({ queryKey: ["gate-checkins"] });
      
      setTimeout(() => {
        setScanStatus("idle");
        setLastScanned(null);
      }, 3000);
    },
    onError: (error: Error) => {
      if (error.message === "EARLY_DEPARTURE_REQUIRED") {
        // Don't show error toast, dialog will handle it
        return;
      }
      setScanStatus("error");
      toast.error(error.message);
      
      setTimeout(() => {
        setScanStatus("idle");
      }, 2000);
    },
    onSettled: () => {
      setBarcodeInput("");
      inputRef.current?.focus();
    },
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    checkinMutation.mutate(barcodeInput.trim());
  };

  const handleSubmitEarlyDeparture = () => {
    if (!pendingStudent || !earlyDepartureReason.trim()) {
      toast.error("Please provide a reason for early departure");
      return;
    }
    createEarlyDepartureMutation.mutate({
      studentId: pendingStudent.id,
      reason: earlyDepartureReason.trim(),
    });
  };

  // Calculate stats
  const arrivals = todayCheckins.filter(c => c.check_type === "arrival");
  const departures = todayCheckins.filter(c => c.check_type === "departure");
  const lateArrivals = arrivals.filter(c => c.is_late);

  // ECD-themed render
  if (isECD) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #FFE4EC 0%, #E0F7FA 100%)' }}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Playful Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)' }}>
                <ScanLine className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: '#FF6B9D' }}>
                  Gate Check-In 🚪
                </h1>
                <p className="flex items-center gap-2" style={{ color: '#4ECDC4' }}>
                  <Sun className="h-4 w-4 text-yellow-500" />
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <Select value={checkType} onValueChange={(v) => setCheckType(v as "arrival" | "departure")}>
              <SelectTrigger className="w-48" style={{ borderRadius: '10px', border: '2px solid #4ECDC4' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arrival">
                  <div className="flex items-center gap-2">
                    👋 Arriving
                  </div>
                </SelectItem>
                <SelectItem value="departure">
                  <div className="flex items-center gap-2">
                    🏠 Going Home
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards - ECD themed */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="border-0 shadow-lg" style={{ background: '#4ECDC4', borderRadius: '16px', border: '3px solid #FF6B9D' }}>
              <CardContent className="pt-4 text-white">
                <div className="text-3xl mb-1">👋</div>
                <p className="text-2xl font-bold">{arrivals.length}</p>
                <p className="text-sm opacity-90">Arrived</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg" style={{ background: '#FF6B9D', borderRadius: '16px', border: '3px solid #4ECDC4' }}>
              <CardContent className="pt-4 text-white">
                <div className="text-3xl mb-1">🏠</div>
                <p className="text-2xl font-bold">{departures.length}</p>
                <p className="text-sm opacity-90">Went Home</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg" style={{ background: '#FFD93D', borderRadius: '16px', border: '3px solid #FF6B9D' }}>
              <CardContent className="pt-4" style={{ color: '#1e293b' }}>
                <div className="text-3xl mb-1">🏃</div>
                <p className="text-2xl font-bold">{lateArrivals.length}</p>
                <p className="text-sm opacity-90">Late</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg" style={{ background: '#B19CD9', borderRadius: '16px', border: '3px solid #4ECDC4' }}>
              <CardContent className="pt-4 text-white">
                <div className="text-3xl mb-1">⏳</div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm opacity-90">Pending</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg" style={{ background: 'white', borderRadius: '16px', border: '3px solid #4ECDC4' }}>
              <CardContent className="pt-4" style={{ color: '#1e293b' }}>
                <div className="text-3xl mb-1">🌅</div>
                <p className="text-2xl font-bold" style={{ color: '#4ECDC4' }}>
                  {tenantSettings?.school_start_time?.slice(0, 5) || "08:00"}
                </p>
                <p className="text-sm text-muted-foreground">Start Time</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg" style={{ background: 'white', borderRadius: '16px', border: '3px solid #FF6B9D' }}>
              <CardContent className="pt-4" style={{ color: '#1e293b' }}>
                <div className="text-3xl mb-1">🌆</div>
                <p className="text-2xl font-bold" style={{ color: '#FF6B9D' }}>
                  {tenantSettings?.school_end_time?.slice(0, 5) || "16:00"}
                </p>
                <p className="text-sm text-muted-foreground">End Time</p>
              </CardContent>
            </Card>
          </div>

          {/* Scanner Section - ECD themed */}
          <Card 
            className="shadow-lg transition-all duration-300"
            style={{ 
              background: scanStatus === "success" ? '#E0F7FA' : 
                         scanStatus === "late" ? '#FFF9E0' : 
                         scanStatus === "error" ? '#FFE4EC' : 'white',
              borderRadius: '16px',
              border: `3px solid ${scanStatus === "success" ? '#4ECDC4' : 
                                   scanStatus === "late" ? '#FFD93D' : 
                                   scanStatus === "error" ? '#FF6B9D' : '#4ECDC4'}`
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#1e293b' }}>
                <span className="text-2xl">📱</span>
                Scan Pupil ID Card
                {checkType === "departure" && isBeforeEndTime() && (
                  <Badge className="ml-2" style={{ background: '#FFD93D', color: '#1e293b', borderRadius: '10px' }}>
                    🔔 Early pickup needs approval
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleScan} className="flex gap-4">
                <Input
                  ref={inputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan card or type admission number..."
                  className="text-2xl h-16 font-mono"
                  style={{ borderRadius: '12px', border: '2px solid #FF6B9D' }}
                  autoComplete="off"
                />
                <Button 
                  type="submit" 
                  size="lg" 
                  className="h-16 px-8 text-white shadow-lg"
                  style={{ background: checkType === "arrival" ? '#4ECDC4' : '#FF6B9D', borderRadius: '12px' }}
                  disabled={checkinMutation.isPending}
                >
                  {checkinMutation.isPending ? (
                    <span className="animate-pulse">Scanning...</span>
                  ) : (
                    <>
                      {checkType === "arrival" ? "👋 Check In" : "🏠 Check Out"}
                    </>
                  )}
                </Button>
              </form>

              {/* Scan Result Display - ECD themed */}
              {lastScanned && (
                <div 
                  className="p-6 rounded-2xl flex items-center gap-6"
                  style={{ 
                    background: scanStatus === "success" ? '#4ECDC4' : 
                               scanStatus === "late" ? '#FFD93D' : '#FF6B9D',
                    border: '3px solid white'
                  }}
                >
                  <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'white' }}>
                    <span className="text-4xl">
                      {scanStatus === "success" ? "😊" : scanStatus === "late" ? "🏃" : "😢"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold" style={{ color: scanStatus === "late" ? '#1e293b' : 'white' }}>
                      {lastScanned.full_name}
                    </h3>
                    <p className="text-lg" style={{ color: scanStatus === "late" ? '#666' : 'rgba(255,255,255,0.9)' }}>
                      {lastScanned.admission_number} • {lastScanned.school_classes?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {scanStatus === "late" && (
                      <Badge style={{ background: '#FF6B9D', color: 'white', borderRadius: '10px', padding: '8px 16px', fontSize: '14px' }}>
                        🏃 LATE
                      </Badge>
                    )}
                    <p className="text-lg mt-2" style={{ color: scanStatus === "late" ? '#1e293b' : 'white' }}>
                      {format(new Date(), "h:mm a")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Check-ins and Pending Approvals - ECD themed */}
          <Tabs defaultValue="checkins">
            <TabsList style={{ background: 'white', borderRadius: '12px', border: '2px solid #4ECDC4' }}>
              <TabsTrigger value="checkins" className="flex items-center gap-2 data-[state=active]:bg-[#4ECDC4] data-[state=active]:text-white rounded-lg">
                👶 Today's Check-ins
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2 data-[state=active]:bg-[#FF6B9D] data-[state=active]:text-white rounded-lg">
                ⏳ Pending Approvals
                {pendingRequests.length > 0 && (
                  <Badge style={{ background: '#FFD93D', color: '#1e293b', borderRadius: '10px' }}>{pendingRequests.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checkins">
              <Card className="shadow-lg" style={{ background: 'white', borderRadius: '16px', border: '3px solid #4ECDC4' }}>
                <CardContent className="pt-6">
                  {todayCheckins.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">👶</div>
                      <p className="text-lg" style={{ color: '#FF6B9D' }}>No check-ins yet today!</p>
                      <p style={{ color: '#4ECDC4' }}>Scan a pupil's ID card to start</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {todayCheckins.slice(0, 20).map((checkin) => (
                        <div
                          key={checkin.id}
                          className="p-4 text-center"
                          style={{
                            borderRadius: '16px',
                            border: `3px solid ${checkin.check_type === 'arrival' ? '#4ECDC4' : '#FF6B9D'}`,
                            background: checkin.is_late ? '#FFF9E0' : checkin.check_type === 'arrival' ? '#E0F7FA' : '#FFE4EC'
                          }}
                        >
                          <div className="text-3xl mb-2">
                            {checkin.check_type === 'arrival' ? '👋' : '🏠'}
                            {checkin.is_late && '🏃'}
                          </div>
                          <p className="font-medium text-sm truncate" style={{ color: '#1e293b' }}>
                            {checkin.students?.full_name}
                          </p>
                          <p className="text-xs" style={{ color: '#666' }}>
                            {format(new Date(checkin.checked_at), "h:mm a")}
                          </p>
                          {checkin.is_late && (
                            <Badge className="mt-2" style={{ background: '#FFD93D', color: '#1e293b', borderRadius: '8px', fontSize: '10px' }}>
                              Late
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending">
              <Card className="shadow-lg" style={{ background: 'white', borderRadius: '16px', border: '3px solid #FF6B9D' }}>
                <CardHeader>
                  <CardTitle style={{ color: '#FF6B9D' }}>⏳ Early Pickup Requests</CardTitle>
                  {!canApproveRequests && (
                    <CardDescription className="flex items-center gap-2" style={{ color: '#FFD93D' }}>
                      🔒 Only administrators can approve requests
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">✨</div>
                      <p className="text-lg" style={{ color: '#4ECDC4' }}>No pending requests!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="p-4 flex items-center justify-between gap-4"
                          style={{ borderRadius: '12px', border: '2px solid #FFD93D', background: '#FFF9E0' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)' }}>
                              <span className="text-xl">👶</span>
                            </div>
                            <div>
                              <p className="font-medium" style={{ color: '#1e293b' }}>{request.students?.full_name}</p>
                              <p className="text-sm" style={{ color: '#666' }}>{request.reason}</p>
                              <p className="text-xs" style={{ color: '#999' }}>{format(new Date(request.requested_at), "h:mm a")}</p>
                            </div>
                          </div>
                          {canApproveRequests && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="text-white"
                                style={{ background: '#4ECDC4', borderRadius: '8px' }}
                                onClick={() => approveRequestMutation.mutate(request.id)}
                                disabled={approveRequestMutation.isPending}
                              >
                                ✓ Approve
                              </Button>
                              <Button
                                size="sm"
                                className="text-white"
                                style={{ background: '#FF6B9D', borderRadius: '8px' }}
                                onClick={() => rejectRequestMutation.mutate(request.id)}
                                disabled={rejectRequestMutation.isPending}
                              >
                                ✗ Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Early Departure Request Dialog - ECD themed */}
        <Dialog open={showEarlyDepartureDialog} onOpenChange={setShowEarlyDepartureDialog}>
          <DialogContent style={{ borderRadius: '16px', border: '3px solid #4ECDC4' }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2" style={{ color: '#FF6B9D' }}>
                🔔 Early Pickup Request
              </DialogTitle>
              <DialogDescription>
                School ends at {tenantSettings?.school_end_time?.slice(0, 5) || "16:00"}. 
                Early pickup needs approval.
              </DialogDescription>
            </DialogHeader>
            
            {pendingStudent && (
              <div className="space-y-4">
                <div className="p-4 flex items-center gap-3" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #FFE4EC 0%, #E0F7FA 100%)', border: '2px solid #4ECDC4' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)' }}>
                    <span className="text-xl">👶</span>
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#1e293b' }}>{pendingStudent.full_name}</p>
                    <p className="text-sm" style={{ color: '#666' }}>
                      {pendingStudent.admission_number} • {pendingStudent.school_classes?.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" style={{ color: '#FF6B9D' }}>Reason for Early Pickup *</Label>
                  <Textarea
                    id="reason"
                    value={earlyDepartureReason}
                    onChange={(e) => setEarlyDepartureReason(e.target.value)}
                    placeholder="e.g., Doctor's appointment, Family event..."
                    rows={3}
                    style={{ borderRadius: '10px', border: '2px solid #4ECDC4' }}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEarlyDepartureDialog(false);
                  setEarlyDepartureReason("");
                  setPendingStudent(null);
                }}
                style={{ borderRadius: '10px' }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitEarlyDeparture}
                disabled={createEarlyDepartureMutation.isPending || !earlyDepartureReason.trim()}
                className="text-white"
                style={{ background: '#4ECDC4', borderRadius: '10px' }}
              >
                {createEarlyDepartureMutation.isPending ? "Submitting..." : "Submit Request 📝"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Standard school render
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gate Check-In</h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <Select value={checkType} onValueChange={(v) => setCheckType(v as "arrival" | "departure")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arrival">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-green-500" />
                  Arrival
                </div>
              </SelectItem>
              <SelectItem value="departure">
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-orange-500" />
                  Departure
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <ArrowDownCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Arrivals</p>
                  <p className="text-2xl font-bold">{arrivals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <ArrowUpCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Departures</p>
                  <p className="text-2xl font-bold">{departures.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Late</p>
                  <p className="text-2xl font-bold">{lateArrivals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <ShieldAlert className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <ArrowDownCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Time</p>
                  <p className="text-2xl font-bold">
                    {tenantSettings?.school_start_time?.slice(0, 5) || "08:00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Time</p>
                  <p className="text-2xl font-bold">
                    {tenantSettings?.school_end_time?.slice(0, 5) || "16:00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scanner Section */}
        <Card className={`transition-all duration-300 ${
          scanStatus === "success" ? "ring-4 ring-green-500 bg-green-50 dark:bg-green-950" :
          scanStatus === "late" ? "ring-4 ring-yellow-500 bg-yellow-50 dark:bg-yellow-950" :
          scanStatus === "error" ? "ring-4 ring-red-500 bg-red-50 dark:bg-red-950" :
          ""
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              Scan Student ID Card
              {checkType === "departure" && isBeforeEndTime() && (
                <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-600">
                  Early departure requires approval
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleScan} className="flex gap-4">
              <Input
                ref={inputRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode or enter admission number..."
                className="text-2xl h-16 font-mono"
                autoComplete="off"
              />
              <Button type="submit" size="lg" className="h-16 px-8" disabled={checkinMutation.isPending}>
                {checkinMutation.isPending ? (
                  <span className="animate-pulse">Scanning...</span>
                ) : (
                  <>
                    <UserCheck className="h-5 w-5 mr-2" />
                    Check {checkType === "arrival" ? "In" : "Out"}
                  </>
                )}
              </Button>
            </form>

            {/* Scan Result Display */}
            {lastScanned && (
              <div className={`p-6 rounded-lg flex items-center gap-6 ${
                scanStatus === "success" ? "bg-green-100 dark:bg-green-900/50" :
                scanStatus === "late" ? "bg-yellow-100 dark:bg-yellow-900/50" :
                "bg-red-100 dark:bg-red-900/50"
              }`}>
                <div className={`p-4 rounded-full ${
                  scanStatus === "success" ? "bg-green-500" :
                  scanStatus === "late" ? "bg-yellow-500" :
                  "bg-red-500"
                }`}>
                  {scanStatus === "success" ? (
                    <CheckCircle2 className="h-12 w-12 text-white" />
                  ) : scanStatus === "late" ? (
                    <Clock className="h-12 w-12 text-white" />
                  ) : (
                    <XCircle className="h-12 w-12 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold">{lastScanned.full_name}</h3>
                  <p className="text-lg text-muted-foreground">
                    {lastScanned.admission_number} • {lastScanned.school_classes?.name}
                  </p>
                </div>
                <div className="text-right">
                  {scanStatus === "late" && (
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                      LATE ARRIVAL
                    </Badge>
                  )}
                  <p className="text-lg mt-2">{format(new Date(), "h:mm a")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Check-ins and Pending Approvals */}
        <Tabs defaultValue="checkins">
          <TabsList>
            <TabsTrigger value="checkins" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Today's Check-ins
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Pending Approvals
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checkins">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission #</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayCheckins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No check-ins yet today
                        </TableCell>
                      </TableRow>
                    ) : (
                      todayCheckins.slice(0, 20).map((checkin) => (
                        <TableRow key={checkin.id}>
                          <TableCell className="font-mono">
                            {format(new Date(checkin.checked_at), "h:mm a")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {checkin.students?.full_name}
                          </TableCell>
                          <TableCell className="font-mono">
                            {checkin.students?.admission_number}
                          </TableCell>
                          <TableCell>
                            {checkin.students?.school_classes?.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant={checkin.check_type === "arrival" ? "default" : "secondary"}>
                              {checkin.check_type === "arrival" ? (
                                <><ArrowDownCircle className="h-3 w-3 mr-1" /> In</>
                              ) : (
                                <><ArrowUpCircle className="h-3 w-3 mr-1" /> Out</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {checkin.is_late ? (
                              <Badge variant="destructive">Late</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600">On Time</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {checkin.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Early Departure Requests Awaiting Approval</CardTitle>
                {!canApproveRequests && (
                  <CardDescription className="flex items-center gap-2 text-yellow-600">
                    <Lock className="h-4 w-4" />
                    Only administrators (DOS, Headteacher) can approve requests
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission #</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Reason</TableHead>
                      {canApproveRequests && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canApproveRequests ? 6 : 5} className="text-center py-8 text-muted-foreground">
                          No pending early departure requests
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono">
                            {format(new Date(request.requested_at), "h:mm a")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {request.students?.full_name}
                          </TableCell>
                          <TableCell className="font-mono">
                            {request.students?.admission_number}
                          </TableCell>
                          <TableCell>
                            {request.students?.school_classes?.name}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="truncate" title={request.reason}>{request.reason}</p>
                          </TableCell>
                          {canApproveRequests && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => approveRequestMutation.mutate(request.id)}
                                  disabled={approveRequestMutation.isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectRequestMutation.mutate(request.id)}
                                  disabled={rejectRequestMutation.isPending}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Early Departure Request Dialog */}
      <Dialog open={showEarlyDepartureDialog} onOpenChange={setShowEarlyDepartureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-500" />
              Early Departure Request
            </DialogTitle>
            <DialogDescription>
              School ends at {tenantSettings?.school_end_time?.slice(0, 5) || "16:00"}. 
              Early departure requires administrator approval.
            </DialogDescription>
          </DialogHeader>
          
          {pendingStudent && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{pendingStudent.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {pendingStudent.admission_number} • {pendingStudent.school_classes?.name}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Early Departure *</Label>
                <Textarea
                  id="reason"
                  value={earlyDepartureReason}
                  onChange={(e) => setEarlyDepartureReason(e.target.value)}
                  placeholder="e.g., Medical appointment, Family emergency, Feeling unwell..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEarlyDepartureDialog(false);
              setEarlyDepartureReason("");
              setPendingStudent(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEarlyDeparture}
              disabled={createEarlyDepartureMutation.isPending || !earlyDepartureReason.trim()}
            >
              {createEarlyDepartureMutation.isPending ? "Submitting..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
