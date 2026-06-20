import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft, ChevronRight, Check, User, Phone, Briefcase, Building2,
  CreditCard, GraduationCap, Save, Loader2, Upload, X, Plus, Trash2,
} from "lucide-react";
import { format } from "date-fns";

const EMPLOYMENT_TYPES = ["Permanent", "Contract", "Part-time", "Intern", "Volunteer", "Casual", "Temporary"];
const WORK_SCHEDULES = ["Full-time", "Part-time", "Shift-based", "Flexible", "Remote"];
const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Separated"];
const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const EDUCATION_LEVELS = [
  "Primary", "O-Level", "A-Level", "Certificate", "Diploma",
  "Bachelor's Degree", "Master's Degree", "PhD", "Professional Certification", "Other",
];
const RELIGIONS = ["Christianity", "Islam", "Other", "None"];
const DISTRICTS = [
  "Kampala", "Wakiso", "Mukono", "Jinja", "Mbale", "Gulu", "Lira",
  "Mbarara", "Masaka", "Fort Portal", "Arua", "Hoima", "Soroti",
  "Busia", "Tororo", "Kabale", "Kasese", "Entebbe", "Nakasongola", "Luwero",
];

interface Certification {
  name: string;
  institution: string;
  year: string;
}

interface FormData {
  // Personal
  full_name: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  nationality: string;
  nin: string;
  blood_group: string;
  religion: string;
  home_district: string;

  // Contact
  email: string;
  phone: string;
  alternative_phone: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;

  // Employment
  employee_number: string;
  department: string;
  role: string;
  employment_type: string;
  work_schedule: string;
  hire_date: string;
  contract_start_date: string;
  contract_end_date: string;
  probation_end_date: string;
  salary: string;
  job_grade: string;

  // Banking & Compliance
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
  nssf_number: string;
  tin_number: string;

  // Qualifications
  highest_education: string;
  year_of_graduation: string;
  institution: string;
  previous_employer: string;
  previous_role: string;
  years_of_experience: string;
}

const STEPS = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "contact", label: "Contact & Emergency", icon: Phone },
  { id: "employment", label: "Employment Details", icon: Briefcase },
  { id: "banking", label: "Banking & Compliance", icon: CreditCard },
  { id: "qualifications", label: "Qualifications", icon: GraduationCap },
  { id: "review", label: "Review & Submit", icon: Check },
];

