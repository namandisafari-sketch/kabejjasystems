import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GraduationCap, 
  FileWarning, 
  Camera, 
  CreditCard, 
  BookOpen, 
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";

export interface UNEBFormData {
  is_uneb_candidate: boolean;
  uneb_candidate_type: 'UCE' | 'UACE' | null;
  registration_fee: number;
  subjects: string[];
  subject_combination: string;
  previous_sitting: boolean;
  previous_index_number: string;
  special_needs_accommodation: string;
  passport_photo_submitted: boolean;
}

interface UNEBCandidateSectionProps {
  tenantId: string;
  examType: 'UCE' | 'UACE' | null;
  formData: UNEBFormData;
  onChange: (data: Partial<UNEBFormData>) => void;
  selectedClassName?: string;
}

interface UNEBSubject {
  id: string;
  code: string;
  name: string;
  exam_type: string;
  is_compulsory: boolean;
  subject_category: string;
}

interface UNEBSettings {
  center_number: string | null;
  center_name: string | null;
  uce_registration_fee: number;
  uace_registration_fee: number;
  current_academic_year: number;
  registration_open: boolean;
  registration_deadline_uce: string | null;
  registration_deadline_uace: string | null;
}

export function UNEBCandidateSection({ 
  tenantId, 
  examType, 
  formData, 
  onChange,
  selectedClassName 
}: UNEBCandidateSectionProps) {
  // Fetch UNEB school settings
  const { data: settings } = useQuery({
    queryKey: ['uneb-school-settings', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uneb_school_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (error) throw error;
      return data as UNEBSettings | null;
    },
  });

  // Fetch UNEB subjects based on exam type
  const { data: subjects = [] } = useQuery({
    queryKey: ['uneb-subjects', examType],
    enabled: !!examType,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uneb_subjects')
        .select('*')
        .in('exam_type', [examType!, 'BOTH'])
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as UNEBSubject[];
    },
  });

  // Group subjects by category
  const subjectsByCategory = subjects.reduce((acc, subject) => {
    const category = subject.subject_category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(subject);
    return acc;
  }, {} as Record<string, UNEBSubject[]>);

  const registrationFee = examType === 'UCE' 
    ? (settings?.uce_registration_fee || 80000)
    : (settings?.uace_registration_fee || 120000);

  const deadline = examType === 'UCE'
    ? settings?.registration_deadline_uce
    : settings?.registration_deadline_uace;

  const toggleSubject = (subjectCode: string, isCompulsory: boolean) => {
    if (isCompulsory) return; // Can't toggle compulsory subjects
    
    const currentSubjects = formData.subjects || [];
    const newSubjects = currentSubjects.includes(subjectCode)
      ? currentSubjects.filter(s => s !== subjectCode)
      : [...currentSubjects, subjectCode];
    
    onChange({ subjects: newSubjects });
  };

  // Auto-select compulsory subjects
  useEffect(() => {
    const compulsorySubjects = subjects
      .filter(s => s.is_compulsory)
      .map(s => s.code);
    
    const currentSubjects = formData.subjects || [];
    const missingCompulsory = compulsorySubjects.filter(s => !currentSubjects.includes(s));
    
    if (missingCompulsory.length > 0) {
      onChange({ subjects: [...currentSubjects, ...missingCompulsory] });
    }
  }, [subjects]);

  // Update registration fee when exam type changes
  useEffect(() => {
    onChange({ registration_fee: registrationFee });
  }, [registrationFee]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { 
      style: 'currency', 
      currency: 'UGX', 
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-UG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (!examType) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>UNEB registration is not required for this class level.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* UNEB Registration Alert */}
      <Alert className="border-primary/50 bg-primary/5">
        <GraduationCap className="h-4 w-4" />
        <AlertTitle className="font-semibold">
          {examType === 'UCE' ? 'UCE (O-Level)' : 'UACE (A-Level)'} Candidate Registration
        </AlertTitle>
        <AlertDescription className="text-sm">
          This student is enrolling in <strong>{selectedClassName}</strong> and will sit for national examinations.
          UNEB registration is required with a fee of <strong>{formatCurrency(registrationFee)}</strong>.
        </AlertDescription>
      </Alert>

      {/* School UNEB Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" /> School UNEB Center Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Center Number:</span>
              <p className="font-medium">{settings?.center_number || 'Not configured'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Academic Year:</span>
              <p className="font-medium">{settings?.current_academic_year || new Date().getFullYear()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Registration Deadline:</span>
              <p className="font-medium">{formatDate(deadline)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Registration Status:</span>
              <Badge variant={settings?.registration_open ? "default" : "secondary"}>
                {settings?.registration_open ? 'Open' : 'Closed'}
              </Badge>
            </div>
          </div>
          
          {!settings?.center_number && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                UNEB center number is not configured. Please set it up in School Settings before registering candidates.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Registration Fee */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> UNEB Registration Fee
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">{examType} Registration Fee</p>
              <p className="text-sm text-muted-foreground">
                Payable to school for UNEB registration
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{formatCurrency(registrationFee)}</p>
              <p className="text-xs text-muted-foreground">per candidate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Requirement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="h-4 w-4" /> Passport Photo Requirement
          </CardTitle>
          <CardDescription>
            UNEB requires a recent passport-size photo with white background
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <Checkbox
              id="passport_photo"
              checked={formData.passport_photo_submitted}
              onCheckedChange={(checked) => onChange({ passport_photo_submitted: !!checked })}
            />
            <div className="flex-1">
              <Label htmlFor="passport_photo" className="cursor-pointer font-medium">
                Passport Photo Collected
              </Label>
              <p className="text-sm text-muted-foreground">
                Confirm that 2 copies of passport-size photos have been collected from the candidate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Subject Selection
          </CardTitle>
          <CardDescription>
            {examType === 'UCE' 
              ? 'Select 8-10 subjects including compulsory ones'
              : 'Select your principal subjects (3) and subsidiary (1)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {examType === 'UACE' && (
            <div className="mb-4">
              <Label htmlFor="combination">Subject Combination Code</Label>
              <Input
                id="combination"
                value={formData.subject_combination || ''}
                onChange={(e) => onChange({ subject_combination: e.target.value.toUpperCase() })}
                placeholder="e.g., PCM, HEG, BCM, MEG"
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the 3-letter combination code for A-Level subjects
              </p>
            </div>
          )}
          
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-6">
              {Object.entries(subjectsByCategory).map(([category, categorySubjects]) => (
                <div key={category}>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                    {category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {categorySubjects.map((subject) => {
                      const isSelected = (formData.subjects || []).includes(subject.code);
                      return (
                        <div 
                          key={subject.id}
                          onClick={() => toggleSubject(subject.code, subject.is_compulsory)}
                          className={`
                            flex items-center gap-3 p-2 border rounded-lg transition-colors cursor-pointer
                            ${subject.is_compulsory ? 'bg-primary/5 border-primary/30' : ''}
                            ${isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}
                          `}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={subject.is_compulsory}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{subject.name}</span>
                              {subject.is_compulsory && (
                                <Badge variant="secondary" className="text-xs">Required</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">Code: {subject.code}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">
              Selected: {(formData.subjects || []).length} subject(s)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Previous Sitting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileWarning className="h-4 w-4" /> Previous Examination
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="previous_sitting"
              checked={formData.previous_sitting}
              onCheckedChange={(checked) => onChange({ previous_sitting: !!checked })}
            />
            <div>
              <Label htmlFor="previous_sitting" className="cursor-pointer font-medium">
                This is a re-sitting candidate
              </Label>
              <p className="text-sm text-muted-foreground">
                Check if the student has previously sat for this examination
              </p>
            </div>
          </div>

          {formData.previous_sitting && (
            <div className="pl-6">
              <Label htmlFor="previous_index">Previous Index Number</Label>
              <Input
                id="previous_index"
                value={formData.previous_index_number || ''}
                onChange={(e) => onChange({ previous_index_number: e.target.value.toUpperCase() })}
                placeholder="e.g., U0001/123"
                className="max-w-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Special Needs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Special Needs Accommodation</CardTitle>
          <CardDescription>
            For candidates requiring special examination arrangements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.special_needs_accommodation || ''}
            onChange={(e) => onChange({ special_needs_accommodation: e.target.value })}
            placeholder="Describe any special needs (e.g., extra time, large print, scribe, separate room)"
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
