import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TennaHubLogo } from "@/components/TennaHubLogo";
import {
  Loader2, Search, CheckCircle2, XCircle, AlertTriangle,
  Phone, Mail, MapPin, User, Calendar, ShieldQuestion,
} from "lucide-react";

interface StudentData {
  id: string;
  full_name: string;
  admission_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  photo_url: string | null;
  class_name: string;
  is_active: boolean;
}

interface TenantData {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
}

export default function VerifyStudent() {
  const [searchParams] = useSearchParams();
  const sidParam = searchParams.get("sid");

  const [admissionNumber, setAdmissionNumber] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [loading, setLoading] = useState(!!sidParam);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (sidParam) lookupBySid(sidParam);
  }, [sidParam]);

  const lookupBySid = async (sid: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: s, error: sErr } = await supabase
        .from("students")
        .select("id, full_name, admission_number, date_of_birth, gender, photo_url, is_active, tenant_id, class_id")
        .eq("id", sid)
        .single();

      if (sErr || !s) {
        setError("Student not found. The ID card may be invalid.");
        setLoading(false);
        return;
      }

      const { data: cls } = await supabase
        .from("school_classes")
        .select("name")
        .eq("id", s.class_id)
        .single();

      const { data: t } = await supabase
        .from("tenants")
        .select("name, phone, email, address, logo_url")
        .eq("id", s.tenant_id)
        .single();

      setStudent({
        id: s.id,
        full_name: s.full_name,
        admission_number: s.admission_number,
        date_of_birth: s.date_of_birth,
        gender: s.gender,
        photo_url: s.photo_url,
        class_name: cls?.name || "N/A",
        is_active: s.is_active,
      });
      setTenant(t || null);
      setVerified(true);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async () => {
    if (!admissionNumber.trim() || !schoolCode.trim()) return;
    setSearching(true);
    setError(null);
    setVerified(false);
    try {
      const { data: ten, error: tenErr } = await supabase
        .from("tenants")
        .select("id, name, phone, email, address, logo_url")
        .eq("business_code", schoolCode.trim().toUpperCase())
        .eq("status", "active")
        .single();

      if (tenErr || !ten) {
        setError("School not found. Check the school code.");
        setSearching(false);
        return;
      }

      const { data: s, error: sErr } = await supabase
        .from("students")
        .select("id, full_name, admission_number, date_of_birth, gender, photo_url, is_active, class_id")
        .eq("admission_number", admissionNumber.trim())
        .eq("tenant_id", ten.id)
        .single();

      if (sErr || !s) {
        setError("No student found with that admission number at this school.");
        setSearching(false);
        return;
      }

      const { data: cls } = await supabase
        .from("school_classes")
        .select("name")
        .eq("id", s.class_id)
        .single();

      setStudent({
        id: s.id,
        full_name: s.full_name,
        admission_number: s.admission_number,
        date_of_birth: s.date_of_birth,
        gender: s.gender,
        photo_url: s.photo_url,
        class_name: cls?.name || "N/A",
        is_active: s.is_active,
      });
      setTenant(ten);
      setVerified(true);
    } catch (err: any) {
      setError(err.message || "Lookup failed");
    } finally {
      setSearching(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying student ID...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <Card className="shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <TennaHubLogo width={100} height={30} />
            </div>
            <CardTitle className="text-lg">Student ID Verification</CardTitle>
            <CardDescription>
              Verify the authenticity of a student identification card
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Form */}
            {!verified && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>School Code</Label>
                  <Input
                    placeholder="e.g. ED7890"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="text-center tracking-widest uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Admission Number</Label>
                  <Input
                    placeholder="e.g. ADM/25/0001 or 670033"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleManualSearch}
                  disabled={searching || !admissionNumber || !schoolCode}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Verify
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Enter the school code and admission number shown on the student ID card.
                  {sidParam && (
                    <Link to="/verify-student" className="block text-primary hover:underline mt-1">
                      Clear and search manually
                    </Link>
                  )}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Verification Failed</p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Verified Result */}
            {verified && student && tenant && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold">Identity Verified</p>
                    <p className="text-xs text-emerald-600">
                      This student ID card is authentic and issued by {tenant.name}.
                    </p>
                  </div>
                </div>

                {/* Student Details */}
                <Card className="border-2 border-emerald-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      {student.photo_url ? (
                        <img
                          src={student.photo_url}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-lg font-bold">{student.full_name}</h2>
                        <Badge variant={student.is_active ? "default" : "secondary"}>
                          {student.is_active ? "Active Student" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Admission No.</p>
                        <p className="font-mono font-semibold">{student.admission_number || "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Class</p>
                        <p className="font-semibold">{student.class_name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Date of Birth</p>
                        <p className="font-semibold">{formatDate(student.date_of_birth)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Gender</p>
                        <p className="font-semibold capitalize">{student.gender || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* School Details & Emergency Contacts */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldQuestion className="h-4 w-4" />
                      School Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="font-semibold">{tenant.name}</p>
                    {tenant.phone && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {tenant.phone}
                      </p>
                    )}
                    {tenant.email && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {tenant.email}
                      </p>
                    )}
                    {tenant.address && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {tenant.address}
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        If found, please return this card to the school administration office.
                      </p>
                      <p className="mt-1">
                        Student ID: {student.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setVerified(false);
                    setStudent(null);
                    setTenant(null);
                    setError(null);
                    setAdmissionNumber("");
                    setSchoolCode("");
                  }}
                >
                  Verify Another Card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          This verification portal confirms student identity using official school records.{" "}
          <Link to="/home" className="text-primary hover:underline">
            Powered by TennaHub
          </Link>
        </p>
      </div>
    </div>
  );
}