export default function EmployeeOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenant } = useTenant();
  const tenantId = tenant?.tenantId;
  const isSchool = tenant?.businessType?.includes("school");

  const [step, setStep] = useState(0);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [newCert, setNewCert] = useState<Certification>({ name: "", institution: "", year: "" });

  const [formData, setFormData] = useState<FormData>({
    full_name: "", date_of_birth: "", gender: "", marital_status: "",
    nationality: "Ugandan", nin: "", blood_group: "", religion: "", home_district: "",
    email: "", phone: "", alternative_phone: "", address: "",
    emergency_contact_name: "", emergency_contact_relation: "", emergency_contact_phone: "",
    employee_number: "", department: "", role: "", employment_type: "Permanent",
    work_schedule: "Full-time", hire_date: format(new Date(), "yyyy-MM-dd"),
    contract_start_date: "", contract_end_date: "", probation_end_date: "",
    salary: "", job_grade: "",
    bank_name: "", bank_account_name: "", bank_account_number: "", bank_branch: "",
    nssf_number: "", tin_number: "",
    highest_education: "", year_of_graduation: "", institution: "",
    previous_employer: "", previous_role: "", years_of_experience: "0",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("employees").select("id, full_name").eq("tenant_id", tenantId).order("full_name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const createEmployee = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const { data, error } = await supabase
        .from("employees")
        .insert({
          tenant_id: tenantId,
          full_name: formData.full_name,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role,
          department: formData.department || null,
          salary: formData.salary ? parseFloat(formData.salary) : 0,
          hire_date: formData.hire_date,
          employee_number: formData.employee_number || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          marital_status: formData.marital_status || null,
          nationality: formData.nationality || null,
          nin: formData.nin || null,
          blood_group: formData.blood_group || null,
          religion: formData.religion || null,
          home_district: formData.home_district || null,
          address: formData.address || null,
          alternative_phone: formData.alternative_phone || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_relation: formData.emergency_contact_relation || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          employment_type: formData.employment_type || null,
          contract_start_date: formData.contract_start_date || null,
          contract_end_date: formData.contract_end_date || null,
          probation_end_date: formData.probation_end_date || null,
          job_grade: formData.job_grade || null,
          work_schedule: formData.work_schedule || null,
          nssf_number: formData.nssf_number || null,
          tin_number: formData.tin_number || null,
          bank_name: formData.bank_name || null,
          bank_account_name: formData.bank_account_name || null,
          bank_account_number: formData.bank_account_number || null,
          bank_branch: formData.bank_branch || null,
          highest_education: formData.highest_education || null,
          year_of_graduation: formData.year_of_graduation || null,
          institution: formData.institution || null,
          previous_employer: formData.previous_employer || null,
          previous_role: formData.previous_role || null,
          years_of_experience: formData.years_of_experience ? parseFloat(formData.years_of_experience) : 0,
          professional_certifications: certifications,
          skills,
          onboarding_status: "completed",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Employee onboarded successfully" });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      navigate("/business/employees");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = () => {
    if (!formData.full_name) {
      toast({ title: "Required", description: "Full name is required", variant: "destructive" });
      return;
    }
    createEmployee.mutate();
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const addCertification = () => {
    if (newCert.name) {
      setCertifications([...certifications, { ...newCert }]);
      setNewCert({ name: "", institution: "", year: "" });
    }
  };

  const removeCertification = (i: number) => {
    setCertifications(certifications.filter((_, idx) => idx !== i));
  };

  const renderStep = () => {
    switch (STEPS[step].id) {
      case "personal":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Personal Information</h3>
              <p className="text-sm text-muted-foreground mb-4">Basic personal details of the employee</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  placeholder="e.g. John Mukasa Ssempijja"
                />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => updateField("date_of_birth", e.target.value)}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>National ID (NIN)</Label>
                <Input
                  value={formData.nin}
                  onChange={(e) => updateField("nin", e.target.value)}
                  placeholder="e.g. CM12345678901AB"
                />
              </div>
              <div>
                <Label>Marital Status</Label>
                <Select value={formData.marital_status} onValueChange={(v) => updateField("marital_status", v)}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nationality</Label>
                <Input
                  value={formData.nationality}
                  onChange={(e) => updateField("nationality", e.target.value)}
                  placeholder="Ugandan"
                />
              </div>
              <div>
                <Label>Blood Group</Label>
                <Select value={formData.blood_group} onValueChange={(v) => updateField("blood_group", v)}>
                  <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Religion</Label>
                <Select value={formData.religion} onValueChange={(v) => updateField("religion", v)}>
                  <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
                  <SelectContent>
                    {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Home District</Label>
                <Select value={formData.home_district} onValueChange={(v) => updateField("home_district", v)}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Contact Information</h3>
              <p className="text-sm text-muted-foreground mb-4">Contact details and emergency contacts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="employee@school.ac.ug"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+256 700 000 000"
                />
              </div>
              <div>
                <Label>Alternative Phone</Label>
                <Input
                  value={formData.alternative_phone}
                  onChange={(e) => updateField("alternative_phone", e.target.value)}
                  placeholder="+256 700 000 000"
                />
              </div>
              <div>
                <Label>Home District</Label>
                <Select value={formData.home_district} onValueChange={(v) => updateField("home_district", v)}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Physical Address</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Permanent home address"
                  rows={2}
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-1">Emergency Contact</h3>
              <p className="text-sm text-muted-foreground mb-4">Who to contact in case of an emergency</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={formData.emergency_contact_name}
                    onChange={(e) => updateField("emergency_contact_name", e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Input
                    value={formData.emergency_contact_relation}
                    onChange={(e) => updateField("emergency_contact_relation", e.target.value)}
                    placeholder="e.g. Spouse, Parent, Sibling"
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={formData.emergency_contact_phone}
                    onChange={(e) => updateField("emergency_contact_phone", e.target.value)}
                    placeholder="+256 700 000 000"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "employment":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Employment Details</h3>
              <p className="text-sm text-muted-foreground mb-4">Job role, department, and contract information</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Employee Number</Label>
                <Input
                  value={formData.employee_number}
                  onChange={(e) => updateField("employee_number", e.target.value)}
                  placeholder="Auto-generated if empty"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty for auto-generation</p>
              </div>
              <div>
                <Label>Department</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => updateField("department", e.target.value)}
                  placeholder="e.g. Teaching, Administration, Accounts"
                />
              </div>
              <div>
                <Label>Role / Job Title</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => updateField("role", e.target.value)}
                  placeholder="e.g. Senior Teacher, Bursar, Lab Technician"
                />
              </div>
              <div>
                <Label>Job Grade / Level</Label>
                <Input
                  value={formData.job_grade}
                  onChange={(e) => updateField("job_grade", e.target.value)}
                  placeholder="e.g. Grade I, Senior, Manager"
                />
              </div>
              <div>
                <Label>Employment Type</Label>
                <Select value={formData.employment_type} onValueChange={(v) => updateField("employment_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Work Schedule</Label>
                <Select value={formData.work_schedule} onValueChange={(v) => updateField("work_schedule", v)}>
                  <SelectTrigger><SelectValue placeholder="Select schedule" /></SelectTrigger>
                  <SelectContent>
                    {WORK_SCHEDULES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monthly Salary (UGX)</Label>
                <Input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => updateField("salary", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Hire / Start Date</Label>
                <Input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => updateField("hire_date", e.target.value)}
                />
              </div>
              <div>
                <Label>Contract Start Date</Label>
                <Input
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) => updateField("contract_start_date", e.target.value)}
                />
              </div>
              <div>
                <Label>Contract End Date</Label>
                <Input
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => updateField("contract_end_date", e.target.value)}
                />
              </div>
              <div>
                <Label>Probation End Date</Label>
                <Input
                  type="date"
                  value={formData.probation_end_date}
                  onChange={(e) => updateField("probation_end_date", e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case "banking":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Banking Details</h3>
              <p className="text-sm text-muted-foreground mb-4">Salary bank account and compliance information</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => updateField("bank_name", e.target.value)}
                  placeholder="e.g. Stanbic Bank, Centenary Bank"
                />
              </div>
              <div>
                <Label>Account Name</Label>
                <Input
                  value={formData.bank_account_name}
                  onChange={(e) => updateField("bank_account_name", e.target.value)}
                  placeholder="Name on bank account"
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={formData.bank_account_number}
                  onChange={(e) => updateField("bank_account_number", e.target.value)}
                  placeholder="Bank account number"
                />
              </div>
              <div>
                <Label>Bank Branch</Label>
                <Input
                  value={formData.bank_branch}
                  onChange={(e) => updateField("bank_branch", e.target.value)}
                  placeholder="e.g. Head Office, Branch name"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-1">Compliance & Tax</h3>
              <p className="text-sm text-muted-foreground mb-4">Uganda statutory requirements</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>NSSF Number</Label>
                  <Input
                    value={formData.nssf_number}
                    onChange={(e) => updateField("nssf_number", e.target.value)}
                    placeholder="Uganda Social Security Fund number"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Required for all permanent employees</p>
                </div>
                <div>
                  <Label>TIN Number</Label>
                  <Input
                    value={formData.tin_number}
                    onChange={(e) => updateField("tin_number", e.target.value)}
                    placeholder="Tax Identification Number"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Required for PAYE tax deductions</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "qualifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Education & Qualifications</h3>
              <p className="text-sm text-muted-foreground mb-4">Academic background, certifications, and skills</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Highest Education Level</Label>
                <Select value={formData.highest_education} onValueChange={(v) => updateField("highest_education", v)}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year of Graduation</Label>
                <Input
                  value={formData.year_of_graduation}
                  onChange={(e) => updateField("year_of_graduation", e.target.value)}
                  placeholder="e.g. 2020"
                />
              </div>
              <div>
                <Label>Institution</Label>
                <Input
                  value={formData.institution}
                  onChange={(e) => updateField("institution", e.target.value)}
                  placeholder="e.g. Makerere University"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-2">Professional Certifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div className="md:col-span-2">
                  <Input
                    value={newCert.name}
                    onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
                    placeholder="Certification name"
                  />
                </div>
                <div>
                  <Input
                    value={newCert.institution}
                    onChange={(e) => setNewCert({ ...newCert, institution: e.target.value })}
                    placeholder="Institution"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCert.year}
                    onChange={(e) => setNewCert({ ...newCert, year: e.target.value })}
                    placeholder="Year"
                  />
                  <Button size="icon" variant="outline" onClick={addCertification}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {certifications.length > 0 && (
                <div className="space-y-2">
                  {certifications.map((cert, i) => (
                    <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-medium text-sm">{cert.name}</p>
                        <p className="text-xs text-muted-foreground">{cert.institution} {cert.year && `• ${cert.year}`}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeCertification(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-2">Skills</h3>
              <div className="flex gap-2 mb-3">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Type a skill and press Add"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                />
                <Button variant="outline" onClick={addSkill}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1">
                      {skill}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-1">Previous Employment</h3>
              <p className="text-sm text-muted-foreground mb-4">Last position held before this role</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Previous Employer</Label>
                  <Input
                    value={formData.previous_employer}
                    onChange={(e) => updateField("previous_employer", e.target.value)}
                    placeholder="Company/School name"
                  />
                </div>
                <div>
                  <Label>Previous Role</Label>
                  <Input
                    value={formData.previous_role}
                    onChange={(e) => updateField("previous_role", e.target.value)}
                    placeholder="Previous job title"
                  />
                </div>
                <div>
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    value={formData.years_of_experience}
                    onChange={(e) => updateField("years_of_experience", e.target.value)}
                    placeholder="Total years"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Review & Submit</h3>
              <p className="text-sm text-muted-foreground mb-4">Please review all information before submitting</p>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{formData.full_name}</span></div>
                <div><span className="text-muted-foreground">DOB:</span> {formData.date_of_birth || "-"}</div>
                <div><span className="text-muted-foreground">Gender:</span> {formData.gender || "-"}</div>
                <div><span className="text-muted-foreground">NIN:</span> {formData.nin || "-"}</div>
                <div><span className="text-muted-foreground">Marital Status:</span> {formData.marital_status || "-"}</div>
                <div><span className="text-muted-foreground">Blood Group:</span> {formData.blood_group || "-"}</div>
                <div><span className="text-muted-foreground">District:</span> {formData.home_district || "-"}</div>
                <div><span className="text-muted-foreground">Religion:</span> {formData.religion || "-"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Employment Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Department:</span> {formData.department || "-"}</div>
                <div><span className="text-muted-foreground">Role:</span> {formData.role || "-"}</div>
                <div><span className="text-muted-foreground">Type:</span> {formData.employment_type}</div>
                <div><span className="text-muted-foreground">Salary:</span> {formData.salary ? `${Number(formData.salary).toLocaleString()} UGX` : "-"}</div>
                <div><span className="text-muted-foreground">Start Date:</span> {formData.hire_date || "-"}</div>
                <div><span className="text-muted-foreground">NSSF:</span> {formData.nssf_number || "-"}</div>
              </CardContent>
            </Card>

            {certifications.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Certifications ({certifications.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {certifications.map((cert, i) => (
                      <div key={i} className="text-sm flex items-center gap-2">
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="font-medium">{cert.name}</span>
                        <span className="text-muted-foreground">- {cert.institution} ({cert.year})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {skills.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Skills ({skills.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, i) => (
                      <Badge key={i} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Employee Onboarding</h1>
        <p className="text-muted-foreground">Complete all steps to onboard a new employee</p>
      </div>

      {/* Step indicators */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => { if (i < step) setStep(i); }}
              >
                <s.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 mx-1 ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={step === 0 ? () => navigate("/business/employees") : handleBack}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>

        <div className="flex items-center gap-2">
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!formData.full_name}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!formData.full_name || createEmployee.isPending}>
              {createEmployee.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Save className="h-4 w-4 mr-2" />
              Submit & Complete Onboarding
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
