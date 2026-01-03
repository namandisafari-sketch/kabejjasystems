import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Baby, Users, Heart, Camera, Info, Sparkles } from "lucide-react";
import { differenceInYears, differenceInMonths, parse } from "date-fns";

interface ECDPupilFormData {
  // Child Info
  full_name: string;
  date_of_birth: string;
  gender: string;
  photo_url: string;
  
  // Parent/Guardian Info
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  guardian_address: string;
  guardian_occupation: string;
  guardian_relationship: string;
  
  // Emergency Contact
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  
  // Medical (optional, parent-provided)
  medical_conditions: string;
  allergies: string;
  
  // Previous ECD (optional)
  previous_school_name: string;
  
  // Class assignment
  class_id: string;
  ecd_level: string;
  suggested_class_level: string;
  
  // NIN (optional for KG)
  nin_optional: string;
  
  // Admission
  admission_notes: string;
}

interface ECDPupilEnrollmentFormProps {
  tenantId: string;
  initialData?: Partial<ECDPupilFormData> & { id?: string };
  onSubmit: (data: ECDPupilFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const ECD_LEVELS = [
  { value: 'ecd1', label: 'ECD 1 - Baby Class', ageRange: '3-4 years', minAge: 3, maxAge: 4 },
  { value: 'ecd2', label: 'ECD 2 - Middle Class', ageRange: '4-5 years', minAge: 4, maxAge: 5 },
  { value: 'ecd3', label: 'ECD 3 - Top Class', ageRange: '5-6 years', minAge: 5, maxAge: 6 },
];

const RELATIONSHIPS = ["Mother", "Father", "Guardian", "Grandparent", "Uncle", "Aunt", "Other"];

export function ECDPupilEnrollmentForm({ 
  tenantId, 
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting 
}: ECDPupilEnrollmentFormProps) {
  const [activeTab, setActiveTab] = useState("child");
  const [formData, setFormData] = useState<ECDPupilFormData>({
    full_name: "",
    date_of_birth: "",
    gender: "",
    photo_url: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    guardian_address: "",
    guardian_occupation: "",
    guardian_relationship: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    medical_conditions: "",
    allergies: "",
    previous_school_name: "",
    class_id: "",
    ecd_level: "",
    suggested_class_level: "",
    nin_optional: "",
    admission_notes: "",
    ...initialData,
  });

  const [suggestedLevel, setSuggestedLevel] = useState<string | null>(null);
  const [childAge, setChildAge] = useState<{ years: number; months: number } | null>(null);

  // Fetch ECD classes
  const { data: classes = [] } = useQuery({
    queryKey: ['ecd-classes', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_classes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .in('level', ['ecd1', 'ecd2', 'ecd3', 'kindergarten', 'nursery', 'baby', 'middle', 'top'])
        .order('level', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Calculate age and suggest class level when date of birth changes
  useEffect(() => {
    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      const years = differenceInYears(today, dob);
      const months = differenceInMonths(today, dob) % 12;
      
      setChildAge({ years, months });
      
      // Suggest ECD level based on age
      let suggested = '';
      if (years >= 3 && years < 4) {
        suggested = 'ecd1';
      } else if (years >= 4 && years < 5) {
        suggested = 'ecd2';
      } else if (years >= 5 && years <= 6) {
        suggested = 'ecd3';
      } else if (years < 3) {
        suggested = 'too_young';
      } else {
        suggested = 'too_old';
      }
      
      setSuggestedLevel(suggested);
      setFormData(prev => ({ 
        ...prev, 
        suggested_class_level: suggested,
        ecd_level: suggested !== 'too_young' && suggested !== 'too_old' ? suggested : prev.ecd_level
      }));
    }
  }, [formData.date_of_birth]);

  const updateField = (field: keyof ECDPupilFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getSuggestedLevelBadge = () => {
    if (!suggestedLevel) return null;
    
    if (suggestedLevel === 'too_young') {
      return <Badge variant="destructive">Child may be too young (under 3 years)</Badge>;
    }
    if (suggestedLevel === 'too_old') {
      return <Badge variant="outline">Child may be ready for primary school</Badge>;
    }
    
    const level = ECD_LEVELS.find(l => l.value === suggestedLevel);
    return level ? (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        <Sparkles className="h-3 w-3 mr-1" />
        Suggested: {level.label}
      </Badge>
    ) : null;
  };

  const tabs = [
    { id: "child", label: "Child Info", icon: Baby },
    { id: "guardian", label: "Parent/Guardian", icon: Users },
    { id: "medical", label: "Health Info", icon: Heart },
    { id: "photo", label: "Photo", icon: Camera },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Kindergarten Enrollment</strong> - Enroll your little one for Early Childhood Development (ECD). 
          Class level is suggested based on the child's age.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          {tabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1 text-xs">
              <tab.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="h-[55vh] mt-4">
          <TabsContent value="child" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Baby className="h-4 w-4" /> Child's Information
                </CardTitle>
                <CardDescription>
                  Enter the details of your little learner
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="full_name">Child's Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={e => updateField("full_name", e.target.value)}
                      required
                      placeholder="Enter child's full name"
                      className="text-lg"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={e => updateField("date_of_birth", e.target.value)}
                      required
                    />
                    {childAge && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Age: {childAge.years} years, {childAge.months} months
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={formData.gender} onValueChange={v => updateField("gender", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Boy</SelectItem>
                        <SelectItem value="female">Girl</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {suggestedLevel && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    {getSuggestedLevelBadge()}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ecd_level">Class Level *</Label>
                    <Select value={formData.ecd_level} onValueChange={v => updateField("ecd_level", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class level" />
                      </SelectTrigger>
                      <SelectContent>
                        {ECD_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label} ({level.ageRange})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="class_id">Specific Class (Optional)</Label>
                    <Select value={formData.class_id || "unassigned"} onValueChange={v => updateField("class_id", v === "unassigned" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">To be assigned by school</SelectItem>
                        {classes.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} {cls.section && `(${cls.section})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="previous_school_name">Previous ECD School (if any)</Label>
                  <Input
                    id="previous_school_name"
                    value={formData.previous_school_name}
                    onChange={e => updateField("previous_school_name", e.target.value)}
                    placeholder="Name of previous kindergarten/nursery"
                  />
                </div>

                <div>
                  <Label htmlFor="nin_optional">National ID Number (Optional)</Label>
                  <Input
                    id="nin_optional"
                    value={formData.nin_optional}
                    onChange={e => updateField("nin_optional", e.target.value)}
                    placeholder="NIN is optional for kindergarten"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    NIN is not required for ECD but can be added for future reference
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guardian" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Parent/Guardian Information
                </CardTitle>
                <CardDescription>
                  Primary contact for the child
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guardian_name">Full Name *</Label>
                    <Input
                      id="guardian_name"
                      value={formData.guardian_name}
                      onChange={e => updateField("guardian_name", e.target.value)}
                      required
                      placeholder="Parent/Guardian full name"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guardian_phone">Phone Number *</Label>
                    <Input
                      id="guardian_phone"
                      value={formData.guardian_phone}
                      onChange={e => updateField("guardian_phone", e.target.value)}
                      required
                      placeholder="+256 7XX XXX XXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardian_email">Email (Optional)</Label>
                    <Input
                      id="guardian_email"
                      type="email"
                      value={formData.guardian_email}
                      onChange={e => updateField("guardian_email", e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="guardian_address">Home Address *</Label>
                  <Textarea
                    id="guardian_address"
                    value={formData.guardian_address}
                    onChange={e => updateField("guardian_address", e.target.value)}
                    required
                    placeholder="District, Town/Village, Street"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="guardian_occupation">Occupation</Label>
                  <Input
                    id="guardian_occupation"
                    value={formData.guardian_occupation}
                    onChange={e => updateField("guardian_occupation", e.target.value)}
                    placeholder="e.g., Teacher, Farmer, Business"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Emergency Contact</CardTitle>
                <CardDescription>
                  Someone we can contact in case of emergency
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      placeholder="+256..."
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

          <TabsContent value="medical" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4" /> Health Information (Optional)
                </CardTitle>
                <CardDescription>
                  Help us take better care of your child. This information is optional but helpful.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={e => updateField("allergies", e.target.value)}
                    placeholder="List any food or medication allergies..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="medical_conditions">Medical Conditions</Label>
                  <Textarea
                    id="medical_conditions"
                    value={formData.medical_conditions}
                    onChange={e => updateField("medical_conditions", e.target.value)}
                    placeholder="Any medical conditions we should be aware of..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="admission_notes">Additional Notes</Label>
                  <Textarea
                    id="admission_notes"
                    value={formData.admission_notes}
                    onChange={e => updateField("admission_notes", e.target.value)}
                    placeholder="Any other information about your child..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photo" className="space-y-4 p-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Child's Photo (Optional)
                </CardTitle>
                <CardDescription>
                  Upload a recent passport-size photo of your child
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                  {formData.photo_url ? (
                    <div className="text-center">
                      <img 
                        src={formData.photo_url} 
                        alt="Child's photo" 
                        className="w-32 h-32 object-cover rounded-full mx-auto mb-4"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateField("photo_url", "")}
                      >
                        Remove Photo
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Photo can be uploaded later</p>
                      <p className="text-xs">The school may take a photo during orientation</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="photo_url">Or paste photo URL</Label>
                  <Input
                    id="photo_url"
                    value={formData.photo_url}
                    onChange={e => updateField("photo_url", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex gap-2">
          {activeTab !== "child" && (
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                const tabIndex = tabs.findIndex(t => t.id === activeTab);
                if (tabIndex > 0) setActiveTab(tabs[tabIndex - 1].id);
              }}
            >
              Previous
            </Button>
          )}
          {activeTab !== "photo" ? (
            <Button 
              type="button"
              onClick={() => {
                const tabIndex = tabs.findIndex(t => t.id === activeTab);
                if (tabIndex < tabs.length - 1) setActiveTab(tabs[tabIndex + 1].id);
              }}
            >
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Enrollment"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
