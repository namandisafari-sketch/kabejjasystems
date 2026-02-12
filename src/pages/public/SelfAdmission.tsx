import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, CheckCircle, School, User, Calendar, Phone, Mail, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StudentFormData {
  full_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  religion: string;
  home_address: string;
  previous_school: string;
  applying_for_class: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  parent_occupation: string;
  parent_relationship: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_conditions: string;
  allergies: string;
}

const initialFormData: StudentFormData = {
  full_name: "",
  date_of_birth: "",
  gender: "",
  nationality: "Ugandan",
  religion: "",
  home_address: "",
  previous_school: "",
  applying_for_class: "",
  parent_name: "",
  parent_phone: "",
  parent_email: "",
  parent_occupation: "",
  parent_relationship: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  medical_conditions: "",
  allergies: "",
};

export default function SelfAdmission() {
  const { linkCode } = useParams<{ linkCode: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"verify" | "form" | "success">("verify");
  const [paymentCode, setPaymentCode] = useState("");
  const [formData, setFormData] = useState<StudentFormData>(initialFormData);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [linkId, setLinkId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Fetch link details
  const { data: linkData, isLoading: linkLoading, error: linkError } = useQuery({
    queryKey: ["admission-link", linkCode],
    queryFn: async () => {
      if (!linkCode) throw new Error("Invalid link");
      
      const { data, error } = await supabase
        .from("admission_links")
        .select("*, tenants:tenant_id(id, name, business_code, logo_url)")
        .eq("link_code", linkCode)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Link not found or expired");
      
      return data;
    },
    enabled: !!linkCode,
  });

  // Fetch school settings when we have tenant ID
  const { data: settings } = useQuery({
    queryKey: ["admission-settings-public", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("admission_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch classes for the school
  const { data: classes } = useQuery({
    queryKey: ["school-classes-public", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("school_classes")
        .select("id, name, grade")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!linkData) throw new Error("Invalid link");
      
      const { data, error } = await supabase.rpc("use_admission_link", {
        p_link_code: linkCode,
        p_payment_code: paymentCode.toUpperCase(),
        p_tenant_id: linkData.tenant_id,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; link_id?: string; tenant_id?: string };
      if (!result.success) {
        throw new Error(result.error || "Verification failed");
      }
      
      return result;
    },
    onSuccess: (data) => {
      setLinkId(data.link_id || null);
      setTenantId(data.tenant_id || null);
      setStep("form");
      toast({ title: "Verified", description: "Please complete the admission form." });
    },
    onError: (error: Error) => {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!linkId || !tenantId) throw new Error("Invalid session");
      
      // Generate confirmation code
      const { data: codeData, error: codeError } = await supabase.rpc("generate_confirmation_code");
      if (codeError) throw codeError;
      
      const code = codeData as string;
      
      // Create confirmation record
      const { error: insertError } = await supabase
        .from("admission_confirmations")
        .insert({
          tenant_id: tenantId,
          admission_link_id: linkId,
          confirmation_code: code,
          student_data: JSON.parse(JSON.stringify(formData)),
          agreed_to_terms: agreedToTerms,
          user_agent: navigator.userAgent,
        });

      if (insertError) throw insertError;
      
      return code;
    },
    onSuccess: (code) => {
      setConfirmationCode(code);
      setStep("success");
    },
    onError: (error: Error) => {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateField = (field: keyof StudentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (linkLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (linkError || !linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Link Invalid or Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This admission link is no longer valid. It may have expired or already been used.
              Please contact the school to get a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const school = linkData.tenants as { id: string; name: string; business_code: string; logo_url?: string } | null;

  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-16 w-16 mx-auto mb-4 object-contain" />
            )}
            <CardTitle className="flex items-center justify-center gap-2">
              <School className="h-5 w-5" />
              {school?.name || "School Admission"}
            </CardTitle>
            <CardDescription>
              Enter the payment code provided by the school to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment_code">Payment Code</Label>
              <Input
                id="payment_code"
                value={paymentCode}
                onChange={(e) => setPaymentCode(e.target.value.toUpperCase())}
                placeholder="Enter payment code"
                className="font-mono text-center text-lg"
              />
              <p className="text-xs text-muted-foreground">
                This code confirms you have paid the admission fee
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => verifyMutation.mutate()}
              disabled={!paymentCode || verifyMutation.isPending}
            >
              {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue to Admission Form
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Registration Submitted!</CardTitle>
            <CardDescription>
              Your admission form has been successfully submitted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 text-center">
              <Label className="text-xs text-muted-foreground">Confirmation Code</Label>
              <div className="text-3xl font-mono font-bold mt-1">{confirmationCode}</div>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Please save this confirmation code. You will need to present it when visiting the school to complete the admission process.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Student:</strong> {formData.full_name}</p>
              <p><strong>School:</strong> {school?.name}</p>
              <p><strong>Applied for:</strong> {formData.applying_for_class}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              Print Confirmation
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Form Step
  const isFormValid = formData.full_name && formData.date_of_birth && formData.gender && 
    formData.parent_name && formData.parent_phone && formData.applying_for_class &&
    agreedToTerms && agreedToDisclaimer;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-20 w-20 mx-auto mb-4 object-contain" />
            )}
            <CardTitle className="text-2xl">{school?.name}</CardTitle>
            <CardDescription>Student Admission Form - {settings?.academic_year || new Date().getFullYear()}</CardDescription>
          </CardHeader>
        </Card>

        {/* Student Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                placeholder="Enter student's full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => updateField("date_of_birth", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => updateField("nationality", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
              <Input
                id="religion"
                value={formData.religion}
                onChange={(e) => updateField("religion", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Home Address</Label>
              <Input
                id="address"
                value={formData.home_address}
                onChange={(e) => updateField("home_address", e.target.value)}
                placeholder="Enter home address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previous_school">Previous School</Label>
              <Input
                id="previous_school"
                value={formData.previous_school}
                onChange={(e) => updateField("previous_school", e.target.value)}
                placeholder="Enter previous school name (if any)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applying_class">Applying for Class *</Label>
              <Select value={formData.applying_for_class} onValueChange={(v) => updateField("applying_for_class", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.name}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Parent/Guardian Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parent/Guardian Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="parent_name">Full Name *</Label>
              <Input
                id="parent_name"
                value={formData.parent_name}
                onChange={(e) => updateField("parent_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_relationship">Relationship</Label>
              <Select value={formData.parent_relationship} onValueChange={(v) => updateField("parent_relationship", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">Father</SelectItem>
                  <SelectItem value="mother">Mother</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_phone">Phone Number *</Label>
              <Input
                id="parent_phone"
                type="tel"
                value={formData.parent_phone}
                onChange={(e) => updateField("parent_phone", e.target.value)}
                placeholder="e.g., 0770123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_email">Email Address</Label>
              <Input
                id="parent_email"
                type="email"
                value={formData.parent_email}
                onChange={(e) => updateField("parent_email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_occupation">Occupation</Label>
              <Input
                id="parent_occupation"
                value={formData.parent_occupation}
                onChange={(e) => updateField("parent_occupation", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergency_name">Contact Name</Label>
              <Input
                id="emergency_name"
                value={formData.emergency_contact_name}
                onChange={(e) => updateField("emergency_contact_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_phone">Contact Phone</Label>
              <Input
                id="emergency_phone"
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => updateField("emergency_contact_phone", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="medical">Medical Conditions</Label>
              <Input
                id="medical"
                value={formData.medical_conditions}
                onChange={(e) => updateField("medical_conditions", e.target.value)}
                placeholder="Any known medical conditions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Input
                id="allergies"
                value={formData.allergies}
                onChange={(e) => updateField("allergies", e.target.value)}
                placeholder="Any known allergies"
              />
            </div>
          </CardContent>
        </Card>

        {/* Rules and Regulations */}
        {settings?.rules_and_regulations && (
          <Card>
            <CardHeader>
              <CardTitle>School Rules & Regulations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/50 p-4 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm">
                {settings.rules_and_regulations}
              </div>
              <div className="flex items-start gap-2 mt-4">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer">
                  I have read and agree to abide by the school rules and regulations
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Important Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 dark:text-amber-300 mb-4">
              {settings?.disclaimer_text || "WARNING: Providing false or misleading information during registration is strictly prohibited and will result in immediate denial of admission with NO REFUND of admission fees. By submitting this form, you confirm that all information provided is accurate and truthful."}
            </p>
            <div className="flex items-start gap-2">
              <Checkbox
                id="disclaimer"
                checked={agreedToDisclaimer}
                onCheckedChange={(checked) => setAgreedToDisclaimer(checked === true)}
              />
              <Label htmlFor="disclaimer" className="text-sm cursor-pointer text-amber-800 dark:text-amber-300">
                I understand and confirm that all information provided is accurate and truthful
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Card>
          <CardContent className="pt-6">
            <Button
              className="w-full"
              size="lg"
              onClick={() => submitMutation.mutate()}
              disabled={!isFormValid || submitMutation.isPending}
            >
              {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Admission Form
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
