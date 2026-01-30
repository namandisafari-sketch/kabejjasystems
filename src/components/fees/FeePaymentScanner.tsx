import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Search, User, CreditCard, CheckCircle, Printer, Receipt, Users, SkipForward, Volume2, VolumeX, Camera } from "lucide-react";
import { FeeReceiptThermal } from "./FeeReceiptThermal";
import { PaymentQueuePanel, QueuedStudent } from "./PaymentQueuePanel";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";

interface StudentInfo {
  id: string;
  full_name: string;
  admission_number: string;
  boarding_status: string;
  school_classes?: { name: string; level: string };
}

interface StudentFeeInfo {
  id: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  term_id: string;
}

interface PaymentReceiptData {
  receipt_number: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  date: Date;
  previous_balance: number;
  new_balance: number;
}

interface FeeStructure {
  id: string;
  name: string;
  level: string;
  fee_type: string;
  amount: number;
  is_mandatory: boolean;
}

interface FeePaymentScannerProps {
  tenantId: string;
}

export function FeePaymentScanner({ tenantId }: FeePaymentScannerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const receiptRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Queue state
  const [queue, setQueue] = useState<QueuedStudent[]>([]);
  const [isQueueMode, setIsQueueMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Current student state
  const [manualCode, setManualCode] = useState("");
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [studentFee, setStudentFee] = useState<StudentFeeInfo | null>(null);
  
  // Dialog states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isAssignFeesDialogOpen, setIsAssignFeesDialogOpen] = useState(false);
  const [selectedFees, setSelectedFees] = useState<Record<string, boolean>>({});
  
  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  
  // Receipt state
  const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio feedback
  const playSound = useCallback((type: 'success' | 'scan' | 'error') => {
    if (!soundEnabled) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'success') {
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.1;
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 1100;
      }, 100);
      setTimeout(() => oscillator.stop(), 200);
    } else if (type === 'scan') {
      oscillator.frequency.value = 600;
      gainNode.gain.value = 0.05;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 80);
    } else {
      oscillator.frequency.value = 200;
      gainNode.gain.value = 0.1;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 300);
    }
  }, [soundEnabled]);

  // Fetch tenant info
  const { data: tenant } = useQuery({
    queryKey: ['tenant', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('name, phone, email, address, logo_url')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch receipt settings
  const { data: receiptSettings } = useQuery({
    queryKey: ['receipt-settings', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipt_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch current term
  const { data: currentTerm } = useQuery({
    queryKey: ['current-term', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('id, name, year')
        .eq('tenant_id', tenantId)
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Auto-trigger search after barcode scan (detects rapid input)
  useEffect(() => {
    if (manualCode.length >= 3) {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      scanTimeoutRef.current = setTimeout(() => {
        handleStudentLookup(manualCode.trim());
        setManualCode("");
      }, 300);
    }
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [manualCode]);

  const { data: feeStructures = [] } = useQuery({
    queryKey: ['fee-structures', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('level', { ascending: true });
      if (error) throw error;
      return data as FeeStructure[];
    },
  });

  const lookupStudentData = async (code: string): Promise<{ student: StudentInfo; fee: StudentFeeInfo | null } | null> => {
    let studentData: StudentInfo | null = null;

    // Fetch all active students for this tenant - sorted by full_name to match ID card generation order
    const { data: allStudents, error: fetchError } = await supabase
      .from("students")
      .select("id, full_name, admission_number, boarding_status, school_classes(name, level)")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("full_name", { ascending: true });
    
    if (fetchError) throw fetchError;

    // Handle barcode format: STU-XXXX or custom prefix like PREFIX-XXXX
    const barcodeMatch = code.match(/^([A-Z]+)-(\d+)$/);
    if (barcodeMatch) {
      const indexNum = parseInt(barcodeMatch[2], 10);
      
      // Student index is 1-based, array is 0-based
      // This matches how StudentCards.tsx generates IDs (sorted alphabetically by full_name)
      if (indexNum > 0 && indexNum <= (allStudents?.length || 0)) {
        studentData = allStudents?.[indexNum - 1] || null;
      }
      
      // Also try matching by admission_number directly
      if (!studentData) {
        studentData = allStudents?.find(s => s.admission_number === code) || null;
      }
    }

    // Try lookup by exact admission number or UUID
    if (!studentData) {
      studentData = allStudents?.find(s => 
        s.admission_number === code || 
        s.id === code
      ) || null;
    }

    if (!studentData) return null;

    // Fetch fee data
    const { data: feeData } = await supabase
      .from("student_fees")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("student_id", studentData.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { student: studentData, fee: feeData };
  };

  const handleStudentLookup = async (code: string) => {
    try {
      const result = await lookupStudentData(code);
      
      if (!result) {
        playSound('error');
        toast({
          title: "Student Not Found",
          description: "No student found with that code or admission number.",
          variant: "destructive",
        });
        return;
      }

      playSound('scan');

      if (isQueueMode) {
        // Add to queue if not already there
        const alreadyInQueue = queue.some(q => q.id === result.student.id && q.status !== 'completed');
        if (alreadyInQueue) {
          toast({
            title: "Already in Queue",
            description: `${result.student.full_name} is already in the payment queue.`,
          });
          return;
        }

        const queuedStudent: QueuedStudent = {
          id: result.student.id,
          full_name: result.student.full_name,
          admission_number: result.student.admission_number,
          class_name: result.student.school_classes?.name,
          balance: result.fee?.balance || 0,
          scannedAt: new Date(),
          status: 'waiting',
        };

        setQueue(prev => [...prev, queuedStudent]);
        toast({
          title: "Added to Queue",
          description: `${result.student.full_name} added to payment queue.`,
        });

        // If no current student, automatically select this one
        if (!student) {
          selectStudentFromQueue(queuedStudent);
        }
      } else {
        // Direct mode - set as current student
        setStudent(result.student);
        setStudentFee(result.fee);
        
        if (!result.fee) {
          toast({
            title: "No Fee Record",
            description: "This student has no fee records assigned yet.",
          });
        }
      }
    } catch (error: any) {
      playSound('error');
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const selectStudentFromQueue = async (queuedStudent: QueuedStudent) => {
    // Update queue status
    setQueue(prev => prev.map(s => ({
      ...s,
      status: s.id === queuedStudent.id ? 'processing' : s.status,
    })));

    // Fetch fresh data
    const result = await lookupStudentData(queuedStudent.admission_number);
    if (result) {
      setStudent(result.student);
      setStudentFee(result.fee);
    }
  };

  const removeFromQueue = (studentId: string) => {
    setQueue(prev => prev.filter(s => s.id !== studentId));
  };

  const clearCompletedFromQueue = () => {
    setQueue(prev => prev.filter(s => s.status !== 'completed'));
  };

  const processNextInQueue = () => {
    const nextStudent = queue.find(s => s.status === 'waiting');
    if (nextStudent) {
      selectStudentFromQueue(nextStudent);
      // Focus back on input for next scan
      inputRef.current?.focus();
    } else {
      // No more students in queue
      resetAll();
      inputRef.current?.focus();
    }
  };

  const printReceipt = useCallback(() => {
    const printContent = receiptRef.current;
    if (!printContent || !receiptData) return;

    const printWindow = window.open('', '', 'width=320,height=800');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Fee Receipt - ${receiptData.receipt_number}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              @page { size: 80mm auto; margin: 0; }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 11px;
                line-height: 1.5;
                color: #1a1a1a;
                background: #fff;
                width: 80mm;
                padding: 14px;
                -webkit-font-smoothing: antialiased;
              }
              .receipt-container { width: 100%; }
              img { max-height: 50px; margin-bottom: 8px; }
              svg { display: inline-block; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }, [receiptData]);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!student || !studentFee) throw new Error("No student or fee selected");
      
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid payment amount");

      const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: paymentData, error: paymentError } = await supabase.from("fee_payments").insert({
        tenant_id: tenantId,
        student_id: student.id,
        student_fee_id: studentFee.id,
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        receipt_number: receiptNumber,
      }).select().single();

      if (paymentError) throw paymentError;

      const newAmountPaid = studentFee.amount_paid + amount;
      const newBalance = studentFee.total_amount - newAmountPaid;
      const newStatus = newBalance <= 0 ? "paid" : newBalance < studentFee.total_amount ? "partial" : "pending";

      const { error: updateError } = await supabase
        .from("student_fees")
        .update({
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq("id", studentFee.id);

      if (updateError) throw updateError;

      return {
        receipt_number: receiptNumber,
        amount,
        previous_balance: studentFee.balance,
        new_balance: newBalance,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["student-fees"] });
      
      playSound('success');

      if (student && data) {
        setReceiptData({
          receipt_number: data.receipt_number,
          amount: data.amount,
          payment_method: paymentMethod,
          reference_number: referenceNumber || undefined,
          date: new Date(),
          previous_balance: data.previous_balance,
          new_balance: data.new_balance,
        });
        setIsReceiptDialogOpen(true);
      }

      // Update queue status if in queue mode
      if (isQueueMode && student) {
        setQueue(prev => prev.map(s => 
          s.id === student.id ? { ...s, status: 'completed' as const } : s
        ));
      }

      toast({
        title: "Payment Recorded",
        description: `Payment of UGX ${parseInt(paymentAmount).toLocaleString()} recorded successfully.`,
      });
      
      if (studentFee) {
        setStudentFee({
          ...studentFee,
          amount_paid: studentFee.amount_paid + parseFloat(paymentAmount),
          balance: data.new_balance,
          status: data.new_balance <= 0 ? "paid" : "partial",
        });
      }
      
      resetPayment();
    },
    onError: (error: any) => {
      playSound('error');
      toast({ title: "Payment Failed", description: error.message, variant: "destructive" });
    },
  });

  // Auto-print when receipt dialog opens
  useEffect(() => {
    if (isReceiptDialogOpen && receiptData) {
      // Small delay to ensure receipt is rendered
      const timer = setTimeout(() => {
        printReceipt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isReceiptDialogOpen, receiptData, printReceipt]);

  const assignFeesMutation = useMutation({
    mutationFn: async () => {
      if (!student) throw new Error("No student selected");
      
      const selectedFeeList = Object.entries(selectedFees)
        .filter(([_, selected]) => selected)
        .map(([feeId]) => feeStructures.find(f => f.id === feeId))
        .filter(Boolean);

      if (selectedFeeList.length === 0) throw new Error("Please select at least one fee");

      const totalAmount = selectedFeeList.reduce((sum, fee) => sum + (fee?.amount || 0), 0);

      const { data: currentTermData } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_current', true)
        .maybeSingle();

      const { data: newFee, error } = await supabase.from('student_fees').insert({
        tenant_id: tenantId,
        student_id: student.id,
        term_id: currentTermData?.id || null,
        total_amount: totalAmount,
        amount_paid: 0,
        status: 'pending',
      }).select().single();

      if (error) throw error;
      return newFee;
    },
    onSuccess: (data) => {
      setStudentFee(data);
      setIsAssignFeesDialogOpen(false);
      setSelectedFees({});
      queryClient.invalidateQueries({ queryKey: ["student-fees"] });
      toast({ title: "Fees assigned successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleFee = (feeId: string) => {
    setSelectedFees(prev => ({ ...prev, [feeId]: !prev[feeId] }));
  };

  const totalSelectedFees = Object.entries(selectedFees)
    .filter(([_, selected]) => selected)
    .reduce((sum, [feeId]) => {
      const fee = feeStructures.find(f => f.id === feeId);
      return sum + (fee?.amount || 0);
    }, 0);

  const resetPayment = () => {
    setIsPaymentDialogOpen(false);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setReferenceNumber("");
  };

  const resetAll = () => {
    setStudent(null);
    setStudentFee(null);
    setManualCode("");
    setSelectedFees({});
    resetPayment();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleManualLookup = () => {
    if (manualCode.trim()) {
      handleStudentLookup(manualCode.trim());
    }
  };

  // Camera scan handler
  const handleCameraScan = (scannedCode: string) => {
    setManualCode(scannedCode);
    handleStudentLookup(scannedCode);
    setIsScannerOpen(false);
  };

  const handleReceiptClose = () => {
    setIsReceiptDialogOpen(false);
    
    // If queue mode, automatically move to next student
    if (isQueueMode) {
      processNextInQueue();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className={`${isQueueMode ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
        {/* Scanner Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Scan Student ID
                </CardTitle>
                <CardDescription>
                  {isQueueMode 
                    ? "Scan multiple student IDs to build a payment queue"
                    : "Scan or type admission number to process payment"
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="h-8 w-8"
                  >
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="queue-mode"
                    checked={isQueueMode}
                    onCheckedChange={setIsQueueMode}
                  />
                  <Label htmlFor="queue-mode" className="text-sm flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Queue Mode
                  </Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barcode-input">Scan or Enter Student Code</Label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="barcode-input"
                  placeholder="Scan barcode or type ADM/25/0001..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
                  autoFocus
                  className="text-lg font-mono flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setIsScannerOpen(true)}
                >
                  <Camera className="h-5 w-5" />
                </Button>
                <Button onClick={handleManualLookup} variant="secondary">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isQueueMode 
                  ? "Keep scanning - students will be added to the queue for processing"
                  : "Click the input field, then scan with your barcode scanner"
                }
              </p>
            </div>

            {/* Camera Scanner Dialog */}
            <BarcodeScanner 
              isOpen={isScannerOpen}
              onClose={() => setIsScannerOpen(false)}
              onScan={handleCameraScan}
            />
          </CardContent>
        </Card>

        {/* Student Info & Payment */}
        {student && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {isQueueMode ? 'Processing Payment' : 'Student Found'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">{student.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admission No.</p>
                  <p className="font-semibold">{student.admission_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-semibold">
                    {student.school_classes?.name || "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student Type</p>
                  <Badge variant={student.boarding_status === "boarding" ? "default" : "secondary"}>
                    {student.boarding_status === "boarding" ? "Boarding" : "Day Scholar"}
                  </Badge>
                </div>
              </div>

              {studentFee ? (
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Fee Information
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Fees</p>
                      <p className="font-bold text-lg">{formatCurrency(studentFee.total_amount)}</p>
                    </div>
                    <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Paid</p>
                      <p className="font-bold text-lg text-green-600">{formatCurrency(studentFee.amount_paid)}</p>
                    </div>
                    <div className="text-center p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="font-bold text-lg text-orange-600">{formatCurrency(studentFee.balance)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={studentFee.status === "paid" ? "default" : studentFee.status === "partial" ? "secondary" : "destructive"}>
                      {studentFee.status.toUpperCase()}
                    </Badge>
                    <div className="flex gap-2">
                      {studentFee.balance > 0 && (
                        <Button onClick={() => setIsPaymentDialogOpen(true)}>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Record Payment
                        </Button>
                      )}
                      {studentFee.status === "paid" && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-semibold">Fully Paid</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4 space-y-4">
                  <div className="text-center text-muted-foreground">
                    <p>No fee records found for this student.</p>
                  </div>
                  <div className="flex justify-center">
                    <Button onClick={() => setIsAssignFeesDialogOpen(true)}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Assign Fees
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                {isQueueMode && queue.some(s => s.status === 'waiting') && (
                  <Button variant="outline" onClick={processNextInQueue}>
                    <SkipForward className="h-4 w-4 mr-2" />
                    Skip to Next
                  </Button>
                )}
                <Button variant="outline" onClick={resetAll} className="ml-auto">
                  {isQueueMode ? "Clear Current" : "Scan Another Student"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Fee Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {student && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-semibold">{student.full_name}</p>
                  <p className="text-sm text-muted-foreground">{student.admission_number}</p>
                </div>
              )}
              {studentFee && (
                <div className="text-sm">
                  <p>Balance Due: <span className="font-bold text-orange-600">{formatCurrency(studentFee.balance)}</span></p>
                </div>
              )}
              <div>
                <Label htmlFor="amount">Payment Amount (UGX) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  max={studentFee?.balance}
                />
              </div>
              <div>
                <Label htmlFor="method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reference">Reference Number (Optional)</Label>
                <Input
                  id="reference"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Transaction ID or receipt number"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetPayment}>
                  Cancel
                </Button>
                <Button
                  onClick={() => paymentMutation.mutate()}
                  disabled={paymentMutation.isPending || !paymentAmount}
                >
                  {paymentMutation.isPending ? "Processing..." : "Record Payment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog - Thermal Printer Style */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={handleReceiptClose}>
          <DialogContent className="max-w-fit p-6 overflow-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Receipt
              </DialogTitle>
            </DialogHeader>
            {receiptData && student && tenant && (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden shadow-lg">
                  <FeeReceiptThermal
                    ref={receiptRef}
                    receipt_number={receiptData.receipt_number}
                    student={{
                      full_name: student.full_name,
                      admission_number: student.admission_number,
                      class_name: student.school_classes?.name,
                    }}
                    amount={receiptData.amount}
                    payment_method={receiptData.payment_method}
                    reference_number={receiptData.reference_number}
                    date={receiptData.date}
                    previous_balance={receiptData.previous_balance}
                    new_balance={receiptData.new_balance}
                    tenant={{
                      name: tenant.name,
                      phone: tenant.phone || undefined,
                      email: tenant.email || undefined,
                      address: tenant.address || undefined,
                      logo_url: tenant.logo_url || undefined,
                    }}
                    term={currentTerm ? { name: currentTerm.name, year: currentTerm.year } : undefined}
                    settings={receiptSettings || undefined}
                  />
                </div>

                <div className="flex gap-2 justify-between pt-4">
                  {isQueueMode && queue.some(s => s.status === 'waiting') && (
                    <Button onClick={handleReceiptClose}>
                      <SkipForward className="h-4 w-4 mr-2" />
                      Next Student ({queue.filter(s => s.status === 'waiting').length} waiting)
                    </Button>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" onClick={handleReceiptClose}>
                      {isQueueMode ? 'Done' : 'Close'}
                    </Button>
                    <Button onClick={printReceipt}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print Again
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Fees Dialog */}
        <Dialog open={isAssignFeesDialogOpen} onOpenChange={setIsAssignFeesDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Fees to Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {student && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-semibold">{student.full_name}</p>
                  <p className="text-sm text-muted-foreground">{student.admission_number}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Select Applicable Fees</Label>
                {feeStructures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fee structures found. Please add fee structures first.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {feeStructures.map((fee) => (
                      <div
                        key={fee.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedFees[fee.id] ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                        }`}
                        onClick={() => toggleFee(fee.id)}
                      >
                        <div>
                          <p className="font-medium">{fee.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {fee.level} • {fee.fee_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(fee.amount)}</p>
                          {selectedFees[fee.id] && (
                            <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {totalSelectedFees > 0 && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="font-bold text-xl">{formatCurrency(totalSelectedFees)}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setIsAssignFeesDialogOpen(false);
                  setSelectedFees({});
                }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => assignFeesMutation.mutate()}
                  disabled={assignFeesMutation.isPending || totalSelectedFees === 0}
                >
                  {assignFeesMutation.isPending ? "Assigning..." : "Assign Fees"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Queue Panel - Only visible in queue mode */}
      {isQueueMode && (
        <div className="lg:col-span-1">
          <PaymentQueuePanel
            queue={queue}
            currentStudent={queue.find(s => s.status === 'processing') || null}
            onSelectStudent={selectStudentFromQueue}
            onRemoveFromQueue={removeFromQueue}
            onClearCompleted={clearCompletedFromQueue}
            formatCurrency={formatCurrency}
          />
        </div>
      )}
    </div>
  );
}
