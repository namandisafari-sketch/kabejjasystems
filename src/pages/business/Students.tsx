import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import { Plus, Search, Pencil, Trash2, Users, Eye, UserPlus, RotateCcw, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StudentEnrollmentForm } from "@/components/students/StudentEnrollmentForm";
import { ReturningStudentDialog } from "@/components/students/ReturningStudentDialog";
import { generatePortalEmail, createStudentPortalAccount } from "@/lib/student-portal-utils";

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
  email?: string | null;
  user_id?: string | null;
  is_active: boolean;
  school_classes?: { name: string; level: string; grade: string } | null;
}

export default function Students() {
  const { t } = useLanguage();
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReturningDialogOpen, setIsReturningDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
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
       
       // Auto-generate portal email from admission number
       // Format: admissionnumber@ttl.student
       let portalEmail = generatePortalEmail(
         formData.full_name.split(' ')[0],
         formData.full_name.split(' ').slice(1).join(' ') || formData.full_name,
         formData.admission_number
       );
       
       // Create portal account
       let portalUserId: string | null = null;
       if (portalEmail) {
         const accountResult = await createStudentPortalAccount(
           formData.full_name.split(' ')[0],
           formData.full_name.split(' ').slice(1).join(' ') || formData.full_name,
           formData.admission_number,
           tenantData!.tenantId,
           tenantData?.tenantName || 'School'
         );
         
         if (accountResult.success && accountResult.userId) {
           portalUserId = accountResult.userId;
         } else {
           // Log warning but don't fail the enrollment if portal account creation fails
           console.warn('Portal account creation failed:', accountResult.error);
           toast({ 
             title: "Warning", 
             description: `Student enrolled but portal account creation failed: ${accountResult.error}`,
             variant: "destructive"
           });
         }
       }
       
       const { data: student, error } = await supabase.from('students').insert({
         tenant_id: tenantData!.tenantId,
         admitted_by: userData?.user?.id,
         ...formData,
         email: portalEmail,
         notification_email: formData.notification_email || null,
         user_id: portalUserId,
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
     onSuccess: (student) => {
       queryClient.invalidateQueries({ queryKey: ['students'] });
       queryClient.invalidateQueries({ queryKey: ['student-fees'] });
       const notificationEmail = student?.notification_email ? ` | Notifications: ${student.notification_email}` : '';
       const message = `Student enrolled successfully. Portal: ${student?.email}${notificationEmail}`;
       toast({ title: message });
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
        // Auto-generate portal email from admission number
        // Format: admissionnumber@ttl.student
        const portalEmail = generatePortalEmail(
          formData.full_name.split(' ')[0],
          formData.full_name.split(' ').slice(1).join(' ') || formData.full_name,
          formData.admission_number
        );

        const { error } = await supabase.from('students').update({
          ...formData,
          email: portalEmail,
          notification_email: formData.notification_email || null,
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
    setViewingStudent(student);
    setIsViewDialogOpen(true);

    const { data, error } = await supabase
      .from('students')
      .select('*, school_classes!class_id(name, level, grade)')
      .eq('id', student.id)
      .single();

    if (error) {
      toast({ title: 'Could not load student details', description: error.message, variant: 'destructive' });
      return;
    }

    if (data) {
      setViewingStudent({ ...student, ...data });
    }
  };

  const handleResetPassword = async () => {
    if (!viewingStudent?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(viewingStudent.email);
    if (error) {
      toast({ title: 'Reset failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Password reset email sent', description: `Reset link sent to ${viewingStudent.email}` });
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
    setEditingStudent({
      ...formerStudent,
      class_id: '',
      previous_index_number: formerStudent.previous_index_number || '',
      _isReturning: true,
    });
    setIsDialogOpen(true);
  };

  const handlePrintDossier = async (student: Student) => {
    if (!tenantData?.tenantId) return;
    const [studentRes, tenantRes] = await Promise.all([
      supabase.from('students').select('*, school_classes!class_id(name, level, grade)').eq('id', student.id).single(),
      supabase.from('tenants').select('name').eq('id', tenantData.tenantId).single(),
    ]);
    const full = studentRes.data;
    if (!full) return;
    const schoolName = (tenantRes.data as any)?.name || 'School';

    // Field map: all student columns organized by section
    // exclude internal/system fields from the dossier
    const hidden = new Set(['id','tenant_id','class_id','created_by','created_at','updated_at','admitted_by','photo_url']);
    const sections: { title: string; fields: [string, string][] }[] = [
      { title: 'Personal Information', fields: [
        ['Full Name', 'full_name'],
        ['First Name', 'first_name'],
        ['Last Name', 'last_name'],
        ['Admission Number', 'admission_number'],
        ['Class', '_class'],
        ['Gender', '_gender'],
        ['Date of Birth', 'date_of_birth'],
        ['Religion', 'religion'],
        ['Nationality', 'nationality'],
        ['Place of Birth', 'place_of_birth'],
        ['Home District', 'home_district'],
        ['Student National ID', 'student_national_id'],
        ['NIN Number', 'nin_number'],
        ['Birth Certificate Number', 'birth_certificate_number'],
        ['Birth Certificate No', 'birth_certificate_no'],
        ['Address', 'address'],
      ]},
      { title: 'Admission Details', fields: [
        ['Admission Date', 'admission_date'],
        ['Admission Status', 'admission_status'],
        ['Status', '_active'],
        ['Previous School', 'previous_school'],
        ['Previous School Name', 'previous_school_name'],
        ['Previous School Address', 'previous_school_address'],
        ['Previous Class', 'previous_class'],
        ['Reason for Leaving', 'reason_for_leaving'],
        ['Previous School Leaving Reason', 'previous_school_leaving_reason'],
        ['Academic Report Notes', 'academic_report_notes'],
        ['Admission Notes', 'admission_notes'],
        ['Suggested Class Level', 'suggested_class_level'],
        ['Boarding Status', 'boarding_status'],
        ['Payment Status', 'payment_status'],
        ['Orientation Completed', '_orientation'],
        ['Parent Portal Access', '_parent_portal'],
      ]},
      { title: 'Guardian Information', fields: [
        ['Guardian Name', 'guardian_name'],
        ['Guardian Relationship', 'guardian_relationship'],
        ['Guardian Phone', 'guardian_phone'],
        ['Guardian Email', 'guardian_email'],
        ['Guardian Occupation', 'guardian_occupation'],
        ['Guardian Address', 'guardian_address'],
        ['Guardian National ID', 'guardian_national_id'],
        ['Parent Name', 'parent_name'],
        ['Parent Phone', 'parent_phone'],
        ['Parent Email', 'parent_email'],
      ]},
      { title: 'Father&rsquo;s Information', fields: [
        ['Father Name', 'father_name'],
        ['Father Phone', 'father_phone'],
        ['Father Occupation', 'father_occupation'],
        ['Father National ID', 'father_national_id'],
      ]},
      { title: 'Mother&rsquo;s Information', fields: [
        ['Mother Name', 'mother_name'],
        ['Mother Phone', 'mother_phone'],
        ['Mother Occupation', 'mother_occupation'],
        ['Mother National ID', 'mother_national_id'],
      ]},
      { title: 'Emergency Contact', fields: [
        ['Emergency Contact Name', 'emergency_contact_name'],
        ['Emergency Contact Phone', 'emergency_contact_phone'],
        ['Emergency Contact Relationship', 'emergency_contact_relationship'],
      ]},
      { title: 'Medical Information', fields: [
        ['Blood Group', 'blood_group'],
        ['Medical Conditions', 'medical_conditions'],
        ['Allergies', 'allergies'],
        ['Disabilities', 'disabilities'],
        ['Immunization Status', 'immunization_status'],
      ]},
      { title: 'Additional Information', fields: [
        ['Talent', 'talent'],
        ['Special Talent', 'special_talent'],
        ['Consecutive Absence Days', 'consecutive_absence_days'],
        ['Previous Index Number', 'previous_index_number'],
        ['SchoolPay Code', 'schoolpay_payment_code'],
      ]},
    ];

    const val = (key: string): string => {
      if (key === '_class') return full.school_classes ? full.school_classes.name + (full.school_classes.level ? ' (' + full.school_classes.level + ')' : '') : '-';
      if (key === '_gender') return full.gender ? full.gender.charAt(0).toUpperCase() + full.gender.slice(1) : '-';
      if (key === '_active') return full.is_active ? 'Active' : 'Inactive';
      if (key === '_orientation') return full.orientation_completed ? 'Yes' : 'No';
      if (key === '_parent_portal') return full.parent_portal_access ? 'Enabled' : 'Disabled';
      const v = full[key];
      if (v === null || v === undefined || v === '') return '-';
      return String(v);
    };

    let body = '';
    for (const section of sections) {
      let rows = '';
      for (const [label, key] of section.fields) {
        const v = val(key);
        if (v !== '-') rows += `    <tr><td class="l">${label}</td><td class="v">${v}</td></tr>\n`;
      }
      if (rows) body += `<div class="sec">${section.title}</div>\n<table>\n${rows}</table>\n`;
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${full.full_name} - Dossier</title>
<style>
  @page { margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; color: #1a1a1a; padding: 24px; font-size: 14px; line-height: 1.5; }
  .header { text-align: center; border-bottom: 2px solid #c9a34e; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #5c3d0e; letter-spacing: 1px; }
  .header p { font-size: 13px; color: #666; margin-top: 4px; }
  .dossier-title { text-align: center; font-size: 17px; font-weight: bold; color: #5c3d0e; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  td { padding: 5px 10px; border: 1px solid #d4c4a0; vertical-align: top; }
  td.l { width: 33%; font-weight: 600; background: #faf3e0; color: #5c3d0e; }
  td.v { width: 67%; }
  .sec { font-size: 15px; font-weight: bold; color: #5c3d0e; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #c9a34e; }
  .foot { text-align: center; margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
</style></head><body>
  <div class="header"><h1>${schoolName}</h1><p>Student Dossier &mdash; Confidential</p></div>
  <div class="dossier-title">Learner&rsquo;s Record File</div>
${body}  <div class="foot">Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} &mdash; ${schoolName}</div>
  <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>
</body></html>`;

    const pw = window.open('', '_blank');
    if (pw) { pw.document.write(html); pw.document.close(); }
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
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setViewingStudent(null);
            setIsViewDialogOpen(false);
          }
        }}>
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
                 <h4 className="font-semibold mb-2">Student Portal & Notifications</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-sm text-muted-foreground">Portal Email (Login)</p>
                     <p className="font-medium font-mono">{viewingStudent.email || "-"}</p>
                     <p className="text-xs text-muted-foreground mt-1">Format: admissionnumber@ttl.student + school code</p>
                   </div>
                   <div>
                     <p className="text-sm text-muted-foreground">Portal Status</p>
                     <p className="font-medium">{viewingStudent.user_id ? "Enabled" : "Not configured"}</p>
                   </div>
                   <div>
                     <p className="text-sm text-muted-foreground">Notification Email</p>
                     <p className="font-medium">{viewingStudent.notification_email || "-"}</p>
                     <p className="text-xs text-muted-foreground mt-1">Receives grades, announcements, updates</p>
                   </div>
                   <div>
                     <p className="text-sm text-muted-foreground">Portal User ID</p>
                     <p className="font-medium font-mono text-xs break-all">{viewingStudent.user_id || "-"}</p>
                   </div>
                 </div>
                 {viewingStudent.email && viewingStudent.user_id && (
                   <div className="pt-4 flex flex-col sm:flex-row gap-2">
                     <Button variant="outline" onClick={handleResetPassword}>
                       Reset portal password
                     </Button>
                     <p className="text-sm text-muted-foreground sm:flex-1">
                       Send a reset link to the student portal email so they can choose a new password.
                     </p>
                   </div>
                 )}
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
                <Button variant="outline" onClick={() => {
                  setViewingStudent(null);
                  setIsViewDialogOpen(false);
                }}>
                  Close
                </Button>
                <Button onClick={() => {
                  setViewingStudent(null);
                  setIsViewDialogOpen(false);
                  handleEdit(viewingStudent);
                }}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStudents.map(student => (
                <div key={student.id} className="relative group cursor-pointer" onClick={() => handleView(student)}>
                  <svg viewBox="0 0 680 500" className="w-full h-auto hover:drop-shadow-xl transition-all duration-200 hover:-translate-y-0.5" role="img" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <filter id="folder-shadow" x="-2%" y="-2%" width="106%" height="110%">
                        <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#b8a87a" flood-opacity="0.35"/>
                      </filter>
                    </defs>
                    <g filter="url(#folder-shadow)">
                      <rect x="60" y="118" width="560" height="342" rx="3" fill="#e8d9a8" stroke="#c9b87a" strokeWidth="0.8"/>
                      <path d="M160,118 L160,98 Q160,92 166,92 L266,92 Q272,92 272,98 L272,118 Z" fill="#e8d9a8" stroke="#c9b87a" strokeWidth="0.8"/>
                      <rect x="60" y="128" width="560" height="332" rx="3" fill="#f0e0b0" stroke="#c9b87a" strokeWidth="0.8"/>
                      <line x1="60" y1="135" x2="620" y2="135" stroke="#c9b87a" strokeWidth="0.4" opacity="0.5"/>
                      <line x1="67" y1="128" x2="67" y2="460" stroke="#c9b87a" strokeWidth="0.4" opacity="0.4"/>
                      <line x1="613" y1="128" x2="613" y2="460" stroke="#c9b87a" strokeWidth="0.4" opacity="0.4"/>
                      <line x1="60" y1="453" x2="620" y2="453" stroke="#c9b87a" strokeWidth="0.4" opacity="0.4"/>
                      <text x="216" y="112" textAnchor="middle" fill="#7a5c22" fontSize="13" fontWeight="700">
                        {student.admission_number || "NEW"}
                      </text>
                    </g>
                  </svg>
                  {/* Content overlaid on folder */}
                  <div className="absolute inset-0 pt-[19%] pb-[7%] px-[11%] flex flex-col text-[11px] leading-tight">
                    <p className="font-bold text-[13px] text-amber-950 truncate">{student.full_name}</p>
                    {student.school_classes && (
                      <span className="text-amber-800/70 font-medium text-[10px]">{student.school_classes.name}</span>
                    )}
                    <div className="flex-1 min-h-[4px]" />
                    <div className="space-y-0.5 text-amber-900/80 text-[10px]">
                      <p className="truncate"><span className="font-medium">Guardian:</span> {student.guardian_name || student.parent_name || "-"}</p>
                      <p className="truncate"><span className="font-medium">Phone:</span> {student.guardian_phone || student.parent_phone || "-"}</p>
                      {student.gender && <p><span className="font-medium">Gender:</span> <span className="capitalize">{student.gender}</span></p>}
                    </div>
                    <div className="flex justify-end gap-0.5 mt-1 pt-1 border-t border-amber-300/40">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-amber-200/50 text-amber-700" title="View" onClick={(e) => { e.stopPropagation(); handleView(student); }}>
                        <Eye className="h-3 w-3" />
                      </span>
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-amber-200/50 text-amber-700" title="Edit" onClick={(e) => { e.stopPropagation(); handleEdit(student); }}>
                        <Pencil className="h-3 w-3" />
                      </span>
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-amber-200/50 text-amber-700" title="Print Dossier" onClick={(e) => { e.stopPropagation(); handlePrintDossier(student); }}>
                        <Printer className="h-3 w-3" />
                      </span>
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-red-200/50 text-red-600" title="Delete" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(student.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
