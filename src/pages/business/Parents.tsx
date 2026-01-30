import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserPlus, Link2, Unlink, Search, Mail, Phone } from "lucide-react";

interface Parent {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  students: {
    id: string;
    student_id: string;
    relationship: string;
    student: {
      id: string;
      full_name: string;
      admission_number: string | null;
      class: { name: string } | null;
    };
  }[];
}

interface Student {
  id: string;
  full_name: string;
  admission_number: string | null;
  class: { name: string } | null;
}

export default function Parents() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [relationship, setRelationship] = useState("parent");

  // Fetch parents with their linked students
  const { data: parents = [], isLoading } = useQuery({
    queryKey: ["parents", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("parents")
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          students:parent_students(
            id,
            student_id,
            relationship,
            student:students(
              id,
              full_name,
              admission_number,
              class:school_classes!class_id(name)
            )
          )
        `)
        .eq("tenant_id", tenantId)
        .order("full_name");
      
      if (error) throw error;
      return data as Parent[];
    },
    enabled: !!tenantId,
  });

  // Fetch all students for linking
  const { data: allStudents = [] } = useQuery({
    queryKey: ["students-for-linking", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          full_name,
          admission_number,
          class:school_classes!class_id(name)
        `)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!tenantId,
  });

  // Link student to parent
  const linkStudentMutation = useMutation({
    mutationFn: async ({ parentId, studentId, relationship }: { parentId: string; studentId: string; relationship: string }) => {
      const { error } = await supabase
        .from("parent_students")
        .insert({
          parent_id: parentId,
          student_id: studentId,
          tenant_id: tenantId!,
          relationship,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student linked successfully");
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      setLinkDialogOpen(false);
      setSelectedStudent("");
      setRelationship("parent");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to link student");
    },
  });

  // Unlink student from parent
  const unlinkStudentMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("parent_students")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student unlinked");
      queryClient.invalidateQueries({ queryKey: ["parents"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to unlink student");
    },
  });

  const filteredParents = parents.filter(parent =>
    parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.phone?.includes(searchTerm)
  );

  const getAvailableStudents = (parent: Parent) => {
    const linkedStudentIds = parent.students.map(s => s.student_id);
    return allStudents.filter(s => !linkedStudentIds.includes(s.id));
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Parents Management
          </h1>
          <p className="text-muted-foreground">
            View parent accounts and link them to students
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Parents</CardTitle>
          <CardDescription>
            Parents who have signed up using your school code. Link students to their accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {parents.length} parent{parents.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading parents...</div>
          ) : filteredParents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No parents match your search" : "No parents registered yet"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Linked Students</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.map((parent) => (
                  <TableRow key={parent.id}>
                    <TableCell className="font-medium">{parent.full_name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {parent.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {parent.email}
                          </div>
                        )}
                        {parent.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {parent.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {parent.students.length === 0 ? (
                        <span className="text-muted-foreground text-sm">No students linked</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {parent.students.map((link) => (
                            <Badge key={link.id} variant="outline" className="gap-1">
                              {link.student.full_name}
                              {link.student.class && (
                                <span className="text-xs text-muted-foreground">
                                  ({link.student.class.name})
                                </span>
                              )}
                              <button
                                onClick={() => unlinkStudentMutation.mutate(link.id)}
                                className="ml-1 hover:text-destructive"
                                title="Unlink student"
                              >
                                <Unlink className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={linkDialogOpen && selectedParent?.id === parent.id} onOpenChange={(open) => {
                        setLinkDialogOpen(open);
                        if (open) setSelectedParent(parent);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Link2 className="h-4 w-4" />
                            Link Student
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Link Student to {parent.full_name}</DialogTitle>
                            <DialogDescription>
                              Select a student to link to this parent's account.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Student</Label>
                              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a student" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableStudents(parent).map((student) => (
                                    <SelectItem key={student.id} value={student.id}>
                                      {student.full_name}
                                      {student.admission_number && ` (${student.admission_number})`}
                                      {student.class && ` - ${student.class.name}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {getAvailableStudents(parent).length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  All students are already linked to this parent.
                                </p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Relationship</Label>
                              <Select value={relationship} onValueChange={setRelationship}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="parent">Parent</SelectItem>
                                  <SelectItem value="guardian">Guardian</SelectItem>
                                  <SelectItem value="mother">Mother</SelectItem>
                                  <SelectItem value="father">Father</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button
                              onClick={() => linkStudentMutation.mutate({
                                parentId: parent.id,
                                studentId: selectedStudent,
                                relationship,
                              })}
                              disabled={!selectedStudent || linkStudentMutation.isPending}
                            >
                              {linkStudentMutation.isPending ? "Linking..." : "Link Student"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}