import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, CreditCard, Users, Download, FileArchive, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import StudentIDCard from "@/components/students/StudentIDCard";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { toast } from "sonner";

interface Student {
  id: string;
  full_name: string;
  admission_number: string | null;
  class_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  is_active: boolean;
  student_index?: number;
}

interface SchoolClass {
  id: string;
  name: string;
}

export default function StudentCards() {
  const { data: tenantData } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "class" | "admission">("name");
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Student[];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['school_classes', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_classes')
        .select('id, name')
        .eq('tenant_id', tenantData!.tenantId)
        .order('name');
      if (error) throw error;
      return data as SchoolClass[];
    },
  });

  const { data: tenant } = useQuery({
    queryKey: ['tenant', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('name, logo_url, phone, email, address')
        .eq('id', tenantData!.tenantId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: schoolSettings } = useQuery({
    queryKey: ['school-settings', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('student_id_prefix, student_id_digits')
        .eq('tenant_id', tenantData!.tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const getClassName = (classId: string | null) => {
    if (!classId) return "N/A";
    const cls = classes.find(c => c.id === classId);
    return cls?.name || "N/A";
  };

  // Format student ID based on settings
  const formatStudentId = (index: number) => {
    const prefix = schoolSettings?.student_id_prefix || 'STU';
    const digits = schoolSettings?.student_id_digits || 4;
    return `${prefix}-${String(index + 1).padStart(digits, '0')}`;
  };

  // Filter by search and class
  const filteredStudents = students
    .filter(s => {
      const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admission_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = classFilter === "all" || s.class_id === classFilter;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.full_name.localeCompare(b.full_name);
      if (sortBy === "admission") return (a.admission_number || "").localeCompare(b.admission_number || "");
      if (sortBy === "class") return getClassName(a.class_id).localeCompare(getClassName(b.class_id));
      return 0;
    });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  const handleSelectClass = (classId: string) => {
    const studentsInClass = filteredStudents.filter(s => s.class_id === classId);
    const allSelected = studentsInClass.every(s => selectedStudents.includes(s.id));
    
    if (allSelected) {
      // Deselect all from this class
      setSelectedStudents(selectedStudents.filter(id => !studentsInClass.some(s => s.id === id)));
    } else {
      // Select all from this class
      const newSelection = [...selectedStudents];
      studentsInClass.forEach(s => {
        if (!newSelection.includes(s.id)) newSelection.push(s.id);
      });
      setSelectedStudents(newSelection);
    }
  };

  const selectedStudentData = students.filter(s => selectedStudents.includes(s.id));

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = printRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student ID Cards</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; }
            .cards-container {
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              padding: 20px;
              justify-content: center;
              background: white;
            }
            .card-wrapper {
              page-break-inside: avoid;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
              .cards-container { padding: 10px; gap: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="cards-container">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownloadZip = async () => {
    if (!printRef.current || selectedStudents.length === 0) return;

    setIsDownloading(true);
    toast.info("Generating ZIP file with ID cards...");

    const container = printRef.current.parentElement;
    if (container) {
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.display = 'block';
      container.classList.remove('hidden');
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const zip = new JSZip();
    const cardWrappers = printRef.current.querySelectorAll('.card-wrapper');
    
    for (let i = 0; i < cardWrappers.length; i++) {
      const wrapper = cardWrappers[i] as HTMLElement;
      const student = selectedStudentData[i];
      const studentName = student?.full_name.replace(/[^a-zA-Z0-9]/g, '_') || `student_${i + 1}`;
      const className = getClassName(student?.class_id).replace(/[^a-zA-Z0-9]/g, '_');
      
      const frontCard = wrapper.querySelector('[data-card-front]') as HTMLElement;
      const backCard = wrapper.querySelector('[data-card-back]') as HTMLElement;
      
      try {
        if (frontCard) {
          const frontCanvas = await html2canvas(frontCard, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
          });
          const frontBlob = await new Promise<Blob>((resolve) => {
            frontCanvas.toBlob((blob) => resolve(blob!), 'image/png');
          });
          zip.file(`${className}/${studentName}_FRONT.png`, frontBlob);
        }

        if (backCard) {
          const backCanvas = await html2canvas(backCard, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
          });
          const backBlob = await new Promise<Blob>((resolve) => {
            backCanvas.toBlob((blob) => resolve(blob!), 'image/png');
          });
          zip.file(`${className}/${studentName}_BACK.png`, backBlob);
        }
      } catch (error) {
        console.error('Error generating card:', error);
      }
    }

    if (container) {
      container.style.position = '';
      container.style.left = '';
      container.style.top = '';
      container.style.display = '';
      container.classList.add('hidden');
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Student_ID_Cards_${new Date().toISOString().split('T')[0]}.zip`;
    link.click();
    URL.revokeObjectURL(url);

    setIsDownloading(false);
    toast.success(`Downloaded ZIP with ${selectedStudents.length * 2} card images`);
  };

  // Group students by class for selection shortcuts
  const studentsByClass = classes.map(cls => ({
    ...cls,
    students: filteredStudents.filter(s => s.class_id === cls.id),
    allSelected: filteredStudents.filter(s => s.class_id === cls.id).every(s => selectedStudents.includes(s.id)),
  })).filter(c => c.students.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Student ID Cards</h1>
          <p className="text-sm text-muted-foreground">Generate and print student ID cards with payment barcodes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            onClick={handleDownloadZip} 
            disabled={selectedStudents.length === 0 || isDownloading}
            size="sm"
          >
            <FileArchive className="h-4 w-4 mr-2" />
            {isDownloading ? "Creating..." : `ZIP (${selectedStudents.length})`}
          </Button>
          <Button 
            onClick={handlePrint} 
            disabled={selectedStudents.length === 0}
            size="sm"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print ({selectedStudents.length})
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                <p className="text-lg md:text-2xl font-bold">{students.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-green-500/10 rounded-lg">
                <CreditCard className="h-4 w-4 md:h-6 md:w-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Selected</p>
                <p className="text-lg md:text-2xl font-bold">{selectedStudents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-blue-500/10 rounded-lg">
                <Printer className="h-4 w-4 md:h-6 md:w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Filtered</p>
                <p className="text-lg md:text-2xl font-bold">{filteredStudents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-purple-500/10 rounded-lg">
                <FileArchive className="h-4 w-4 md:h-6 md:w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Classes</p>
                <p className="text-lg md:text-2xl font-bold">{classes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Class Selection */}
      {studentsByClass.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Select by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {studentsByClass.map(cls => (
                <Button
                  key={cls.id}
                  variant={cls.allSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectClass(cls.id)}
                  className="text-xs"
                >
                  {cls.name} ({cls.students.length})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Selection */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[130px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="admission">Admission #</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <h3 className="text-lg font-medium">No students found</h3>
              <p className="text-muted-foreground">Add students first to generate ID cards</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Admission No.</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="hidden md:table-cell">Gender</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map(student => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked) => handleSelectStudent(student.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {student.full_name}
                          <span className="block sm:hidden text-xs text-muted-foreground">
                            {student.admission_number || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{student.admission_number || "-"}</TableCell>
                      <TableCell>{getClassName(student.class_id)}</TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{student.gender || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {selectedStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Card Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedStudentData.slice(0, 3).map((student, idx) => {
                const globalIndex = students.findIndex(s => s.id === student.id);
                return (
                  <StudentIDCard
                    key={student.id}
                    student={{ ...student, student_index: globalIndex + 1 }}
                    schoolName={tenant?.name || "School Name"}
                    schoolLogo={tenant?.logo_url}
                    schoolPhone={tenant?.phone}
                    className={getClassName(student.class_id)}
                    idPrefix={schoolSettings?.student_id_prefix || 'STU'}
                    idDigits={schoolSettings?.student_id_digits || 4}
                  />
                );
              })}
            </div>
            {selectedStudents.length > 3 && (
              <p className="text-center text-muted-foreground mt-4">
                + {selectedStudents.length - 3} more cards will be printed
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hidden Print Container */}
      <div className="hidden">
        <div ref={printRef}>
          {selectedStudentData.map((student) => {
            const globalIndex = students.findIndex(s => s.id === student.id);
            return (
              <StudentIDCard
                key={student.id}
                student={{ ...student, student_index: globalIndex + 1 }}
                schoolName={tenant?.name || "School Name"}
                schoolLogo={tenant?.logo_url}
                schoolPhone={tenant?.phone}
                className={getClassName(student.class_id)}
                idPrefix={schoolSettings?.student_id_prefix || 'STU'}
                idDigits={schoolSettings?.student_id_digits || 4}
                forPrint
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}