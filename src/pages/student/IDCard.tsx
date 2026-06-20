import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSession } from "@/pages/StudentLogin";
import StudentIDCard from "@/components/students/StudentIDCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

export default function StudentIDCardPage() {
  const session = getStudentSession()!;
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ["student-id-card", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("full_name, admission_number, date_of_birth, gender, photo_url")
        .eq("id", session.studentId)
        .single();
      return data;
    },
  });

  const { data: schoolSettings } = useQuery({
    queryKey: ["student-school-settings", session.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("school_settings")
        .select("id_prefix, id_digits")
        .eq("tenant_id", session.tenantId)
        .maybeSingle();
      return data;
    },
  });

  const { data: tenant } = useQuery({
    queryKey: ["student-tenant", session.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("name, logo_url, phone")
        .eq("id", session.tenantId)
        .single();
      return data;
    },
  });

  const handlePrint = () => {
    if (!cardRef.current) return;
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student ID Card</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; display: flex; justify-content: center; padding: 20px; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${cardRef.current.innerHTML}
        </body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => { printWin.print(); printWin.close(); }, 500);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    toast({ title: "Generating image..." });
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `ID-Card-${session.admissionNumber || session.studentId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "ID card downloaded as PNG" });
    } catch {
      toast({ variant: "destructive", title: "Failed to generate image" });
    }
  };

  if (studentLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My ID Card</CardTitle>
          <CardDescription>View, print, or download your school identification card</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center" ref={cardRef}>
            <StudentIDCard
              student={{
                id: session.studentId,
                full_name: student?.full_name || session.fullName,
                admission_number: session.admissionNumber,
                date_of_birth: student?.date_of_birth || null,
                gender: student?.gender || null,
                photo_url: student?.photo_url || null,
              }}
              schoolName={session.schoolName}
              schoolLogo={tenant?.logo_url || null}
              schoolPhone={tenant?.phone || null}
              className={session.className}
              forPrint
              idPrefix={schoolSettings?.id_prefix || "STU"}
              idDigits={schoolSettings?.id_digits || 4}
            />
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={handlePrint} variant="default">
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" /> Save as PNG
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
