import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar, Power } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ExamSession {
  id: string;
  year: number;
  level: string;
  session_name: string;
  results_released_date?: string;
  is_active: boolean;
  created_at: string;
}

const EXAM_LEVELS = ["UCE (S.4)", "UACE (S.6)", "PLE (P.7)"];

export default function ExamSessions() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ExamSession | null>(null);
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    year: currentYear.toString(),
    level: "UCE (S.4)",
    session_name: "May/June",
    results_released_date: "",
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['exam-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .order('year', { ascending: false })
        .order('session_name', { ascending: true });
      if (error) throw error;
      return data as ExamSession[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('exam_sessions').insert({
        year: parseInt(data.year),
        level: data.level,
        session_name: data.session_name,
        results_released_date: data.results_released_date || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-sessions'] });
      toast({ title: "Exam session created successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Could not create exam session", 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase.from('exam_sessions').update({
        year: parseInt(data.year),
        level: data.level,
        session_name: data.session_name,
        results_released_date: data.results_released_date || null,
      }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-sessions'] });
      toast({ title: "Exam session updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Could not update exam session", 
        variant: "destructive" 
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('exam_sessions')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-sessions'] });
      toast({ title: "Session status updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exam_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-sessions'] });
      toast({ title: "Exam session deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      year: currentYear.toString(),
      level: "UCE (S.4)",
      session_name: "May/June",
      results_released_date: "",
    });
    setEditingSession(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (session: ExamSession) => {
    setEditingSession(session);
    setFormData({
      year: session.year.toString(),
      level: session.level,
      session_name: session.session_name,
      results_released_date: session.results_released_date ? 
        session.results_released_date.split('T')[0] : "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.year || !formData.level || !formData.session_name) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingSession) {
      updateMutation.mutate({ ...formData, id: editingSession.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Exam Sessions
          </h1>
          <p className="text-gray-600 mt-2">
            Create and manage exam sessions for your school
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSession ? "Edit Exam Session" : "Create New Exam Session"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  min="2020"
                  max={currentYear + 10}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2025"
                />
              </div>

              <div>
                <Label htmlFor="level">Exam Level *</Label>
                <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="session_name">Session Name *</Label>
                <Select value={formData.session_name} onValueChange={(value) => setFormData({ ...formData, session_name: value })}>
                  <SelectTrigger id="session_name">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="May/June">May/June</SelectItem>
                    <SelectItem value="November/December">November/December</SelectItem>
                    <SelectItem value="March/April">March/April</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="results_released_date">Results Release Date</Label>
                <Input
                  id="results_released_date"
                  type="date"
                  value={formData.results_released_date}
                  onChange={(e) => setFormData({ ...formData, results_released_date: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingSession ? "Update Session" : "Create Session"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Exam Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No exam sessions created yet</p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Session
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Release Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-semibold">{session.year}</TableCell>
                      <TableCell>{session.level}</TableCell>
                      <TableCell>{session.session_name}</TableCell>
                      <TableCell>
                        {session.results_released_date
                          ? format(new Date(session.results_released_date), "MMM dd, yyyy")
                          : "Not set"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={session.is_active ? "default" : "secondary"}
                          className={session.is_active ? "bg-green-600" : "bg-gray-600"}
                        >
                          {session.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(session.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleActiveMutation.mutate({ id: session.id, isActive: session.is_active })}
                            title={session.is_active ? "Deactivate" : "Activate"}
                          >
                            <Power className={`h-4 w-4 ${session.is_active ? "text-green-600" : "text-gray-400"}`} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(session)}
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Delete this exam session? This cannot be undone.")) {
                                deleteMutation.mutate(session.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">About Exam Sessions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Create exam sessions for UCE (S.4), UACE (S.6), and PLE (P.7)</li>
            <li>• Sessions determine which results students can view</li>
            <li>• Mark sessions as inactive to hide them from students</li>
            <li>• Set a release date to track when results will be published</li>
            <li>• You can import exam results once a session is created</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
