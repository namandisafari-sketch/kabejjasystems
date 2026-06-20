import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudentSession } from "@/pages/StudentLogin";
import { IdCard, AlertTriangle, ExternalLink, Printer, CheckCircle2, XCircle, Download } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

export default function StudentExamCards() {
  const session = getStudentSession()!;
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: cards, isLoading } = useQuery({
    queryKey: ["student-exam-cards", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("exam_cards")
        .select("id, card_number, status, eligibility_status, ineligibility_reason, issued_at, exam_id, term_id, academic_terms!term_id(name)")
        .eq("student_id", session.studentId)
        .order("issued_at", { ascending: false });
      return data || [];
    },
  });

  const { data: feeInfo } = useQuery({
    queryKey: ["student-exam-fee-check", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_fees")
        .select("balance, total_amount")
        .eq("student_id", session.studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: tenant } = useQuery({
    queryKey: ["student-exam-tenant", session.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("name, logo_url")
        .eq("id", session.tenantId)
        .single();
      return data;
    },
  });

  const { data: schoolpaySettings } = useQuery({
    queryKey: ["student-schoolpay", session.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("schoolpay_settings")
        .select("school_code")
        .eq("tenant_id", session.tenantId)
        .maybeSingle();
      return data;
    },
  });

  const hasBalance = (feeInfo?.balance || 0) > 0;
  const schoolpayUrl = schoolpaySettings?.school_code
    ? `https://schoolpay.co.ug/pay/${schoolpaySettings.school_code}?student=${session.admissionNumber}`
    : null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    toast({ title: "Generating image..." });
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: "#ffffff", useCORS: true });
      const link = document.createElement("a");
      link.download = `Exam-Card-${session.admissionNumber || session.studentId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Exam card downloaded" });
    } catch {
      toast({ variant: "destructive", title: "Failed to generate image" });
    }
  };

  const handlePrint = () => {
    if (!cardRef.current) return;
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html><html><head><title>Exam Card</title>
      <style>body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; padding: 20px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>${cardRef.current.innerHTML}</body></html>
    `);
    printWin.document.close();
    setTimeout(() => { printWin.print(); printWin.close(); }, 500);
  };

  const eligibleCards = cards?.filter(c => c.eligibility_status === "eligible") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IdCard className="h-6 w-6" /> Examination Cards
        </h1>
        <p className="text-muted-foreground">Your exam eligibility and examination cards</p>
      </div>

      {hasBalance && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-700 dark:text-red-400">Outstanding Fee Balance</p>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                Your fee balance of <strong>UGX {new Intl.NumberFormat().format(feeInfo?.balance || 0)}</strong> makes you ineligible to sit for exams. Please clear your balance to unlock your examination card.
              </p>
              {schoolpayUrl && (
                <a href={schoolpayUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="default" className="mt-3 bg-red-600 hover:bg-red-700">
                    <ExternalLink className="h-4 w-4 mr-2" /> Pay via SchoolPay
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {eligibleCards.length > 0 ? (
        <div className="space-y-4">
          {eligibleCards.map((card) => (
            <Card key={card.id} className="border-green-300">
              <CardContent className="p-4">
                <div ref={cardRef}>
                  <div className="rounded-xl border-2 border-green-400 bg-gradient-to-br from-green-50 to-white p-6 max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-lg font-bold text-green-800">{tenant?.name || session.schoolName}</p>
                        <p className="text-xs text-green-600 font-medium">EXAMINATION CARD</p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="border-t border-green-200 pt-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Student</span>
                        <span className="text-sm font-semibold">{session.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Admission No.</span>
                        <span className="text-sm font-semibold">{session.admissionNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Class</span>
                        <span className="text-sm font-semibold">{session.className}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Card No.</span>
                        <span className="text-sm font-mono">{card.card_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Term</span>
                        <span className="text-sm font-semibold">{(card as any).academic_terms?.name || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Issued</span>
                        <span className="text-sm">{card.issued_at ? format(new Date(card.issued_at), "MMM d, yyyy") : "—"}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-green-200 text-center">
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Eligible
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1" /> Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <IdCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
            {hasBalance ? (
              <p>No exam card issued yet. Clear your fee balance above to become eligible.</p>
            ) : (
              <p>No examination cards have been issued yet. Check back after your school issues them.</p>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && cards && cards.filter(c => c.eligibility_status === "ineligible").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" /> Ineligible Cards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cards.filter(c => c.eligibility_status === "ineligible").map((card) => (
              <div key={card.id} className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Card: {card.card_number}</p>
                    <p className="text-sm text-red-600">{card.ineligibility_reason || "Fee balance outstanding"}</p>
                  </div>
                  <Badge variant="destructive">Ineligible</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
