import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Users, GraduationCap, Heart, FileText, CheckSquare, AlertCircle, CreditCard } from "lucide-react";

interface StudentFormData {
  // Basic Info
  full_name: string;
  admission_number: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  place_of_birth: string;
  home_district: string;
  religion: string;
  talent: string;
  student_national_id: string;
  birth_certificate_number: string;
  address: string;
  photo_url: string;
  
  // Medical Info
  blood_group: string;
  medical_conditions: string;
  allergies: string;
  disabilities: string;
  immunization_status: string;
  
  // Previous Academic Records
  previous_school_name: string;
  previous_school_address: string;
  previous_class: string;
  previous_school_leaving_reason: string;
  academic_report_notes: string;
  
  // Guardian/Parent Info
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  guardian_email: string;
  guardian_address: string;
  guardian_occupation: string;
  guardian_national_id: string;
  father_name: string;
  father_phone: string;
  father_occupation: string;
  father_national_id: string;
  mother_name: string;
  mother_phone: string;
  mother_occupation: string;
  mother_national_id: string;
  
  // Legacy parent fields
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  
  // Emergency Contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  
  // Admission
  class_id: string;
  boarding_status: string;
  admission_notes: string;
}

interface TermRequirement {
  id: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
}

interface FeeStructure {
  id: string;
  name: string;
  level: string;
  fee_type: string;
  amount: number;
  is_mandatory: boolean;
}

interface SelectedFee {
  fee_id: string;
  amount: number;
}

