import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Calendar, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { format, parseISO, isAfter } from "date-fns";
import { useState } from "react";

interface DisciplineCasesViewProps {
  studentId: string;
  studentName: string;
}

const incidentTypes: Record<string, string> = {
  minor_offense: 'Minor Offense',
  major_offense: 'Major Offense',
  behavioral: 'Behavioral Issue',
  academic_dishonesty: 'Academic Dishonesty',
  bullying: 'Bullying',
  vandalism: 'Vandalism',
  other: 'Other',
};

const actionTypes: Record<string, string> = {
  warning: 'Warning',
  detention: 'Detention',
  suspension: 'Suspension',
  expulsion: 'Expulsion',
  counseling: 'Counseling',
  parent_meeting: 'Parent Meeting',
  community_service: 'Community Service',
};

export function DisciplineCasesView({ studentId, studentName }: DisciplineCasesViewProps) {
  const queryClient = useQueryClient();
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [response, setResponse] = useState("");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['parent-discipline-cases', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discipline_cases')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async ({ caseId, parentResponse }: { caseId: string; parentResponse?: string }) => {
      const { error } = await supabase
        .from('discipline_cases')
        .update({
          parent_acknowledged: true,
          parent_acknowledged_at: new Date().toISOString(),
          parent_response: parentResponse || null,
        })
        .eq('id', caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-discipline-cases'] });
      toast.success("Response submitted successfully");
      setSelectedCase(null);
      setResponse("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading discipline records...</div>;
  }

  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
          <p className="text-lg font-medium">No Discipline Cases</p>
          <p className="text-muted-foreground">{studentName} has no recorded discipline cases.</p>
        </CardContent>
      </Card>
    );
  }

  // Check for active suspension
  const activeSuspension = cases.find(
    c => c.action_taken === 'suspension' && 
    c.suspension_end_date && 
    isAfter(parseISO(c.suspension_end_date), new Date())
  );

  // Check for expulsion
  const expulsion = cases.find(c => c.action_taken === 'expulsion');

  return (
    <div className="space-y-4">
      {/* Alert Banner for Active Suspension */}
      {activeSuspension && (
        <Card className="border-orange-500 bg-orange-500/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-700">Active Suspension</p>
                <p className="text-sm text-orange-600">
                  {studentName} is currently suspended until{' '}
                  {format(parseISO(activeSuspension.suspension_end_date!), 'MMMM d, yyyy')}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Banner for Expulsion */}
      {expulsion && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Expelled</p>
                <p className="text-sm text-destructive/80">
                  {studentName} was expelled on{' '}
                  {expulsion.expulsion_date ? format(parseISO(expulsion.expulsion_date), 'MMMM d, yyyy') : 'N/A'}.
                  {expulsion.is_permanent_expulsion && ' This is a permanent expulsion.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Discipline History</CardTitle>
          <CardDescription>View all discipline cases for {studentName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cases.map((c) => (
            <Card key={c.id} className={!c.parent_acknowledged && c.parent_notified ? 'border-yellow-500' : ''}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{c.case_number}</Badge>
                      <Badge className={
                        c.action_taken === 'expulsion' ? 'bg-destructive' : 
                        c.action_taken === 'suspension' ? 'bg-orange-500' : 
                        'bg-yellow-500'
                      }>
                        {actionTypes[c.action_taken] || c.action_taken}
                      </Badge>
                      <Badge variant="secondary">
                        {incidentTypes[c.incident_type] || c.incident_type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(parseISO(c.incident_date), 'MMMM d, yyyy')}</span>
                    </div>

                    <p className="text-sm">{c.incident_description}</p>

                    {c.suspension_end_date && (
                      <div className="flex items-center gap-2 text-sm p-2 bg-orange-500/10 rounded">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span>
                          Return Date: {format(parseISO(c.suspension_end_date), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}

                    {c.action_details && (
                      <p className="text-sm text-muted-foreground italic">
                        Note: {c.action_details}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {c.parent_notified && !c.parent_acknowledged && (
                      <Dialog open={selectedCase === c.id} onOpenChange={(open) => setSelectedCase(open ? c.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Acknowledge Discipline Case</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Please acknowledge that you have been notified of this discipline case.
                              You may optionally provide a response.
                            </p>
                            <Textarea
                              placeholder="Your response (optional)..."
                              value={response}
                              onChange={(e) => setResponse(e.target.value)}
                              rows={4}
                            />
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                onClick={() => setSelectedCase(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => acknowledgeMutation.mutate({ 
                                  caseId: c.id, 
                                  parentResponse: response 
                                })}
                                disabled={acknowledgeMutation.isPending}
                              >
                                {acknowledgeMutation.isPending ? "Submitting..." : "Submit"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {c.parent_acknowledged && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        Acknowledged
                      </div>
                    )}
                    {c.parent_response && (
                      <p className="text-xs text-muted-foreground max-w-[200px] text-right">
                        Your response: "{c.parent_response}"
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
