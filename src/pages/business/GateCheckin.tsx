import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
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
  Sun,
  Camera
} from "lucide-react";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { GateBlockDialog } from "@/components/gate/GateBlockDialog";
import { OverrideRequestsPanel } from "@/components/bursar/OverrideRequestsPanel";
import { checkStudentRedListStatus, checkTodayOverrideApproval, RedListStatus } from "@/hooks/use-red-list-check";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

// Stat Card Component for mobile-first design
function StatCard({ 
  icon, 
  label, 
  value, 
  variant = "default" 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const variantClasses = {
    default: "bg-card border-border",
    success: "bg-success/10 border-success/30",
    warning: "bg-warning/10 border-warning/30",
    danger: "bg-destructive/10 border-destructive/30",
    info: "bg-primary/10 border-primary/30",
  };

  return (
    <div className={`p-3 md:p-4 rounded-lg border ${variantClasses[variant]}`}>
      <div className="flex items-center gap-2 md:gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-lg md:text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Checkin Card for mobile view
function CheckinCard({ checkin }: { checkin: CheckinRecord }) {
  return (
    <div className={`p-3 rounded-lg border ${
      checkin.is_late ? "bg-warning/10 border-warning/30" : 
      checkin.check_type === "arrival" ? "bg-success/10 border-success/30" : 
      "bg-muted border-border"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{checkin.students?.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {checkin.students?.admission_number} • {checkin.students?.school_classes?.name}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-mono">{format(new Date(checkin.checked_at), "h:mm a")}</p>
          <div className="flex gap-1 mt-1 justify-end">
            <Badge variant={checkin.check_type === "arrival" ? "default" : "secondary"} className="text-2xs">
              {checkin.check_type === "arrival" ? "In" : "Out"}
            </Badge>
            {checkin.is_late && (
              <Badge variant="destructive" className="text-2xs">Late</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Request Card for mobile view
function RequestCard({ 
  request, 
  canApprove, 
  onApprove, 
  onReject,
  isApproving,
  isRejecting 
}: { 
  request: EarlyDepartureRequest;
  canApprove: boolean;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  return (
    <div className="p-3 rounded-lg border border-warning/30 bg-warning/10">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{request.students?.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {request.students?.admission_number} • {request.students?.school_classes?.name}
            </p>
          </div>
          <p className="text-xs font-mono shrink-0">
            {format(new Date(request.requested_at), "h:mm a")}
          </p>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{request.reason}</p>
        {canApprove && (
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-8 text-xs"
              onClick={onApprove}
              disabled={isApproving}
            >
              <Check className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 h-8 text-xs"
              onClick={onReject}
              disabled={isRejecting}
            >
              <X className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Early departure dialog state
  const [showEarlyDepartureDialog, setShowEarlyDepartureDialog] = useState(false);
  const [earlyDepartureReason, setEarlyDepartureReason] = useState("");
  const [pendingStudent, setPendingStudent] = useState<Student | null>(null);
  
  // Red list / gate block dialog state
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockedStudent, setBlockedStudent] = useState<{
    id: string;
    full_name: string;
    admission_number: string;
    class_name?: string;
  } | null>(null);
  const [blockingReasons, setBlockingReasons] = useState<string[]>([]);

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

      // Check bursar's red list for arrivals
      if (checkType === "arrival") {

        // Check bursar's red list
        const redListStatus = await checkStudentRedListStatus(student.id, tenantId!);
        
        if (redListStatus.isBlocked) {
          // Check if there's an approved override for today
          const hasApproval = await checkTodayOverrideApproval(student.id, tenantId!);
          
          if (!hasApproval) {
            // Block the student and show dialog
            setBlockedStudent({
              id: student.id,
              full_name: student.full_name,
              admission_number: student.admission_number,
              class_name: student.school_classes?.name,
            });
            setBlockingReasons(redListStatus.blockingReasons);
            setShowBlockDialog(true);
            throw new Error("RED_LIST_BLOCKED");
          }
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
      if (error.message === "EARLY_DEPARTURE_REQUIRED" || error.message === "RED_LIST_BLOCKED") {
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

  // Camera scan handler
  const handleCameraScan = (scannedCode: string) => {
    setBarcodeInput(scannedCode);
    checkinMutation.mutate(scannedCode);
    setIsScannerOpen(false);
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
      <div className="min-h-screen p-3 md:p-6 lg:p-8 pb-24 md:pb-8" style={{ background: 'linear-gradient(135deg, #FFE4EC 0%, #E0F7FA 100%)' }}>
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          {/* Playful Header - Responsive */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)' }}>
                <ScanLine className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold" style={{ color: '#FF6B9D' }}>
                  Gate Check-In 🚪
                </h1>
                <p className="flex items-center gap-1 text-xs md:text-sm" style={{ color: '#4ECDC4' }}>
                  <Sun className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
                  {format(new Date(), "EEE, MMM d, yyyy")}
                </p>
              </div>
            </div>
            <Select value={checkType} onValueChange={(v) => setCheckType(v as "arrival" | "departure")}>
              <SelectTrigger className="w-full sm:w-40" style={{ borderRadius: '10px', border: '2px solid #4ECDC4' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arrival">
                  <div className="flex items-center gap-2">👋 Arriving</div>
                </SelectItem>
                <SelectItem value="departure">
                  <div className="flex items-center gap-2">🏠 Going Home</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards - ECD themed, Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
            <Card className="border-0 shadow-lg" style={{ background: '#4ECDC4', borderRadius: '12px', border: '3px solid #FF6B9D' }}>
              <CardContent className="p-3 md:pt-4 text-white">
                <div className="text-xl md:text-3xl mb-1">👋</div>
                <p className="text-lg md:text-2xl font-bold">{arrivals.length}</p>
                <p className="text-xs md:text-sm opacity-90">Arrived</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg" style={{ background: '#FF6B9D', borderRadius: '12px', border: '3px solid #4ECDC4' }}>
              <CardContent className="p-3 md:pt-4 text-white">
                <div className="text-xl md:text-3xl mb-1">🏠</div>
                <p className="text-lg md:text-2xl font-bold">{departures.length}</p>
                <p className="text-xs md:text-sm opacity-90">Went Home</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg" style={{ background: '#FFD93D', borderRadius: '12px', border: '3px solid #FF6B9D' }}>
              <CardContent className="p-3 md:pt-4" style={{ color: '#1e293b' }}>
                <div className="text-xl md:text-3xl mb-1">🏃</div>
                <p className="text-lg md:text-2xl font-bold">{lateArrivals.length}</p>
                <p className="text-xs md:text-sm opacity-90">Late</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg" style={{ background: '#B19CD9', borderRadius: '12px', border: '3px solid #4ECDC4' }}>
              <CardContent className="p-3 md:pt-4 text-white">
                <div className="text-xl md:text-3xl mb-1">⏳</div>
                <p className="text-lg md:text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-xs md:text-sm opacity-90">Pending</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg" style={{ background: 'white', borderRadius: '12px', border: '3px solid #4ECDC4' }}>
              <CardContent className="p-3 md:pt-4" style={{ color: '#1e293b' }}>
                <div className="text-xl md:text-3xl mb-1">🌅</div>
                <p className="text-lg md:text-2xl font-bold" style={{ color: '#4ECDC4' }}>
                  {tenantSettings?.school_start_time?.slice(0, 5) || "08:00"}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">Start</p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg" style={{ background: 'white', borderRadius: '12px', border: '3px solid #FF6B9D' }}>
              <CardContent className="p-3 md:pt-4" style={{ color: '#1e293b' }}>
                <div className="text-xl md:text-3xl mb-1">🌆</div>
                <p className="text-lg md:text-2xl font-bold" style={{ color: '#FF6B9D' }}>
                  {tenantSettings?.school_end_time?.slice(0, 5) || "16:00"}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">End</p>
              </CardContent>
            </Card>
          </div>

          {/* Scanner Section - ECD themed, Responsive */}
          <Card 
            className="shadow-lg transition-all duration-300"
            style={{ 
              background: scanStatus === "success" ? '#E0F7FA' : 
                         scanStatus === "late" ? '#FFF9E0' : 
                         scanStatus === "error" ? '#FFE4EC' : 'white',
              borderRadius: '12px',
              border: `3px solid ${scanStatus === "success" ? '#4ECDC4' : 
                                   scanStatus === "late" ? '#FFD93D' : 
                                   scanStatus === "error" ? '#FF6B9D' : '#4ECDC4'}`
            }}
          >
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base md:text-lg" style={{ color: '#1e293b' }}>
                <span className="text-xl md:text-2xl">📱</span>
                Scan Pupil ID Card
                {checkType === "departure" && isBeforeEndTime() && (
                  <Badge className="text-2xs md:text-xs" style={{ background: '#FFD93D', color: '#1e293b', borderRadius: '10px' }}>
                    🔔 Early pickup needs approval
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <form onSubmit={handleScan} className="flex flex-col gap-2 md:gap-4">
                <div className="flex flex-row gap-2 md:gap-4">
                  <Input
                    ref={inputRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan card or type admission number..."
                    className="text-lg md:text-2xl h-12 md:h-16 font-mono flex-1"
                    style={{ borderRadius: '12px', border: '2px solid #FF6B9D' }}
                    autoComplete="off"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    size="lg"
                    className="h-12 md:h-16 px-3 md:px-4 shrink-0"
                    style={{ borderRadius: '12px', border: '2px solid #4ECDC4' }}
                    onClick={() => setIsScannerOpen(true)}
                  >
                    <Camera className="h-5 w-5 md:h-6 md:w-6" style={{ color: '#4ECDC4' }} />
                  </Button>
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="h-12 md:h-16 px-6 md:px-8 text-white shadow-lg w-full"
                  style={{ background: checkType === "arrival" ? '#4ECDC4' : '#FF6B9D', borderRadius: '12px' }}
                  disabled={checkinMutation.isPending}
                >
                  {checkinMutation.isPending ? (
                    <span className="animate-pulse">Scanning...</span>
                  ) : (
                    <>{checkType === "arrival" ? "👋 Check In" : "🏠 Check Out"}</>
                  )}
                </Button>
              </form>

              {/* Camera Scanner Dialog */}
              <BarcodeScanner 
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleCameraScan}
              />

              {/* Scan Result Display - ECD themed */}
              {lastScanned && (
                <div 
                  className="p-4 md:p-6 rounded-xl md:rounded-2xl flex flex-col sm:flex-row items-center gap-4 md:gap-6"
                  style={{ 
                    background: scanStatus === "success" ? '#4ECDC4' : 
                               scanStatus === "late" ? '#FFD93D' : '#FF6B9D',
                    border: '3px solid white'
                  }}
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg shrink-0" style={{ background: 'white' }}>
                    <span className="text-3xl md:text-4xl">
                      {scanStatus === "success" ? "😊" : scanStatus === "late" ? "🏃" : "😢"}
                    </span>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl md:text-2xl font-bold" style={{ color: scanStatus === "late" ? '#1e293b' : 'white' }}>
                      {lastScanned.full_name}
                    </h3>
                    <p className="text-sm md:text-lg" style={{ color: scanStatus === "late" ? '#666' : 'rgba(255,255,255,0.9)' }}>
                      {lastScanned.admission_number} • {lastScanned.school_classes?.name}
                    </p>
                  </div>
                  <div className="text-center sm:text-right">
                    {scanStatus === "late" && (
                      <Badge style={{ background: '#FF6B9D', color: 'white', borderRadius: '10px', padding: '6px 12px', fontSize: '12px' }}>
                        🏃 LATE
                      </Badge>
                    )}
                    <p className="text-base md:text-lg mt-2" style={{ color: scanStatus === "late" ? '#1e293b' : 'white' }}>
                      {format(new Date(), "h:mm a")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Check-ins and Pending Approvals - ECD themed */}
          <Tabs defaultValue="checkins" className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="w-full sm:w-auto" style={{ background: 'white', borderRadius: '12px', border: '2px solid #4ECDC4' }}>
                <TabsTrigger value="checkins" className="flex-1 sm:flex-none flex items-center gap-1 md:gap-2 text-xs md:text-sm data-[state=active]:bg-[#4ECDC4] data-[state=active]:text-white rounded-lg px-2 md:px-4">
                  👶 <span className="hidden sm:inline">Today's</span> Check-ins
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex-1 sm:flex-none flex items-center gap-1 md:gap-2 text-xs md:text-sm data-[state=active]:bg-[#FF6B9D] data-[state=active]:text-white rounded-lg px-2 md:px-4">
                  ⏳ <span className="hidden sm:inline">Pending</span> Approvals
                  {pendingRequests.length > 0 && (
                    <Badge className="ml-1" style={{ background: '#FFD93D', color: '#1e293b', borderRadius: '10px' }}>{pendingRequests.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TabsContent value="checkins" className="mt-4">
              <Card className="shadow-lg" style={{ background: 'white', borderRadius: '12px', border: '3px solid #4ECDC4' }}>
                <CardContent className="pt-4 md:pt-6">
                  {todayCheckins.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="text-4xl md:text-6xl mb-4">👶</div>
                      <p className="text-base md:text-lg" style={{ color: '#FF6B9D' }}>No check-ins yet today!</p>
                      <p className="text-sm" style={{ color: '#4ECDC4' }}>Scan a pupil's ID card to start</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                      {todayCheckins.slice(0, 20).map((checkin) => (
                        <div
                          key={checkin.id}
                          className="p-2 md:p-4 text-center"
                          style={{
                            borderRadius: '12px',
                            border: `3px solid ${checkin.check_type === 'arrival' ? '#4ECDC4' : '#FF6B9D'}`,
                            background: checkin.is_late ? '#FFF9E0' : checkin.check_type === 'arrival' ? '#E0F7FA' : '#FFE4EC'
                          }}
                        >
                          <div className="text-xl md:text-3xl mb-1 md:mb-2">
                            {checkin.check_type === 'arrival' ? '👋' : '🏠'}
                            {checkin.is_late && '🏃'}
                          </div>
                          <p className="font-medium text-xs md:text-sm truncate" style={{ color: '#1e293b' }}>
                            {checkin.students?.full_name}
                          </p>
                          <p className="text-2xs md:text-xs" style={{ color: '#666' }}>
                            {format(new Date(checkin.checked_at), "h:mm a")}
                          </p>
                          {checkin.is_late && (
                            <Badge className="mt-1 md:mt-2" style={{ background: '#FFD93D', color: '#1e293b', borderRadius: '8px', fontSize: '8px' }}>
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

            <TabsContent value="pending" className="mt-4">
              <Card className="shadow-lg" style={{ background: 'white', borderRadius: '12px', border: '3px solid #FF6B9D' }}>
                <CardHeader className="pb-2 md:pb-4">
                  <CardTitle className="text-base md:text-lg" style={{ color: '#FF6B9D' }}>⏳ Early Pickup Requests</CardTitle>
                  {!canApproveRequests && (
                    <CardDescription className="flex items-center gap-2 text-xs md:text-sm" style={{ color: '#FFD93D' }}>
                      🔒 Only administrators can approve requests
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="text-4xl md:text-6xl mb-4">✨</div>
                      <p className="text-base md:text-lg" style={{ color: '#4ECDC4' }}>No pending requests!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-4">
                      {pendingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4"
                          style={{ borderRadius: '12px', border: '2px solid #FFD93D', background: '#FFF9E0' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)' }}>
                              <span className="text-lg md:text-xl">👶</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm md:text-base truncate" style={{ color: '#1e293b' }}>{request.students?.full_name}</p>
                              <p className="text-xs md:text-sm truncate" style={{ color: '#666' }}>{request.reason}</p>
                              <p className="text-2xs md:text-xs" style={{ color: '#999' }}>{format(new Date(request.requested_at), "h:mm a")}</p>
                            </div>
                          </div>
                          {canApproveRequests && (
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button
                                size="sm"
                                className="flex-1 sm:flex-none text-white h-9"
                                style={{ background: '#4ECDC4', borderRadius: '8px' }}
                                onClick={() => approveRequestMutation.mutate(request.id)}
                                disabled={approveRequestMutation.isPending}
                              >
                                ✓ Approve
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 sm:flex-none text-white h-9"
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
          <DialogContent className="max-w-[95vw] sm:max-w-md" style={{ borderRadius: '16px', border: '3px solid #4ECDC4' }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base md:text-lg" style={{ color: '#FF6B9D' }}>
                🔔 Early Pickup Request
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm">
                School ends at {tenantSettings?.school_end_time?.slice(0, 5) || "16:00"}. 
                Early pickup needs approval.
              </DialogDescription>
            </DialogHeader>
            
            {pendingStudent && (
              <div className="space-y-4">
                <div className="p-3 md:p-4 flex items-center gap-3" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #FFE4EC 0%, #E0F7FA 100%)', border: '2px solid #4ECDC4' }}>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #FF6B9D 0%, #4ECDC4 100%)' }}>
                    <span className="text-lg md:text-xl">👶</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm md:text-base truncate" style={{ color: '#1e293b' }}>{pendingStudent.full_name}</p>
                    <p className="text-xs md:text-sm truncate" style={{ color: '#666' }}>
                      {pendingStudent.admission_number} • {pendingStudent.school_classes?.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm" style={{ color: '#FF6B9D' }}>Reason for Early Pickup *</Label>
                  <Textarea
                    id="reason"
                    value={earlyDepartureReason}
                    onChange={(e) => setEarlyDepartureReason(e.target.value)}
                    placeholder="e.g., Doctor's appointment, Family event..."
                    rows={3}
                    className="text-sm"
                    style={{ borderRadius: '10px', border: '2px solid #4ECDC4' }}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
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
                className="w-full sm:w-auto text-white"
                onClick={handleSubmitEarlyDeparture}
                disabled={createEarlyDepartureMutation.isPending || !earlyDepartureReason.trim()}
                style={{ background: '#4ECDC4', borderRadius: '10px' }}
              >
                {createEarlyDepartureMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Standard school render - Mobile-first responsive
  return (
    <div className="min-h-screen bg-background p-3 md:p-6 lg:p-8 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Gate Check-In</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <Select value={checkType} onValueChange={(v) => setCheckType(v as "arrival" | "departure")}>
            <SelectTrigger className="w-full sm:w-40">
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

        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
          <StatCard
            icon={<div className="p-2 md:p-3 bg-success/20 rounded-full"><ArrowDownCircle className="h-4 w-4 md:h-6 md:w-6 text-green-600" /></div>}
            label="Arrivals"
            value={arrivals.length}
            variant="success"
          />
          <StatCard
            icon={<div className="p-2 md:p-3 bg-warning/20 rounded-full"><ArrowUpCircle className="h-4 w-4 md:h-6 md:w-6 text-orange-600" /></div>}
            label="Departures"
            value={departures.length}
            variant="warning"
          />
          <StatCard
            icon={<div className="p-2 md:p-3 bg-destructive/20 rounded-full"><AlertTriangle className="h-4 w-4 md:h-6 md:w-6 text-red-600" /></div>}
            label="Late"
            value={lateArrivals.length}
            variant="danger"
          />
          <StatCard
            icon={<div className="p-2 md:p-3 bg-warning/20 rounded-full"><ShieldAlert className="h-4 w-4 md:h-6 md:w-6 text-yellow-600" /></div>}
            label="Pending"
            value={pendingRequests.length}
            variant="warning"
          />
          <StatCard
            icon={<div className="p-2 md:p-3 bg-success/20 rounded-full"><Clock className="h-4 w-4 md:h-6 md:w-6 text-green-600" /></div>}
            label="Start Time"
            value={tenantSettings?.school_start_time?.slice(0, 5) || "08:00"}
            variant="success"
          />
          <StatCard
            icon={<div className="p-2 md:p-3 bg-primary/20 rounded-full"><Clock className="h-4 w-4 md:h-6 md:w-6 text-primary" /></div>}
            label="End Time"
            value={tenantSettings?.school_end_time?.slice(0, 5) || "16:00"}
            variant="info"
          />
        </div>

        {/* Scanner Section - Responsive */}
        <Card className={`transition-all duration-300 ${
          scanStatus === "success" ? "ring-2 md:ring-4 ring-green-500 bg-green-50 dark:bg-green-950" :
          scanStatus === "late" ? "ring-2 md:ring-4 ring-yellow-500 bg-yellow-50 dark:bg-yellow-950" :
          scanStatus === "error" ? "ring-2 md:ring-4 ring-red-500 bg-red-50 dark:bg-red-950" :
          ""
        }`}>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base md:text-lg">
              <ScanLine className="h-4 w-4 md:h-5 md:w-5" />
              Scan Student ID Card
              {checkType === "departure" && isBeforeEndTime() && (
                <Badge variant="outline" className="text-2xs md:text-xs text-yellow-600 border-yellow-600">
                  Early departure requires approval
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6">
            <form onSubmit={handleScan} className="flex flex-col gap-2 md:gap-4">
              <div className="flex flex-row gap-2 md:gap-4">
                <Input
                  ref={inputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or enter admission number..."
                  className="text-base md:text-2xl h-12 md:h-16 font-mono flex-1"
                  autoComplete="off"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  size="lg"
                  className="h-12 md:h-16 px-3 md:px-4 shrink-0"
                  onClick={() => setIsScannerOpen(true)}
                >
                  <Camera className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </div>
              <Button type="submit" size="lg" className="h-12 md:h-16 px-6 md:px-8 w-full" disabled={checkinMutation.isPending}>
                {checkinMutation.isPending ? (
                  <span className="animate-pulse">Scanning...</span>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    <span className="hidden sm:inline">Check</span> {checkType === "arrival" ? "In" : "Out"}
                  </>
                )}
              </Button>
            </form>

            {/* Camera Scanner Dialog */}
            <BarcodeScanner 
              isOpen={isScannerOpen}
              onClose={() => setIsScannerOpen(false)}
              onScan={handleCameraScan}
            />

            {/* Scan Result Display - Responsive */}
            {lastScanned && (
              <div className={`p-4 md:p-6 rounded-lg flex flex-col sm:flex-row items-center gap-4 md:gap-6 ${
                scanStatus === "success" ? "bg-green-100 dark:bg-green-900/50" :
                scanStatus === "late" ? "bg-yellow-100 dark:bg-yellow-900/50" :
                "bg-red-100 dark:bg-red-900/50"
              }`}>
                <div className={`p-3 md:p-4 rounded-full shrink-0 ${
                  scanStatus === "success" ? "bg-green-500" :
                  scanStatus === "late" ? "bg-yellow-500" :
                  "bg-red-500"
                }`}>
                  {scanStatus === "success" ? (
                    <CheckCircle2 className="h-8 w-8 md:h-12 md:w-12 text-white" />
                  ) : scanStatus === "late" ? (
                    <Clock className="h-8 w-8 md:h-12 md:w-12 text-white" />
                  ) : (
                    <XCircle className="h-8 w-8 md:h-12 md:w-12 text-white" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <h3 className="text-lg md:text-2xl font-bold truncate">{lastScanned.full_name}</h3>
                  <p className="text-sm md:text-lg text-muted-foreground truncate">
                    {lastScanned.admission_number} • {lastScanned.school_classes?.name}
                  </p>
                </div>
                <div className="text-center sm:text-right shrink-0">
                  {scanStatus === "late" && (
                    <Badge variant="destructive" className="text-sm md:text-lg px-2 md:px-4 py-1 md:py-2">
                      LATE ARRIVAL
                    </Badge>
                  )}
                  <p className="text-sm md:text-lg mt-2">{format(new Date(), "h:mm a")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Check-ins and Pending Approvals - Responsive */}
        <Tabs defaultValue="checkins" className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="checkins" className="flex-1 sm:flex-none flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden xs:inline">Today's</span> Check-ins
              </TabsTrigger>
              <TabsTrigger value="overrides" className="flex-1 sm:flex-none flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4">
                <ShieldAlert className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
                <span className="hidden xs:inline">Red List</span> Overrides
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 sm:flex-none flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden xs:inline">Early</span> Departure
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-2xs">{pendingRequests.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="checkins" className="mt-4">
            <Card>
              <CardContent className="pt-4 md:pt-6">
                {todayCheckins.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm md:text-base text-muted-foreground">No check-ins yet today</p>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {todayCheckins.slice(0, 20).map((checkin) => (
                      <CheckinCard key={checkin.id} checkin={checkin} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overrides" className="mt-4">
            <OverrideRequestsPanel showPendingOnly={true} maxHeight="400px" />
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="text-base md:text-lg">Early Departure Requests</CardTitle>
                {!canApproveRequests && (
                  <CardDescription className="flex items-center gap-2 text-xs md:text-sm text-yellow-600">
                    <Lock className="h-3 w-3 md:h-4 md:w-4" />
                    Only administrators can approve requests
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <ShieldAlert className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm md:text-base text-muted-foreground">No pending early departure requests</p>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {pendingRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        canApprove={!!canApproveRequests}
                        onApprove={() => approveRequestMutation.mutate(request.id)}
                        onReject={() => rejectRequestMutation.mutate(request.id)}
                        isApproving={approveRequestMutation.isPending}
                        isRejecting={rejectRequestMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Early Departure Request Dialog - Responsive */}
      <Dialog open={showEarlyDepartureDialog} onOpenChange={setShowEarlyDepartureDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <ShieldAlert className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
              Early Departure Request
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              School ends at {tenantSettings?.school_end_time?.slice(0, 5) || "16:00"}. 
              Early departure requires administrator approval.
            </DialogDescription>
          </DialogHeader>
          
          {pendingStudent && (
            <div className="space-y-4">
              <div className="p-3 md:p-4 bg-muted rounded-lg">
                <p className="font-medium text-sm md:text-base">{pendingStudent.full_name}</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {pendingStudent.admission_number} • {pendingStudent.school_classes?.name}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm">Reason for Early Departure *</Label>
                <Textarea
                  id="reason"
                  value={earlyDepartureReason}
                  onChange={(e) => setEarlyDepartureReason(e.target.value)}
                  placeholder="e.g., Medical appointment, Family emergency, Feeling unwell..."
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => {
              setShowEarlyDepartureDialog(false);
              setEarlyDepartureReason("");
              setPendingStudent(null);
            }}>
              Cancel
            </Button>
            <Button 
              className="w-full sm:w-auto"
              onClick={handleSubmitEarlyDeparture}
              disabled={createEarlyDepartureMutation.isPending || !earlyDepartureReason.trim()}
            >
              {createEarlyDepartureMutation.isPending ? "Submitting..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gate Block Dialog (Bursar Red List) */}
      <GateBlockDialog
        isOpen={showBlockDialog}
        onClose={() => {
          setShowBlockDialog(false);
          setBlockedStudent(null);
          setBlockingReasons([]);
        }}
        student={blockedStudent}
        blockingReasons={blockingReasons}
        tenantId={tenantId || ""}
        onRequestSubmitted={() => {
          queryClient.invalidateQueries({ queryKey: ["override-requests"] });
        }}
      />
    </div>
  );
}