interface StudentEnrollmentFormProps {
  tenantId: string;
  initialData?: Partial<StudentFormData> & { id?: string };
  onSubmit: (
    data: StudentFormData, 
    requirements: { requirement_id: string; is_fulfilled: boolean }[],
    selectedFees: SelectedFee[]
  ) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELIGIONS = ["Christian", "Muslim", "Hindu", "Buddhist", "Traditional", "Other"];
const RELATIONSHIPS = ["Father", "Mother", "Uncle", "Aunt", "Grandparent", "Sibling", "Guardian", "Other"];

export function StudentEnrollmentForm({ 
  tenantId, 
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting 
}: StudentEnrollmentFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState<StudentFormData>({
    full_name: "",
    admission_number: "",
    date_of_birth: "",
    gender: "",
    nationality: "Ugandan",
    place_of_birth: "",
    home_district: "",
    religion: "",
    talent: "",
    student_national_id: "",
    birth_certificate_number: "",
    address: "",
    photo_url: "",
    blood_group: "",
    medical_conditions: "",
    allergies: "",
    disabilities: "",
    immunization_status: "",
    previous_school_name: "",
    previous_school_address: "",
    previous_class: "",
    previous_school_leaving_reason: "",
    academic_report_notes: "",
    guardian_name: "",
    guardian_relationship: "",
    guardian_phone: "",
    guardian_email: "",
    guardian_address: "",
    guardian_occupation: "",
    guardian_national_id: "",
    father_name: "",
    father_phone: "",
    father_occupation: "",
    father_national_id: "",
    mother_name: "",
    mother_phone: "",
    mother_occupation: "",
    mother_national_id: "",
    parent_name: "",
    parent_phone: "",
    parent_email: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    class_id: "",
    boarding_status: "day",
    admission_notes: "",
    ...initialData,
  });

  const [selectedRequirements, setSelectedRequirements] = useState<Record<string, boolean>>({});
  const [selectedFees, setSelectedFees] = useState<Record<string, boolean>>({});

  // Fetch school classes
  const { data: classes = [] } = useQuery({
    queryKey: ['school-classes', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_classes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('level', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch term requirements
  const { data: requirements = [] } = useQuery({
    queryKey: ['term-requirements', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('term_requirements')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as TermRequirement[];
    },
  });

  // Fetch fee structures
  const { data: feeStructures = [] } = useQuery({
    queryKey: ['fee-structures', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('level', { ascending: true });
      if (error) throw error;
      return data as FeeStructure[];
    },
  });

  const updateField = (field: keyof StudentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleRequirement = (reqId: string) => {
    setSelectedRequirements(prev => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  const toggleFee = (feeId: string) => {
    setSelectedFees(prev => ({ ...prev, [feeId]: !prev[feeId] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const reqList = Object.entries(selectedRequirements).map(([requirement_id, is_fulfilled]) => ({
      requirement_id,
      is_fulfilled,
    }));

    const feeList = Object.entries(selectedFees)
      .filter(([_, selected]) => selected)
      .map(([fee_id]) => {
        const fee = feeStructures.find(f => f.id === fee_id);
        return { fee_id, amount: fee?.amount || 0 };
      });
    
    onSubmit(formData, reqList, feeList);
  };

  const totalFees = Object.entries(selectedFees)
    .filter(([_, selected]) => selected)
    .reduce((sum, [feeId]) => {
      const fee = feeStructures.find(f => f.id === feeId);
      return sum + (fee?.amount || 0);
    }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);
  };

  const tabs = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "guardian", label: "Guardian/Parents", icon: Users },
    { id: "academic", label: "Academic Records", icon: GraduationCap },
    { id: "medical", label: "Medical Info", icon: Heart },
    { id: "documents", label: "Documents & IDs", icon: FileText },
    { id: "fees", label: "Fees", icon: CreditCard },
    { id: "requirements", label: "Requirements", icon: CheckSquare },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full">
          {tabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1 text-xs">
              <tab.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="h-[60vh] mt-4">
          <TabsContent value="basic" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={e => updateField("full_name", e.target.value)}
                      required
                      placeholder="Enter student's full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admission_number">Admission Number</Label>
                    <Input
                      id="admission_number"
                      value={formData.admission_number}
                      onChange={e => updateField("admission_number", e.target.value)}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={e => updateField("date_of_birth", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={formData.gender} onValueChange={v => updateField("gender", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={e => updateField("nationality", e.target.value)}
                      placeholder="e.g., Ugandan"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="place_of_birth">Place of Birth</Label>
                    <Input
                      id="place_of_birth"
                      value={formData.place_of_birth}
                      onChange={e => updateField("place_of_birth", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="home_district">Home District</Label>
                    <Input
                      id="home_district"
                      value={formData.home_district}
                      onChange={e => updateField("home_district", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="religion">Religion</Label>
                    <Select value={formData.religion} onValueChange={v => updateField("religion", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELIGIONS.map(r => (
                          <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="talent">Special Talent</Label>
                    <Input
                      id="talent"
                      value={formData.talent}
                      onChange={e => updateField("talent", e.target.value)}
                      placeholder="e.g., Football, Music, Art"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Home Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={e => updateField("address", e.target.value)}
                    placeholder="Enter full home address"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="class_id">Enrolling Class *</Label>
                    <Select value={formData.class_id} onValueChange={v => updateField("class_id", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} ({cls.level} - {cls.grade})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="boarding_status">Student Type *</Label>
                    <Select value={formData.boarding_status} onValueChange={v => updateField("boarding_status", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day Scholar (comes from home)</SelectItem>
                        <SelectItem value="boarding">Boarding Scholar (sleeps at school)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guardian" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Primary Guardian Information *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guardian_name">Guardian Full Name *</Label>
                    <Input
                      id="guardian_name"
                      value={formData.guardian_name}
                      onChange={e => updateField("guardian_name", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardian_relationship">Relationship *</Label>
                    <Select value={formData.guardian_relationship} onValueChange={v => updateField("guardian_relationship", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map(r => (
                          <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guardian_phone">Phone Number *</Label>
                    <Input
                      id="guardian_phone"
                      value={formData.guardian_phone}
                      onChange={e => updateField("guardian_phone", e.target.value)}
                      required
                      placeholder="+256..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardian_email">Email</Label>
                    <Input
                      id="guardian_email"
                      type="email"
                      value={formData.guardian_email}
                      onChange={e => updateField("guardian_email", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guardian_occupation">Occupation</Label>
                    <Input
                      id="guardian_occupation"
                      value={formData.guardian_occupation}
                      onChange={e => updateField("guardian_occupation", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardian_national_id">National ID Number *</Label>
                    <Input
                      id="guardian_national_id"
                      value={formData.guardian_national_id}
                      onChange={e => updateField("guardian_national_id", e.target.value)}
                      required
                      placeholder="CM..."
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="guardian_address">Address</Label>
                  <Textarea
                    id="guardian_address"
                    value={formData.guardian_address}
                    onChange={e => updateField("guardian_address", e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Father's Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="father_name">Father's Name</Label>
                    <Input
                      id="father_name"
                      value={formData.father_name}
                      onChange={e => updateField("father_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="father_phone">Phone</Label>
                    <Input
                      id="father_phone"
                      value={formData.father_phone}
                      onChange={e => updateField("father_phone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="father_occupation">Occupation</Label>
                    <Input
                      id="father_occupation"
                      value={formData.father_occupation}
                      onChange={e => updateField("father_occupation", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="father_national_id">National ID</Label>
                    <Input
                      id="father_national_id"
                      value={formData.father_national_id}
                      onChange={e => updateField("father_national_id", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Mother's Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mother_name">Mother's Name</Label>
                    <Input
                      id="mother_name"
                      value={formData.mother_name}
                      onChange={e => updateField("mother_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mother_phone">Phone</Label>
                    <Input
                      id="mother_phone"
                      value={formData.mother_phone}
                      onChange={e => updateField("mother_phone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mother_occupation">Occupation</Label>
                    <Input
                      id="mother_occupation"
                      value={formData.mother_occupation}
                      onChange={e => updateField("mother_occupation", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mother_national_id">National ID</Label>
                    <Input
                      id="mother_national_id"
                      value={formData.mother_national_id}
                      onChange={e => updateField("mother_national_id", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact_name">Name *</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={e => updateField("emergency_contact_name", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone">Phone *</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={e => updateField("emergency_contact_phone", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                    <Select value={formData.emergency_contact_relationship} onValueChange={v => updateField("emergency_contact_relationship", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map(r => (
                          <SelectItem key={r} value={r.toLowerCase()}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Previous School Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="previous_school_name">Previous School Name</Label>
                  <Input
                    id="previous_school_name"
                    value={formData.previous_school_name}
                    onChange={e => updateField("previous_school_name", e.target.value)}
                    placeholder="Name of previous school (if any)"
                  />
                </div>
                <div>
                  <Label htmlFor="previous_school_address">Previous School Address</Label>
                  <Input
                    id="previous_school_address"
                    value={formData.previous_school_address}
                    onChange={e => updateField("previous_school_address", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="previous_class">Last Class Attended</Label>
                    <Input
                      id="previous_class"
                      value={formData.previous_class}
                      onChange={e => updateField("previous_class", e.target.value)}
                      placeholder="e.g., P.3, S.2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="previous_school_leaving_reason">Reason for Leaving</Label>
                    <Input
                      id="previous_school_leaving_reason"
                      value={formData.previous_school_leaving_reason}
                      onChange={e => updateField("previous_school_leaving_reason", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="academic_report_notes">Academic Report Notes</Label>
                  <Textarea
                    id="academic_report_notes"
                    value={formData.academic_report_notes}
                    onChange={e => updateField("academic_report_notes", e.target.value)}
                    placeholder="Summary of previous academic performance, grades, etc."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4" /> Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="blood_group">Blood Group</Label>
                    <Select value={formData.blood_group} onValueChange={v => updateField("blood_group", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map(bg => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="immunization_status">Immunization Status</Label>
                    <Select value={formData.immunization_status} onValueChange={v => updateField("immunization_status", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="complete">Complete</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="medical_conditions">Known Medical Conditions</Label>
                  <Textarea
                    id="medical_conditions"
                    value={formData.medical_conditions}
                    onChange={e => updateField("medical_conditions", e.target.value)}
                    placeholder="List any known medical conditions (asthma, diabetes, epilepsy, etc.)"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={e => updateField("allergies", e.target.value)}
                    placeholder="List any known allergies (food, medication, etc.)"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="disabilities">Disabilities / Special Needs</Label>
                  <Textarea
                    id="disabilities"
                    value={formData.disabilities}
                    onChange={e => updateField("disabilities", e.target.value)}
                    placeholder="Describe any disabilities or special needs requiring attention"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Identity Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Document copies (National ID, Birth Certificate) should be collected physically and kept in the student's file.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birth_certificate_number">Birth Certificate Number</Label>
                    <Input
                      id="birth_certificate_number"
                      value={formData.birth_certificate_number}
                      onChange={e => updateField("birth_certificate_number", e.target.value)}
                      placeholder="Enter birth certificate number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="student_national_id">Student National ID (if applicable)</Label>
                    <Input
                      id="student_national_id"
                      value={formData.student_national_id}
                      onChange={e => updateField("student_national_id", e.target.value)}
                      placeholder="For students 16+"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="admission_notes">Admission Notes</Label>
                  <Textarea
                    id="admission_notes"
                    value={formData.admission_notes}
                    onChange={e => updateField("admission_notes", e.target.value)}
                    placeholder="Any additional notes about documents collected, special arrangements, etc."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Applicable Fees
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feeStructures.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No fee structures have been configured yet.</p>
                    <p className="text-sm">Add fee structures in Fee Management to assign fees.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      Select the fees applicable to this student:
                    </p>
                    {feeStructures.map(fee => (
                      <div 
                        key={fee.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`fee-${fee.id}`}
                            checked={selectedFees[fee.id] || false}
                            onCheckedChange={() => toggleFee(fee.id)}
                          />
                          <div>
                            <Label 
                              htmlFor={`fee-${fee.id}`} 
                              className="font-medium cursor-pointer flex items-center gap-2"
                            >
                              {fee.name}
                              {fee.is_mandatory && (
                                <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                                  Required
                                </span>
                              )}
                            </Label>
                            <p className="text-sm text-muted-foreground capitalize">
                              {fee.level} • {fee.fee_type}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold">{formatCurrency(fee.amount)}</span>
                      </div>
                    ))}
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total Fees:</span>
                        <span className="text-primary">{formatCurrency(totalFees)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requirements" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" /> Term Requirements Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requirements.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No term requirements have been configured yet.</p>
                    <p className="text-sm">Add requirements in Settings to use this checklist.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      Check the items the student will bring for this term:
                    </p>
                    {requirements.map(req => (
                      <div 
                        key={req.id} 
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`req-${req.id}`}
                          checked={selectedRequirements[req.id] || false}
                          onCheckedChange={() => toggleRequirement(req.id)}
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`req-${req.id}`} 
                            className="font-medium cursor-pointer flex items-center gap-2"
                          >
                            {req.name}
                            {req.is_mandatory && (
                              <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                                Mandatory
                              </span>
                            )}
                          </Label>
                          {req.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{req.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData?.id ? "Update Student" : "Enroll Student"}
        </Button>
      </div>
    </form>
  );
}
