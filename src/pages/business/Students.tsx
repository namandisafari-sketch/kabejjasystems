import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, Users, Eye, UserPlus, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StudentEnrollmentForm } from "@/components/students/StudentEnrollmentForm";
import { ReturningStudentDialog } from "@/components/students/ReturningStudentDialog";

interface Student {
  id: string;
  full_name: string;
  admission_number: string | null;
  class_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  religion: string | null;
  is_active: boolean;
  school_classes?: { name: string; level: string; grade: string } | null;
}

export default function Students() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReturningDialogOpen, setIsReturningDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [isReEnrollment, setIsReEnrollment] = useState(false);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, school_classes!class_id(name, level, grade)')
        .eq('tenant_id', tenantData!.tenantId)
        .order('full_name');
      if (error) throw error;
      return data as Student[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ formData, requirements, selectedFees }: { 
      formData: any; 
      requirements: any[]; 
      selectedFees: { fee_id: string; amount: number }[] 
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: student, error } = await supabase.from('students').insert({
        tenant_id: tenantData!.tenantId,
        admitted_by: userData?.user?.id,
        ...formData,
        class_id: formData.class_id || null,
        parent_name: formData.guardian_name,
        parent_phone: formData.guardian_phone,
        parent_email: formData.guardian_email,
      }).select().single();
      
      if (error) throw error;

      // Get current term
      const { data: currentTerm } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_current', true)
        .single();

      // Insert term requirements if any
      if (requirements.length > 0 && student && currentTerm) {
        const reqInserts = requirements.map(req => ({
          tenant_id: tenantData!.tenantId,
          student_id: student.id,
          term_id: currentTerm.id,
          requirement_id: req.requirement_id,
          is_fulfilled: req.is_fulfilled,
          fulfilled_at: req.is_fulfilled ? new Date().toISOString() : null,
        }));

        await supabase.from('student_term_requirements').insert(reqInserts);
      }

      // Create student fees record if fees were selected
      if (selectedFees.length > 0 && student && currentTerm) {
        const totalAmount = selectedFees.reduce((sum, fee) => sum + fee.amount, 0);
        
        await supabase.from('student_fees').insert({
          tenant_id: tenantData!.tenantId,
          student_id: student.id,
          term_id: currentTerm.id,
          total_amount: totalAmount,
          amount_paid: 0,
          balance: totalAmount,
          status: 'pending',
        });
      }

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-fees'] });
      toast({ title: "Student enrolled successfully" });
      setIsDialogOpen(false);
      setEditingStudent(null);
      setIsReEnrollment(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData, requirements, selectedFees }: { 
      id: string; 
      formData: any; 
      requirements: any[];
      selectedFees: { fee_id: string; amount: number }[];
    }) => {
      const { error } = await supabase.from('students').update({
        ...formData,
        class_id: formData.class_id || null,
        parent_name: formData.guardian_name,
        parent_phone: formData.guardian_phone,
        parent_email: formData.guardian_email,
      }).eq('id', id);
      
      if (error) throw error;

      // Get current term
      const { data: currentTerm } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_current', true)
        .single();

      // Update requirements
      if (requirements.length > 0 && currentTerm) {
        for (const req of requirements) {
          await supabase.from('student_term_requirements').upsert({
            tenant_id: tenantData!.tenantId,
            student_id: id,
            term_id: currentTerm.id,
            requirement_id: req.requirement_id,
            is_fulfilled: req.is_fulfilled,
            fulfilled_at: req.is_fulfilled ? new Date().toISOString() : null,
          }, { 
            onConflict: 'student_id,term_id,requirement_id' 
          });
        }
      }

      // Update student fees if fees were selected
      if (selectedFees.length > 0 && currentTerm) {
        const totalAmount = selectedFees.reduce((sum, fee) => sum + fee.amount, 0);
        
        // Check if student_fees record exists for this term
        const { data: existingFee } = await supabase
          .from('student_fees')
          .select('id')
          .eq('student_id', id)
          .eq('term_id', currentTerm.id)
          .maybeSingle();

        if (existingFee) {
          await supabase.from('student_fees').update({
            total_amount: totalAmount,
            amount_paid: 0, // Reset amount paid when updating fees
          }).eq('id', existingFee.id);
        } else {
          await supabase.from('student_fees').insert({
            tenant_id: tenantData!.tenantId,
            student_id: id,
            term_id: currentTerm.id,
            total_amount: totalAmount,
            amount_paid: 0,
            status: 'pending',
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-fees'] });
      toast({ 
        title: isReEnrollment ? "Student re-enrolled successfully" : "Student updated successfully" 
      });
      setIsDialogOpen(false);
      setEditingStudent(null);
      setIsReEnrollment(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({ title: "Student deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = async (student: Student) => {
    // Fetch full student data
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('id', student.id)
      .single();
    
    if (data) {
      setEditingStudent(data);
      setIsDialogOpen(true);
    }
  };

  const handleView = async (student: Student) => {
    const { data } = await supabase
      .from('students')
      .select('*, school_classes!class_id(name, level, grade)')
      .eq('id', student.id)
      .single();
    
    if (data) {
      setViewingStudent(data);
    }
  };

  const handleFormSubmit = (
    formData: any, 
    requirements: any[], 
    selectedFees: { fee_id: string; amount: number }[] = []
  ) => {
    // For re-enrollment, we update the existing student to reactivate them
    if (editingStudent?.id && isReEnrollment) {
      // Reactivate the student with new class
      updateMutation.mutate({ 
        id: editingStudent.id, 
        formData: {
          ...formData,
          status: 'active',
          is_active: true,
          // Keep their previous index number in a field for reference
          previous_uneb_index: editingStudent.previous_index_number || null,
        }, 
        requirements, 
        selectedFees 
      });
    } else if (editingStudent?.id) {
      updateMutation.mutate({ id: editingStudent.id, formData, requirements, selectedFees });
    } else {
      createMutation.mutate({ formData, requirements, selectedFees });
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.guardian_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle re-enrollment of a returning student
  const handleReEnrollStudent = (formerStudent: any) => {
    setIsReturningDialogOpen(false);
    setIsReEnrollment(true);
    // Pre-fill the form with student data, update status to reactivate
    setEditingStudent({
      ...formerStudent,
      // Clear class_id so they must select new class (e.g., S5 for A-Level)
      class_id: '',
      // Keep their UCE index number for reference
      previous_index_number: formerStudent.previous_index_number || '',
      // Mark as returning for special handling
      _isReturning: true,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground">Manage student enrollment and records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsReturningDialogOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Re-enroll Returning
          </Button>
          <Button onClick={() => { setEditingStudent(null); setIsReEnrollment(false); setIsDialogOpen(true); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Enroll Student
          </Button>
        </div>
      </div>

      {/* Returning Student Selection Dialog */}
      {tenantData?.tenantId && (
        <ReturningStudentDialog
          open={isReturningDialogOpen}
          onOpenChange={setIsReturningDialogOpen}
          tenantId={tenantData.tenantId}
          onSelectStudent={handleReEnrollStudent}
        />
      )}

      {/* Enrollment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setEditingStudent(null);
          setIsReEnrollment(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isReEnrollment ? (
                <>
                  <RotateCcw className="h-5 w-5" />
                  Re-enroll Returning Student
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  {editingStudent ? "Edit Student" : "Student Enrollment Form"}
                </>
              )}
            </DialogTitle>
            {isReEnrollment && editingStudent && (
              <p className="text-sm text-muted-foreground">
                Re-enrolling <strong>{editingStudent.full_name}</strong>. 
                {editingStudent.previous_index_number && (
                  <> Previous UCE Index: <strong>{editingStudent.previous_index_number}</strong></>
                )}
              </p>
            )}
          </DialogHeader>
          {tenantData?.tenantId && (
            <StudentEnrollmentForm
              tenantId={tenantData.tenantId}
              initialData={editingStudent || undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => { 
                setIsDialogOpen(false); 
                setEditingStudent(null); 
                setIsReEnrollment(false);
              }}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Student Dialog */}
      <Dialog open={!!viewingStudent} onOpenChange={() => setViewingStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {viewingStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{viewingStudent.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admission Number</p>
                  <p className="font-medium">{viewingStudent.admission_number || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-medium">
                    {viewingStudent.school_classes 
                      ? `${viewingStudent.school_classes.name} (${viewingStudent.school_classes.level})`
                      : "-"
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{viewingStudent.gender || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{viewingStudent.date_of_birth || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Religion</p>
                  <p className="font-medium capitalize">{viewingStudent.religion || "-"}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Guardian Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Guardian Name</p>
                    <p className="font-medium">{viewingStudent.guardian_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Guardian Phone</p>
                    <p className="font-medium">{viewingStudent.guardian_phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Guardian National ID</p>
                    <p className="font-medium">{viewingStudent.guardian_national_id || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Relationship</p>
                    <p className="font-medium capitalize">{viewingStudent.guardian_relationship || "-"}</p>
                  </div>
                </div>
              </div>

              {(viewingStudent.medical_conditions || viewingStudent.allergies) && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Medical Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Blood Group</p>
                      <p className="font-medium">{viewingStudent.blood_group || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Medical Conditions</p>
                      <p className="font-medium">{viewingStudent.medical_conditions || "None"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Allergies</p>
                      <p className="font-medium">{viewingStudent.allergies || "None"}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setViewingStudent(null)}>Close</Button>
                <Button onClick={() => { setViewingStudent(null); handleEdit(viewingStudent); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">{filteredStudents.length} students</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No students yet</h3>
              <p className="text-muted-foreground mb-4">Add your first student to get started</p>
              <Button onClick={() => { setEditingStudent(null); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Enroll Student
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStudents.map(student => (
                <Card key={student.id} className="p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground">{student.admission_number || "No Adm. No."}</p>
                    </div>
                    {student.school_classes && (
                      <Badge variant="secondary" className="ml-2 shrink-0">{student.school_classes.name}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Guardian: {student.guardian_name || student.parent_name || "-"}</p>
                    <p>Phone: {student.guardian_phone || student.parent_phone || "-"}</p>
                  </div>
                  <div className="flex justify-end gap-1 mt-3">
                    <Button size="sm" variant="ghost" onClick={() => handleView(student)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(student)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(student.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
