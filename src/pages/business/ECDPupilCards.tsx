import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Printer, CreditCard, Users, FileArchive, ArrowUpDown, Baby, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ECDIDCard from "@/components/ecd/ECDIDCard";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { toast } from "sonner";

interface ECDStudent {
  id: string;
  full_name: string;
  admission_number: string | null;
  class_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  is_active: boolean;
  photo_url?: string | null;
  ecd_level?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

interface SchoolClass {
  id: string;
  name: string;
}

interface AuthorizedPickup {
  name: string;
  phone: string;
  relationship: string;
}

const ECD_LEVELS: Record<string, string> = {
  'ecd1': 'Baby Class',
  'ecd2': 'Middle Class', 
  'ecd3': 'Top Class',
};

export default function ECDPupilCards() {
  const { data: tenantData } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPupils, setSelectedPupils] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "class" | "level">("name");
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewPupil, setPreviewPupil] = useState<ECDStudent | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch ECD pupils (students with ecd_level or in kindergarten business type)
  const { data: pupils = [], isLoading } = useQuery({
    queryKey: ['ecd-pupils', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      // For ECD, show all students (kindergartens only have young learners)
      return data as ECDStudent[];
    },
  });

  // Fetch classes
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

  // Fetch tenant info
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

  // Fetch current term
  const { data: currentTerm } = useQuery({
    queryKey: ['current-term', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('name, year')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch student roles
  const { data: studentRoles = [] } = useQuery({
    queryKey: ['ecd-student-roles', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_student_roles')
        .select(`
          student_id,
          ecd_class_roles(name, badge_icon)
        `)
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch parent info for authorized pickups
  const { data: parentLinks = [] } = useQuery({
    queryKey: ['parent-students', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_students')
        .select(`
          student_id,
          relationship,
          parents(full_name, phone)
        `)
        .eq('tenant_id', tenantData!.tenantId);
      if (error) throw error;
      return data;
    },
  });

  const getClassName = (classId: string | null) => {
    if (!classId) return "N/A";
    const cls = classes.find(c => c.id === classId);
    return cls?.name || "N/A";
  };

  const getStudentRole = (studentId: string) => {
    const role = studentRoles.find(r => r.student_id === studentId);
    if (!role?.ecd_class_roles) return null;
    const roleData = Array.isArray(role.ecd_class_roles) 
      ? role.ecd_class_roles[0] 
      : role.ecd_class_roles;
    return roleData?.name || null;
  };

  const getAuthorizedPickups = (studentId: string): AuthorizedPickup[] => {
    return parentLinks
      .filter(p => p.student_id === studentId && p.parents)
      .map(p => {
        const parentData = p.parents as { full_name: string; phone: string | null }[] | { full_name: string; phone: string | null };
        const parent = Array.isArray(parentData) ? parentData[0] : parentData;
        return {
          name: parent?.full_name || 'Unknown',
          phone: parent?.phone || 'N/A',
          relationship: p.relationship,
        };
      });
  };

  const termYear = currentTerm ? `${currentTerm.name} ${currentTerm.year}` : "2024-2025";

  // Filter pupils
  const filteredPupils = pupils
    .filter(p => {
      const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.admission_number?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = classFilter === "all" || p.class_id === classFilter;
      const matchesLevel = levelFilter === "all" || p.ecd_level === levelFilter;
      return matchesSearch && matchesClass && matchesLevel;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.full_name.localeCompare(b.full_name);
      if (sortBy === "level") return (a.ecd_level || "").localeCompare(b.ecd_level || "");
      if (sortBy === "class") return getClassName(a.class_id).localeCompare(getClassName(b.class_id));
      return 0;
    });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPupils(filteredPupils.map(p => p.id));
    } else {
      setSelectedPupils([]);
    }
  };

  const handleSelectPupil = (pupilId: string, checked: boolean) => {
    if (checked) {
      setSelectedPupils([...selectedPupils, pupilId]);
    } else {
      setSelectedPupils(selectedPupils.filter(id => id !== pupilId));
    }
  };

  const handleSelectLevel = (level: string) => {
    const pupilsInLevel = filteredPupils.filter(p => p.ecd_level === level);
    const allSelected = pupilsInLevel.every(p => selectedPupils.includes(p.id));
    
    if (allSelected) {
      setSelectedPupils(selectedPupils.filter(id => !pupilsInLevel.some(p => p.id === id)));
    } else {
      const newSelection = [...selectedPupils];
      pupilsInLevel.forEach(p => {
        if (!newSelection.includes(p.id)) newSelection.push(p.id);
      });
      setSelectedPupils(newSelection);
    }
  };

  const selectedPupilData = pupils.filter(p => selectedPupils.includes(p.id));

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = printRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ECD Learner ID Cards</title>
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
    if (!printRef.current || selectedPupils.length === 0) return;

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
      const pupil = selectedPupilData[i];
      const pupilName = pupil?.full_name.replace(/[^a-zA-Z0-9]/g, '_') || `pupil_${i + 1}`;
      const levelName = (pupil?.ecd_level ? ECD_LEVELS[pupil.ecd_level] || pupil.ecd_level : 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
      
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
          zip.file(`${levelName}/${pupilName}_FRONT.png`, frontBlob);
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
          zip.file(`${levelName}/${pupilName}_BACK.png`, backBlob);
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
    link.download = `ECD_Learner_ID_Cards_${new Date().toISOString().split('T')[0]}.zip`;
    link.click();
    URL.revokeObjectURL(url);

    setIsDownloading(false);
    toast.success(`Downloaded ZIP with ${selectedPupils.length * 2} card images`);
  };

  // Group by level for quick selection
  const uniqueLevels = [...new Set(pupils.map(p => p.ecd_level).filter(Boolean))];
  const pupilsByLevel = uniqueLevels.map(level => ({
    level: level!,
    label: ECD_LEVELS[level!] || level!,
    pupils: filteredPupils.filter(p => p.ecd_level === level),
    allSelected: filteredPupils.filter(p => p.ecd_level === level).every(p => selectedPupils.includes(p.id)),
  })).filter(l => l.pupils.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Baby className="h-6 w-6 text-pink-500" />
            ECD Learner ID Cards
          </h1>
          <p className="text-sm text-muted-foreground">Generate colorful ID cards for young learners with QR codes for attendance & pickup</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            onClick={handleDownloadZip} 
            disabled={selectedPupils.length === 0 || isDownloading}
            size="sm"
          >
            <FileArchive className="h-4 w-4 mr-2" />
            {isDownloading ? "Creating..." : `ZIP (${selectedPupils.length})`}
          </Button>
          <Button 
            onClick={handlePrint} 
            disabled={selectedPupils.length === 0}
            size="sm"
            className="bg-pink-500 hover:bg-pink-600"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print ({selectedPupils.length})
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/20 dark:to-background">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-pink-500/10 rounded-lg">
                <Baby className="h-4 w-4 md:h-6 md:w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Pupils</p>
                <p className="text-lg md:text-2xl font-bold">{pupils.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-cyan-500/10 rounded-lg">
                <CreditCard className="h-4 w-4 md:h-6 md:w-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Selected</p>
                <p className="text-lg md:text-2xl font-bold">{selectedPupils.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-yellow-500/10 rounded-lg">
                <Users className="h-4 w-4 md:h-6 md:w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Filtered</p>
                <p className="text-lg md:text-2xl font-bold">{filteredPupils.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 bg-purple-500/10 rounded-lg">
                <FileArchive className="h-4 w-4 md:h-6 md:w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Levels</p>
                <p className="text-lg md:text-2xl font-bold">{uniqueLevels.length || 3}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Level Selection */}
      {pupilsByLevel.length > 0 && (
        <Card className="border-pink-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              🎯 Quick Select by Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pupilsByLevel.map(level => (
                <Button
                  key={level.level}
                  variant={level.allSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectLevel(level.level)}
                  className={`text-xs ${level.allSelected ? 'bg-pink-500 hover:bg-pink-600' : ''}`}
                >
                  {level.label} ({level.pupils.length})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pupil Selection */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pupils..."
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
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="ecd1">Baby Class</SelectItem>
                  <SelectItem value="ecd2">Middle Class</SelectItem>
                  <SelectItem value="ecd3">Top Class</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[100px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="level">Level</SelectItem>
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
          ) : filteredPupils.length === 0 ? (
            <div className="text-center py-12">
              <Baby className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No pupils found</h3>
              <p className="text-muted-foreground">Enroll pupils first to generate ID cards</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedPupils.length === filteredPupils.length && filteredPupils.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Admission No.</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="hidden md:table-cell">Role</TableHead>
                    <TableHead className="w-20">Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPupils.map(pupil => (
                    <TableRow key={pupil.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPupils.includes(pupil.id)}
                          onCheckedChange={(checked) => handleSelectPupil(pupil.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👶</span>
                          {pupil.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-sm">
                        {pupil.admission_number || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                          {pupil.ecd_level ? ECD_LEVELS[pupil.ecd_level] || pupil.ecd_level : getClassName(pupil.class_id)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getStudentRole(pupil.id) ? (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            🏅 {getStudentRole(pupil.id)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setPreviewPupil(pupil)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden print container */}
      <div className="hidden">
        <div ref={printRef}>
          {selectedPupilData.map(pupil => (
            <ECDIDCard
              key={pupil.id}
              student={{
                ...pupil,
                ecd_role_badge: getStudentRole(pupil.id) || undefined,
                authorized_pickups: getAuthorizedPickups(pupil.id),
              }}
              schoolName={tenant?.name || "School"}
              schoolLogo={tenant?.logo_url}
              schoolPhone={tenant?.phone}
              schoolEmail={tenant?.email}
              schoolAddress={tenant?.address}
              className={getClassName(pupil.class_id)}
              termYear={termYear}
              forPrint
            />
          ))}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewPupil} onOpenChange={() => setPreviewPupil(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-pink-500" />
              ID Card Preview
            </DialogTitle>
          </DialogHeader>
          {previewPupil && (
            <div className="flex justify-center overflow-auto py-4">
              <ECDIDCard
                student={{
                  ...previewPupil,
                  ecd_role_badge: getStudentRole(previewPupil.id) || undefined,
                  authorized_pickups: getAuthorizedPickups(previewPupil.id),
                }}
                schoolName={tenant?.name || "School"}
                schoolLogo={tenant?.logo_url}
                schoolPhone={tenant?.phone}
                schoolEmail={tenant?.email}
                schoolAddress={tenant?.address}
                className={getClassName(previewPupil.class_id)}
                termYear={termYear}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
