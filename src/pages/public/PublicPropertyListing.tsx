import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Home, Building2, DoorOpen, MapPin, DollarSign, Bed, Bath, Upload,
  Check, Loader2, Phone, Mail, User, FileText, Shield, ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";

export default function PublicPropertyListing() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    employment_info: "",
    income_info: "",
    emergency_contact: "",
  });
  const [lc1File, setLc1File] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const { data: banner, isLoading: bannerLoading, error: bannerError } = useQuery({
    queryKey: ["listing-banner", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_listing_banners")
        .select("*, rental_properties(*)")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const propertyId = (banner as any)?.property_id;
  const tenantId = (banner as any)?.tenant_id;

  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["listing-units", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_units")
        .select("*")
        .eq("property_id", propertyId!)
        .eq("status", "available")
        .eq("is_active", true)
        .order("unit_number");
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const uploadFile = async (file: File, type: string): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) throw new Error(`${type} must be under 5MB`);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "gif", "webp", "pdf"].includes(ext || "")) {
      throw new Error(`${type} must be an image or PDF`);
    }
    const key = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `applications/${slug}/${key}`;
    setUploadingFiles(prev => ({ ...prev, [type]: true }));
    const { error: uploadError } = await supabase.storage
      .from("rental-uploads")
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage
      .from("rental-uploads")
      .getPublicUrl(filePath);
    setUploadingFiles(prev => ({ ...prev, [type]: false }));
    return urlData.publicUrl;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!banner || !slug) throw new Error("Missing listing data");
      if (!form.applicant_name.trim()) throw new Error("Full name is required");
      if (!form.applicant_phone.trim()) throw new Error("Phone number is required");

      const empInfo = JSON.stringify({ description: form.employment_info.trim() || "" });
      const incInfo = JSON.stringify({ description: form.income_info.trim() || "" });
      const emergContact = JSON.stringify({ description: form.emergency_contact.trim() || "" });

      const { data: app, error: appError } = await supabase
        .from("rental_applications")
        .insert({
          tenant_id: (banner as any).tenant_id,
          property_id: (banner as any).property_id,
          applicant_name: form.applicant_name.trim(),
          applicant_email: form.applicant_email.trim() || null,
          applicant_phone: form.applicant_phone.trim(),
          employment_info: empInfo,
          income_info: incInfo,
          emergency_contact: emergContact,
          status: "pending",
          submitted_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (appError) throw appError;
      setApplicationId(app.id);

      const docs: { application_id: string; document_type: string; file_url: string; file_name: string | null }[] = [];

      if (lc1File) {
        const url = await uploadFile(lc1File, "lc1_letter");
        docs.push({ application_id: app.id, document_type: "lc1_letter", file_url: url, file_name: lc1File.name });
      }
      if (idFile) {
        const url = await uploadFile(idFile, "national_id");
        docs.push({ application_id: app.id, document_type: "national_id", file_url: url, file_name: idFile.name });
      }
      if (extraFile) {
        const url = await uploadFile(extraFile, "additional");
        docs.push({ application_id: app.id, document_type: "additional", file_url: url, file_name: extraFile.name });
      }

      if (docs.length > 0) {
        const { error: docError } = await supabase
          .from("rental_application_documents")
          .insert(docs);
        if (docError) throw docError;
      }
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Application Submitted!",
        description: "Your rental application has been received. The property owner will review it shortly.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  const scrollToForm = () => {
    document.getElementById("application-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const resetForm = () => {
    setForm({
      applicant_name: "",
      applicant_email: "",
      applicant_phone: "",
      employment_info: "",
      income_info: "",
      emergency_contact: "",
    });
    setLc1File(null);
    setIdFile(null);
    setExtraFile(null);
    setSubmitted(false);
    setApplicationId(null);
  };

  const isUploading = Object.values(uploadingFiles).some(Boolean);

  if (bannerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (bannerError || (!banner && !bannerLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Home className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Listing not found</CardTitle>
            <CardDescription>
              The property listing you are looking for does not exist or may have been removed.
            </CardDescription>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (banner && !(banner as any).is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Shield className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle>This listing is no longer active</CardTitle>
            <CardDescription>
              This property is no longer accepting applications. Please contact the property owner for more information.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  const property = (banner as any)?.rental_properties;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/50 to-white">
      {/* Hero Section */}
      <section className="relative">
        {(banner as any).banner_image_url ? (
          <div className="relative h-56 sm:h-72 md:h-96 overflow-hidden">
            <img
              src={(banner as any).banner_image_url}
              alt={property?.name || "Property"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                    <Building2 className="h-3.5 w-3.5 mr-1" />
                    For Rent
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                  {property?.name || (banner as any).title}
                </h1>
                {property?.address && (
                  <p className="text-white/80 text-sm sm:text-base flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    {property.address}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-8 sm:p-12">
            <div className="max-w-4xl mx-auto">
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm mb-3">
                <Building2 className="h-3.5 w-3.5 mr-1" />
                For Rent
              </Badge>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                {property?.name || (banner as any).title}
              </h1>
              {property?.address && (
                <p className="text-white/80 text-sm sm:text-base flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  {property.address}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Description & CTA */}
      <section className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
        <Card className="shadow-lg border-0">
          <CardContent className="p-4 sm:p-6">
            {property?.description && (
              <p className="text-muted-foreground mb-4">{property.description}</p>
            )}
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md"
              onClick={scrollToForm}
            >
              <FileText className="h-5 w-5 mr-2" />
              Apply to Rent
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Available Units */}
      <section className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-2 mb-6">
          <DoorOpen className="h-5 w-5 text-orange-600" />
          <h2 className="text-xl sm:text-2xl font-bold">Available Units</h2>
        </div>

        {unitsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-6 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : units.length === 0 ? (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-6 text-center">
              <Home className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="font-medium text-amber-800">No units currently available</p>
              <p className="text-sm text-amber-600">Check back soon for new listings.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {units.map((unit: any) => (
              <Card key={unit.id} className="hover:shadow-md transition-shadow border-orange-100">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{unit.unit_number}</h3>
                      {unit.unit_type && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {unit.unit_type === "commercial" ? "Commercial Space" : unit.unit_type === "residential" ? "Residential Unit" : unit.unit_type}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-emerald-500">Available</Badge>
                  </div>
                  <Separator className="mb-3" />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {unit.bedrooms != null && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Bed className="h-3.5 w-3.5" />
                        {unit.bedrooms} {unit.bedrooms === 1 ? "Bed" : "Beds"}
                      </span>
                    )}
                    {unit.bathrooms != null && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Bath className="h-3.5 w-3.5" />
                        {unit.bathrooms} {unit.bathrooms === 1 ? "Bath" : "Baths"}
                      </span>
                    )}
                    {unit.size_sqm && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Home className="h-3.5 w-3.5" />
                        {unit.size_sqm} m²
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center text-lg font-bold text-orange-700">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(unit.monthly_rent)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">/month</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Application Form */}
      <section id="application-form" className="max-w-4xl mx-auto px-4 mt-10 mb-12">
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-lg">
            <CardTitle className="text-xl sm:text-2xl">
              Apply to Rent {property?.name || ""}
            </CardTitle>
            <CardDescription className="text-white/80">
              Fill out the form below to submit your rental application
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold">Application Submitted!</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Thank you for your interest. The property owner will review your application and contact you at {form.applicant_phone || form.applicant_email || "the provided contact"}.
                </p>
                <p className="text-xs text-muted-foreground">
                  Application ID: {applicationId?.slice(0, 8).toUpperCase()}
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button variant="outline" onClick={resetForm}>
                    Submit Another Application
                  </Button>
                  <Button onClick={scrollToForm}>
                    View Listing
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-orange-600" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.applicant_name}
                        onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.applicant_email}
                        onChange={(e) => setForm({ ...form, applicant_email: e.target.value })}
                        placeholder="your@email.com"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>
                        Phone <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.applicant_phone}
                        onChange={(e) => setForm({ ...form, applicant_phone: e.target.value })}
                        placeholder="e.g., 0700123456"
                        required
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600" />
                    Employment & Income
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Employment Information</Label>
                      <Textarea
                        value={form.employment_info}
                        onChange={(e) => setForm({ ...form, employment_info: e.target.value })}
                        placeholder="Describe your current employment, employer, and role..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Income Information</Label>
                      <Textarea
                        value={form.income_info}
                        onChange={(e) => setForm({ ...form, income_info: e.target.value })}
                        placeholder="Describe your income sources and estimated monthly income..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-orange-600" />
                    Emergency Contact
                  </h3>
                  <div className="space-y-2">
                    <Textarea
                      value={form.emergency_contact}
                      onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                      placeholder="Provide the name and phone number of your emergency contact..."
                      rows={3}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <Upload className="h-4 w-4 text-orange-600" />
                    Document Upload
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Upload images or PDFs (max 5MB each)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>LC1 Letter</Label>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setLc1File(e.target.files?.[0] || null)}
                      />
                      {lc1File && (
                        <p className="text-xs text-muted-foreground truncate">{lc1File.name}</p>
                      )}
                      {uploadingFiles["lc1_letter"] && (
                        <div className="flex items-center gap-1 text-xs text-orange-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>National ID</Label>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                      />
                      {idFile && (
                        <p className="text-xs text-muted-foreground truncate">{idFile.name}</p>
                      )}
                      {uploadingFiles["national_id"] && (
                        <div className="flex items-center gap-1 text-xs text-orange-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Additional Document (optional)</Label>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setExtraFile(e.target.files?.[0] || null)}
                      />
                      {extraFile && (
                        <p className="text-xs text-muted-foreground truncate">{extraFile.name}</p>
                      )}
                      {uploadingFiles["additional"] && (
                        <div className="flex items-center gap-1 text-xs text-orange-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md"
                  disabled={submitMutation.isPending || isUploading}
                >
                  {(submitMutation.isPending || isUploading) ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      {isUploading ? "Uploading files..." : "Submitting..."}
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>Powered by Kabejja Systems - Property Management</p>
        </div>
      </footer>
    </div>
  );
}
