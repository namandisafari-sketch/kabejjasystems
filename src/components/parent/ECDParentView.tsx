import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Baby, Award, Sparkles, Calendar, CheckCircle2, XCircle, Users, ShieldCheck } from "lucide-react";
import { useState } from "react";
import ECDReportCardPreview from "@/components/ecd/ECDReportCardPreview";

interface ECDParentViewProps {
  studentId: string;
  studentName: string;
  tenantId: string;
}

export function ECDParentView({ studentId, studentName, tenantId }: ECDParentViewProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const { data: ecdReportCards = [] } = useQuery({
    queryKey: ["parent-ecd-report-cards", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecd_report_cards")
        .select(`*, academic_terms (name, year), school_classes (name)`)
        .eq("student_id", studentId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  const { data: studentRoles = [] } = useQuery({
    queryKey: ["parent-student-roles", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecd_student_roles")
        .select(`*, ecd_class_roles (name, badge_icon, description), academic_terms (name, year)`)
        .eq("student_id", studentId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  const { data: pickupLogs = [] } = useQuery({
    queryKey: ["parent-pickup-logs", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gate_checkins")
        .select("*")
        .eq("student_id", studentId)
        .eq("check_type", "departure")
        .order("checked_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  const { data: monthlyAttendance = [] } = useQuery({
    queryKey: ["parent-monthly-attendance", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecd_monthly_attendance")
        .select(`*, academic_terms (name, year)`)
        .eq("student_id", studentId)
        .order("year", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  const getMonthName = (month: number) => format(new Date(2024, month - 1, 1), 'MMMM');

  return (
    <div className="space-y-4">
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="progress" className="text-xs"><Award className="h-3 w-3 mr-1" /><span className="hidden sm:inline">Progress</span></TabsTrigger>
          <TabsTrigger value="roles" className="text-xs"><Sparkles className="h-3 w-3 mr-1" /><span className="hidden sm:inline">Roles</span></TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs"><Calendar className="h-3 w-3 mr-1" /><span className="hidden sm:inline">Attendance</span></TabsTrigger>
          <TabsTrigger value="pickup" className="text-xs"><ShieldCheck className="h-3 w-3 mr-1" /><span className="hidden sm:inline">Pickup</span></TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />ECD Progress Reports</CardTitle>
              <CardDescription className="text-xs">View your child's progress (Read-only - teachers enter scores)</CardDescription>
            </CardHeader>
            <CardContent>
              {ecdReportCards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Baby className="h-10 w-10 mx-auto mb-2 opacity-50" /><p className="text-sm">No published reports yet</p></div>
              ) : (
                <div className="space-y-3">
                  {ecdReportCards.map(report => (
                    <Card key={report.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedReportId(report.id); setShowReportDialog(true); }}>
                      <CardContent className="py-4 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">{report.academic_terms?.name} {report.academic_terms?.year}</h4>
                            <p className="text-xs text-muted-foreground">{report.school_classes?.name}{report.class_rank && ` • Rank: ${report.class_rank}`}</p>
                          </div>
                          <Badge variant="secondary">View & Print</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" />Class Roles</CardTitle></CardHeader>
            <CardContent>
              {studentRoles.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No roles assigned</p> : (
                <div className="space-y-3">
                  {studentRoles.map(role => (
                    <div key={role.id} className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50">
                      <span className="text-2xl">{role.ecd_class_roles?.badge_icon || '🏅'}</span>
                      <div className="flex-1"><h4 className="font-semibold text-sm">{role.ecd_class_roles?.name}</h4><p className="text-xs text-muted-foreground">{role.academic_terms?.name}</p></div>
                      <Badge className="bg-yellow-500 text-white">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" />Monthly Attendance</CardTitle></CardHeader>
            <CardContent>
              {monthlyAttendance.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No records</p> : (
                <div className="space-y-2">
                  {monthlyAttendance.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-3 rounded border">
                      <p className="font-medium text-sm">{getMonthName(att.month)} {att.year}</p>
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>{att.days_present}</span><XCircle className="h-4 w-4 text-red-500" /><span>{att.days_absent}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pickup">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Pickup Logs</CardTitle></CardHeader>
            <CardContent>
              {pickupLogs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No pickup records</p> : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {pickupLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded border">
                        <p className="text-sm">{format(new Date(log.checked_at), "MMM d, yyyy")}</p>
                        <p className="font-mono text-sm">{format(new Date(log.checked_at), "h:mm a")}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Progress Report Card</DialogTitle></DialogHeader>
          {selectedReportId && <ECDReportCardPreview reportCardId={selectedReportId} onClose={() => setShowReportDialog(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
