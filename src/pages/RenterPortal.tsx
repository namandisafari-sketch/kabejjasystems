import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Home, Building2, KeyRound, Loader2, DoorOpen } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function RenterPortal() {
  const navigate = useNavigate();
  const [businessCode, setBusinessCode] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [accessPin, setAccessPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessCode.trim()) {
      toast.error("Please enter your property code");
      return;
    }
    
    if (!unitNumber.trim()) {
      toast.error("Please enter your unit number");
      return;
    }
    
    if (accessPin.length !== 4) {
      toast.error("Please enter your 4-digit access PIN");
      return;
    }

    setIsLoading(true);

    try {
      // First, find the tenant (business) by their code
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .eq("business_code", businessCode.trim().toUpperCase())
        .maybeSingle();

      if (tenantError) throw tenantError;

      if (!tenant) {
        toast.error("Invalid property code. Please check and try again.");
        setIsLoading(false);
        return;
      }

      // Find the unit by unit number within this tenant's properties (case-insensitive)
      const { data: unit, error: unitError } = await supabase
        .from("rental_units")
        .select("id")
        .eq("tenant_id", tenant.id)
        .ilike("unit_number", unitNumber.trim())
        .eq("is_active", true)
        .maybeSingle();

      if (unitError) throw unitError;

      if (!unit) {
        toast.error("Unit not found. Please check your unit number.");
        setIsLoading(false);
        return;
      }

      // Find the active lease for this unit
      const { data: lease, error: leaseError } = await supabase
        .from("leases")
        .select("rental_tenant_id")
        .eq("unit_id", unit.id)
        .eq("status", "active")
        .maybeSingle();

      if (leaseError) throw leaseError;

      if (!lease) {
        toast.error("No active lease found for this unit.");
        setIsLoading(false);
        return;
      }

      // Verify the renter's PIN
      const { data: rentalTenant, error: renterError } = await supabase
        .from("rental_tenants")
        .select(`
          id,
          full_name,
          phone,
          email,
          tenant_id,
          access_pin
        `)
        .eq("id", lease.rental_tenant_id)
        .eq("access_pin", accessPin)
        .eq("status", "active")
        .maybeSingle();

      if (renterError) throw renterError;

      if (!rentalTenant) {
        toast.error("Invalid access PIN. Please contact your landlord.");
        setIsLoading(false);
        return;
      }

      // Store renter info in session storage for the dashboard
      sessionStorage.setItem("renter_session", JSON.stringify({
        renterId: rentalTenant.id,
        name: rentalTenant.full_name,
        phone: rentalTenant.phone,
        email: rentalTenant.email,
        tenantId: rentalTenant.tenant_id,
        unitId: unit.id,
        // Store access credentials for receipt handover
        propertyCode: businessCode.trim().toUpperCase(),
        unitNumber: unitNumber.trim(),
        accessPin: accessPin,
      }));

      toast.success(`Welcome back, ${rentalTenant.full_name}!`);
      navigate("/renter/dashboard");
    } catch (error: any) {
      console.error("Lookup error:", error);
      toast.error("Failed to verify your access. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Home className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg text-primary truncate">KaRental Ko</h1>
              <p className="text-xs text-muted-foreground">Check-in Portal</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-4">
        <Card className="w-full max-w-md shadow-xl border-2">
          <CardHeader className="text-center pb-2 px-4 sm:px-6">
            <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
              <DoorOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Renter Check-in</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Enter your property code, unit number, and access PIN
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleLookup} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="businessCode" className="text-sm sm:text-base">Property Code</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="businessCode"
                    type="text"
                    placeholder="e.g. ABC123"
                    value={businessCode}
                    onChange={(e) => setBusinessCode(e.target.value.toUpperCase())}
                    className="pl-10 h-11 sm:h-12 text-base sm:text-lg uppercase"
                    maxLength={6}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  6-character code provided by your landlord
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitNumber" className="text-sm sm:text-base">Unit Number</Label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="unitNumber"
                    type="text"
                    placeholder="e.g. A1, 101, etc."
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="pl-10 h-11 sm:h-12 text-base sm:text-lg"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Access PIN</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={accessPin}
                    onChange={(value) => setAccessPin(value)}
                    disabled={isLoading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-12 w-12 sm:h-14 sm:w-14 text-xl sm:text-2xl" />
                      <InputOTPSlot index={1} className="h-12 w-12 sm:h-14 sm:w-14 text-xl sm:text-2xl" />
                      <InputOTPSlot index={2} className="h-12 w-12 sm:h-14 sm:w-14 text-xl sm:text-2xl" />
                      <InputOTPSlot index={3} className="h-12 w-12 sm:h-14 sm:w-14 text-xl sm:text-2xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  <KeyRound className="inline h-3 w-3 mr-1" />
                  4-digit PIN given by your landlord
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 sm:h-12 text-base sm:text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <DoorOpen className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Check In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Don't have your access details? Contact your landlord.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t py-3 sm:py-4 bg-card/50">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Powered by Kabejja Systems
          </p>
        </div>
      </footer>
    </div>
  );
}
