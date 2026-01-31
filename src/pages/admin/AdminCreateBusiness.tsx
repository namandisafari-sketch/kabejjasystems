import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, User, Mail, Phone, MapPin, Key, Loader2, ArrowLeft } from "lucide-react";

interface Package {
  id: string;
  name: string;
  price: number;
}

const businessTypes = [
  { value: "retail_shop", label: "Retail Shop" },
  { value: "supermarket", label: "Supermarket" },
  { value: "restaurant", label: "Restaurant" },
  { value: "bar", label: "Bar/Pub" },
  { value: "hotel", label: "Hotel" },
  { value: "salon", label: "Salon" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "clinic", label: "Clinic" },
  { value: "garage", label: "Garage" },
  { value: "tech_repair", label: "Tech Repair" },
  { value: "school", label: "School (General)" },
  { value: "primary_school", label: "Primary School" },
  { value: "secondary_school", label: "Secondary School" },
  { value: "kindergarten", label: "Kindergarten/ECD" },
  { value: "rental_management", label: "Rental Management" },
  { value: "other", label: "Other" },
];

export default function AdminCreateBusiness() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [packageType, setPackageType] = useState<"business" | "school" | "rental">("business");

  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    location: "",
    packageId: "",
    trialDays: "14",
    notes: "",
  });

  // Determine package type based on business type
  useEffect(() => {
    if (formData.businessType.includes("school") || formData.businessType === "kindergarten") {
      setPackageType("school");
    } else if (formData.businessType === "rental_management") {
      setPackageType("rental");
    } else {
      setPackageType("business");
    }
  }, [formData.businessType]);

  // Fetch packages based on type
  useEffect(() => {
    const fetchPackages = async () => {
      let packages: Package[] = [];
      
      if (packageType === "school") {
        const { data } = await supabase
          .from("school_packages")
          .select("id, name, price_per_term")
          .eq("is_active", true)
          .order("price_per_term", { ascending: true });
        packages = (data || []).map(p => ({ id: p.id, name: p.name, price: p.price_per_term }));
      } else if (packageType === "rental") {
        const { data } = await supabase
          .from("rental_packages")
          .select("id, name, monthly_price")
          .eq("is_active", true)
          .order("monthly_price", { ascending: true });
        packages = (data || []).map(p => ({ id: p.id, name: p.name, price: p.monthly_price }));
      } else {
        const { data } = await supabase
          .from("business_packages")
          .select("id, name, monthly_price")
          .eq("is_active", true)
          .order("monthly_price", { ascending: true });
        packages = (data || []).map(p => ({ id: p.id, name: p.name, price: p.monthly_price }));
      }

      setPackages(packages);
    };

    if (formData.businessType) {
      fetchPackages();
    }
  }, [packageType, formData.businessType]);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.businessName || !formData.businessType || !formData.ownerEmail || !formData.packageId) {
      toast({
        title: "Missing Fields",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const tempPassword = generatePassword();

    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.ownerEmail,
        password: tempPassword,
        options: {
          data: {
            full_name: formData.ownerName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // 2. Create tenant
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + parseInt(formData.trialDays));

      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          name: formData.businessName,
          business_type: formData.businessType,
          status: "active",
          subscription_status: "trialing",
          trial_end_date: trialEndDate.toISOString(),
          phone: formData.ownerPhone,
          address: formData.location,
          business_code: formData.businessName.toLowerCase().replace(/\s+/g, '-').substring(0, 20) + '-' + Date.now().toString(36),
          owner_email: formData.ownerEmail,
          owner_password: tempPassword,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 3. Update profile with tenant_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          tenant_id: tenant.id,
          full_name: formData.ownerName,
          role: "tenant_owner" as const,
        })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      // 4. Add owner role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "tenant_owner" as const,
        });

      if (roleError) throw roleError;

      toast({
        title: "Business Created!",
        description: (
          <div className="space-y-2">
            <p><strong>Email:</strong> {formData.ownerEmail}</p>
            <p><strong>Temporary Password:</strong> {tempPassword}</p>
            <p className="text-xs text-muted-foreground">Share these credentials with the business owner</p>
          </div>
        ),
      });

      // Reset form
      setFormData({
        businessName: "",
        businessType: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        location: "",
        packageId: "",
        trialDays: "14",
        notes: "",
      });

    } catch (error: any) {
      console.error("Error creating business:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create business account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Business Account</h1>
          <p className="text-muted-foreground">Provision a new tenant with owner account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Details
              </CardTitle>
              <CardDescription>Information about the business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Sunrise Academy"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type *</Label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) => setFormData({ ...formData, businessType: value, packageId: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    className="pl-9"
                    placeholder="e.g., Kampala, Uganda"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="packageId">Package *</Label>
                <Select
                  value={formData.packageId}
                  onValueChange={(value) => setFormData({ ...formData, packageId: value })}
                  disabled={!formData.businessType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.businessType ? "Select package" : "Select business type first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - UGX {pkg.price.toLocaleString()}{packageType === "school" ? "/term" : "/mo"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialDays">Trial Period (Days)</Label>
                <Select
                  value={formData.trialDays}
                  onValueChange={(value) => setFormData({ ...formData, trialDays: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Owner Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Owner Account
              </CardTitle>
              <CardDescription>Login credentials for the business owner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerName"
                    className="pl-9"
                    placeholder="e.g., John Mukasa"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Owner Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerEmail"
                    type="email"
                    className="pl-9"
                    placeholder="owner@business.com"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerPhone">Owner Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerPhone"
                    className="pl-9"
                    placeholder="+256 700 123456"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any notes about this account..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Key className="h-4 w-4" />
                  Password Generation
                </div>
                <p className="text-xs text-muted-foreground">
                  A secure temporary password will be generated automatically.
                  You'll see it after creating the account - share it with the owner.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/admin")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Business Account
          </Button>
        </div>
      </form>
    </div>
  );
}
