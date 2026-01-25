import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import kabejjaLogo from "@/assets/kabejja-logo.png";
import { getBusinessTypeConfig, getBusinessTypesByCategory, categoryLabels } from "@/config/businessTypes";
import { useDeviceFingerprint } from "@/hooks/use-device-fingerprint";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { fingerprint } = useDeviceFingerprint();

  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    address: "",
    phone: "",
    email: "",
    packageId: "",
    schoolPackageId: "",
    ownerName: "",
    ownerEmail: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });

  // Check if the selected business type is a school
  const isSchoolType = ['kindergarten', 'primary_school', 'secondary_school'].includes(formData.businessType);
  // Check if the selected business type is a rental/property type
  const isRentalType = ['rental_management', 'property_management'].includes(formData.businessType);

  const { data: packages } = useQuery({
    queryKey: ['subscription-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .eq('package_type', 'subscription')
        .order('price', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !isSchoolType && !isRentalType,
  });

  // Fetch rental packages for rental business types
  const { data: rentalPackages } = useQuery({
    queryKey: ['rental-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isRentalType,
  });

  // Fetch school packages for school business types
  const { data: schoolPackages } = useQuery({
    queryKey: ['school-packages', formData.businessType],
    queryFn: async () => {
      const schoolLevelMap: Record<string, string> = {
        'kindergarten': 'kindergarten',
        'primary_school': 'primary',
        'secondary_school': 'secondary',
      };
      const schoolLevel = schoolLevelMap[formData.businessType];

      const { data, error } = await supabase
        .from('school_packages')
        .select('*')
        .eq('is_active', true)
        .eq('school_level', schoolLevel)
        .order('price_per_term', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isSchoolType,
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1 && (!formData.businessName || !formData.businessType || !formData.phone || !formData.email)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (step === 2 && !formData.packageId && !formData.schoolPackageId && !formData.packageId) {
      // For rental we use packageId as well, so we check if any package is selected
      const isPackageSelected = isSchoolType ? !!formData.schoolPackageId : !!formData.packageId;

      if (!isPackageSelected) {
        toast({
          title: "Select a Package",
          description: "Please choose a package to continue",
          variant: "destructive",
        });
        return;
      }
    }

    setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.ownerEmail,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.ownerName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Wait for session to be established
      if (authData.session) {
        await supabase.auth.setSession(authData.session);
      } else {
        // If no session, try to sign in immediately (auto-confirm should be enabled)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.ownerEmail,
          password: formData.password,
        });
        if (signInError) throw signInError;
      }

      // Small delay to ensure auth state is propagated
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use RPC function to create tenant (bypasses RLS)
      const { data: tenantId, error: tenantError } = await supabase
        .rpc('create_tenant_for_signup', {
          p_name: formData.businessName,
          p_business_type: formData.businessType,
          p_address: formData.address || null,
          p_phone: formData.phone,
          p_email: formData.email,
          p_package_id: (isSchoolType || isRentalType) ? null : formData.packageId || null,
          p_referred_by_code: formData.referralCode || null,
        });

      if (tenantError) throw tenantError;
      if (!tenantId) throw new Error("Failed to create tenant");

      // For schools, create academic term and subscription using RPC (bypasses RLS)
      if (isSchoolType && formData.schoolPackageId) {
        const { error: schoolDataError } = await supabase
          .rpc('create_school_signup_data', {
            p_tenant_id: tenantId,
            p_package_id: formData.schoolPackageId,
          });

        if (schoolDataError) throw schoolDataError;
      }

      // For rentals, create rental subscription using RPC
      if (isRentalType && formData.packageId) {
        const { error: rentalDataError } = await supabase
          .rpc('create_rental_signup_data', {
            p_tenant_id: tenantId,
            p_package_id: formData.packageId,
          });

        if (rentalDataError) throw rentalDataError;
      }

      // Register device fingerprint for trial protection
      if (fingerprint) {
        try {
          await (supabase
            .from('device_fingerprints')
            .insert({
              device_id: fingerprint.deviceId,
              platform: fingerprint.platform,
              user_agent: fingerprint.osVersion,
              tenant_id: tenantId,
            } as any) as any);
        } catch (fpError) {
          // Don't fail signup if fingerprint recording fails
          console.error('Failed to record device fingerprint:', fpError);
        }
      }

      // Use RPC function to create profile (bypasses RLS)
      const { error: profileError } = await supabase
        .rpc('create_profile_for_signup', {
          p_user_id: authData.user.id,
          p_tenant_id: tenantId,
          p_full_name: formData.ownerName,
          p_phone: formData.phone,
        });

      if (profileError) throw profileError;

      const businessTypeConfig = getBusinessTypeConfig(formData.businessType);
      if (businessTypeConfig) {
        const nonCoreModules = businessTypeConfig.defaultModules.filter(
          code => !['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings'].includes(code)
        );

        if (nonCoreModules.length > 0) {
          const moduleInserts = nonCoreModules.map(code => ({
            tenant_id: tenantId,
            module_code: code,
            is_enabled: true,
            enabled_by: authData.user!.id,
          }));

          await supabase.from('tenant_modules').insert(moduleInserts);
        }
      }

      toast({
        title: "Welcome to Your Free Trial!",
        description: "Your 14-day free trial has started. Enjoy full access!",
      });

      navigate("/business");

    } catch (error: any) {
      console.error('Signup error:', error);

      // Provide user-friendly error messages
      let errorTitle = "Signup Failed";
      let errorDescription = error.message;

      if (error.message.includes('Email rate limit exceeded') || error.message.includes('only request this after')) {
        errorTitle = "Please Wait";
        errorDescription = "Too many signup attempts. Please wait a moment and try again.";
      } else if (error.message.includes('email not confirmed')) {
        errorTitle = "Email Not Confirmed";
        errorDescription = "Please check your email to confirm your account, or contact support if the issue persists.";
      } else if (error.message.includes('User already registered')) {
        errorTitle = "Account Exists";
        errorDescription = "An account with this email already exists. Please log in instead.";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ["Business Details", "Choose Package", "Your Account"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col safe-top safe-bottom">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors touch-target"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to home</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center p-4 pt-2">
        <div className="w-full max-w-lg animate-fade-up">
          <Card className="card-elevated border-0 shadow-elevated">
            <CardHeader className="text-center pb-4 pt-6">
              <div className="flex justify-center mb-3">
                <img src={kabejjaLogo} alt="Kabejja Systems" className="h-14 w-auto" />
              </div>
              <CardTitle className="text-xl sm:text-2xl">Create Your Account</CardTitle>
              <CardDescription className="text-sm">
                Step {step} of 3 — {stepTitles[step - 1]}
              </CardDescription>

              {/* Progress Bar */}
              <div className="flex gap-1.5 mt-4">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'
                      }`}
                  />
                ))}
              </div>
            </CardHeader>

            <CardContent className="pb-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Step 1: Business Details */}
                {step === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => handleChange('businessName', e.target.value)}
                        placeholder="My Business Name"
                        required
                        className="h-12 touch-target"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type *</Label>
                      <Select value={formData.businessType} onValueChange={(value) => handleChange('businessType', value)}>
                        <SelectTrigger className="h-12 touch-target">
                          <SelectValue placeholder="Select your business type" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {Object.entries(getBusinessTypesByCategory()).map(([category, types]) => (
                            <SelectGroup key={category}>
                              <SelectLabel className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                                {categoryLabels[category]}
                              </SelectLabel>
                              {types.map(type => (
                                <SelectItem key={type.value} value={type.value} className="py-2.5">
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          placeholder="+256 700 000000"
                          required
                          className="h-12 touch-target"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="info@business.com"
                          required
                          className="h-12 touch-target"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address (Optional)</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="Kampala, Uganda"
                        className="h-12 touch-target"
                      />
                    </div>

                    <Button type="button" onClick={handleNext} className="w-full h-12 touch-target btn-press">
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    {/* Dev Mode Shortcut */}
                    {import.meta.env.DEV && formData.businessType && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/business', { state: { devBusinessType: formData.businessType, devBusinessName: formData.businessName || 'Dev Business' } })}
                        className="w-full h-10 border-dashed border-warning text-warning hover:bg-warning/10"
                      >
                        🚀 Dev: Skip to Dashboard
                      </Button>
                    )}
                  </div>
                )}

                {/* Step 2: Package Selection */}
                {step === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-3">
                      {isSchoolType ? (
                        // School packages (per term)
                        schoolPackages?.map((pkg, index) => (
                          <button
                            type="button"
                            key={pkg.id}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all touch-target ${formData.schoolPackageId === pkg.id
                              ? 'border-primary bg-primary/5 shadow-soft'
                              : 'border-border hover:border-primary/40'
                              }`}
                            onClick={() => handleChange('schoolPackageId', pkg.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{pkg.name}</span>
                                  {index === 0 && (
                                    <span className="text-2xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                      Popular
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">{pkg.description}</p>
                                {pkg.student_limit && (
                                  <p className="text-xs text-muted-foreground mt-1">Up to {pkg.student_limit} students</p>
                                )}
                                <p className="mt-2">
                                  <span className="text-2xl font-bold text-foreground">
                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(pkg.price_per_term)}
                                  </span>
                                  <span className="text-sm text-muted-foreground">/term</span>
                                </p>
                              </div>
                              {formData.schoolPackageId === pkg.id && (
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </button>
                        ))
                      ) : isRentalType ? (
                        // Rental packages
                        rentalPackages?.map((pkg, index) => (
                          <button
                            type="button"
                            key={pkg.id}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all touch-target ${formData.packageId === pkg.id
                              ? 'border-primary bg-primary/5 shadow-soft'
                              : 'border-border hover:border-primary/40'
                              }`}
                            onClick={() => handleChange('packageId', pkg.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{pkg.name}</span>
                                  {index === 0 && (
                                    <span className="text-2xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                      Popular
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">{pkg.description}</p>
                                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                  <span>{pkg.max_properties} Properties</span>
                                  <span>{pkg.max_units} Units</span>
                                </div>
                                <p className="mt-2">
                                  <span className="text-2xl font-bold text-foreground">
                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(pkg.monthly_price)}
                                  </span>
                                  <span className="text-sm text-muted-foreground">/month</span>
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Includes {pkg.included_users} users
                                </p>
                              </div>
                              {formData.packageId === pkg.id && (
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        // Regular packages (monthly/daily)
                        packages?.map((pkg, index) => (
                          <button
                            type="button"
                            key={pkg.id}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all touch-target ${formData.packageId === pkg.id
                              ? 'border-primary bg-primary/5 shadow-soft'
                              : 'border-border hover:border-primary/40'
                              }`}
                            onClick={() => handleChange('packageId', pkg.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{pkg.name}</span>
                                  {index === 1 && (
                                    <span className="text-2xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                      Popular
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">{pkg.description}</p>
                                <p className="mt-2">
                                  <span className="text-2xl font-bold text-foreground">
                                    {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(pkg.price)}
                                  </span>
                                  <span className="text-sm text-muted-foreground">/{pkg.validity_days} days</span>
                                </p>
                              </div>
                              {formData.packageId === pkg.id && (
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </button>
                        ))
                      )}

                      {/* Show message if no packages available */}
                      {isSchoolType && (!schoolPackages || schoolPackages.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No packages available for this school level yet.</p>
                          <p className="text-sm mt-1">Please contact support to set up pricing.</p>
                        </div>
                      )}

                      {/* Show message if no rental packages available */}
                      {isRentalType && (!rentalPackages || rentalPackages.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No rental packages available yet.</p>
                          <p className="text-sm mt-1">Please contact support to set up pricing.</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 touch-target">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button type="button" onClick={handleNext} className="flex-1 h-12 touch-target btn-press">
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Owner Details */}
                {step === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                      <Label htmlFor="ownerName">Your Full Name *</Label>
                      <Input
                        id="ownerName"
                        value={formData.ownerName}
                        onChange={(e) => handleChange('ownerName', e.target.value)}
                        placeholder="John Doe"
                        required
                        className="h-12 touch-target"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ownerEmail">Your Email *</Label>
                      <Input
                        id="ownerEmail"
                        type="email"
                        value={formData.ownerEmail}
                        onChange={(e) => handleChange('ownerEmail', e.target.value)}
                        placeholder="john@example.com"
                        required
                        autoComplete="email"
                        className="h-12 touch-target"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          placeholder="Min. 6 characters"
                          required
                          className="h-12 touch-target pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground touch-target"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        placeholder="Re-enter password"
                        required
                        className="h-12 touch-target"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                      <Input
                        id="referralCode"
                        value={formData.referralCode}
                        onChange={(e) => handleChange('referralCode', e.target.value)}
                        placeholder="KBT123ABC"
                        className="h-12 touch-target"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 touch-target">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button type="submit" disabled={loading} className="flex-1 h-12 touch-target btn-press">
                        {loading ? "Creating..." : "Create Account"}
                      </Button>
                    </div>
                  </div>
                )}
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary font-medium hover:underline">
                    Login
                  </Link>
                </p>
                <p className="text-xs text-muted-foreground">
                  Platform Admin?{" "}
                  <Link to="/admin-signup" className="text-primary hover:underline">
                    Sign up here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Signup;
