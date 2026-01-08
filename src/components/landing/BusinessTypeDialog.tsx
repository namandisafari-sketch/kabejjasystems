import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BusinessTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessType: {
    icon: string;
    name: string;
  } | null;
}

// Map display names to business type codes
const businessTypeCodeMap: Record<string, string[]> = {
  "Schools": ["school", "kindergarten", "primary_school", "secondary_school"],
  "Pharmacies": ["pharmacy", "hospital", "clinic"],
  "Restaurants": ["restaurant", "bar", "cafe"],
  "Salons": ["salon", "spa", "barber"],
  "Boutiques": ["boutique", "retail_shop"],
  "Garages": ["garage", "car_spares"],
  "Lodges": ["hotel", "lodge", "guest_house"],
  "Retail Shops": ["retail_shop", "supermarket", "hardware"],
  "Phone Repair": ["tech_repair"],
  "Tech Shops": ["tech_shop", "tech_repair"],
};

// Business types that use per-term billing instead of monthly
const perTermBusinessTypes = ["Schools"];

// Features for each business type
const businessFeatures: Record<string, string[]> = {
  "Schools": [
    "Student Enrollment & Profiles",
    "Class & Grade Management",
    "Gate Check-in & Attendance",
    "Digital Report Cards with QR Codes",
    "Automatic Class Ranking & Positioning",
    "ECD Learning Areas & Progress Tracking",
    "Fee Collection with Auto Balance on Reports",
    "Teacher Comments on Activities",
    "Pupil ID Cards & Digital Stamps",
    "Staff & Payroll Management",
    "Parent Portal Access",
    "Multi-Branch Support",
  ],
  "Pharmacies": [
    "Point of Sale (POS)",
    "Patient Records",
    "Prescription Management",
    "Inventory & Stock Alerts",
    "Expiry Date Tracking",
    "Sales Reports",
    "Customer Credit Management",
  ],
  "Restaurants": [
    "Table Management",
    "Kitchen Display System",
    "Digital QR Menu",
    "Order Management",
    "Inventory Tracking",
    "Staff Management",
    "Sales Analytics",
  ],
  "Salons": [
    "Appointment Booking",
    "Service Management",
    "Customer Records",
    "Staff Commission Tracking",
    "Product Sales (POS)",
    "Loyalty Programs",
    "Reports & Analytics",
  ],
  "Boutiques": [
    "Point of Sale (POS)",
    "Inventory Management",
    "Customer Database",
    "Layaway / Credit Sales",
    "Stock Alerts",
    "Sales Reports",
    "Multi-Branch Support",
  ],
  "Garages": [
    "Job Card Management",
    "Parts Inventory",
    "Customer Vehicle Records",
    "Quotation & Invoicing",
    "Staff Management",
    "Expense Tracking",
    "Reports & Analytics",
  ],
  "Lodges": [
    "Room Management",
    "Booking System",
    "Guest Records",
    "Housekeeping Status",
    "Revenue Tracking",
    "Staff Management",
    "Reports & Analytics",
  ],
  "Retail Shops": [
    "Point of Sale (POS)",
    "Barcode Scanning",
    "Inventory Management",
    "Customer Credit",
    "Purchase Orders",
    "Stock Alerts",
    "Sales Reports",
  ],
  "Phone Repair": [
    "Job Ticket System",
    "Parts Inventory",
    "Customer Device Records",
    "Repair Status Tracking",
    "Warranty Management",
    "Staff Management",
    "Reports & Analytics",
  ],
  "Tech Shops": [
    "Point of Sale (POS)",
    "Repair Job Tracking",
    "Parts & Product Inventory",
    "Customer Records",
    "Warranty Tracking",
    "Sales & Service Reports",
    "Multi-Branch Support",
  ],
};

export const BusinessTypeDialog = ({ open, onOpenChange, businessType }: BusinessTypeDialogProps) => {
  const isSchool = businessType && perTermBusinessTypes.includes(businessType.name);
  
  // Fetch regular packages for non-school businesses
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: open && !isSchool,
  });

  // Fetch school packages for schools
  const { data: schoolPackages, isLoading: schoolPackagesLoading } = useQuery({
    queryKey: ['school-packages-dialog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_packages')
        .select('*')
        .eq('is_active', true)
        .order('price_per_term', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: open && isSchool,
  });

  if (!businessType) return null;

  const features = businessFeatures[businessType.name] || businessFeatures["Retail Shops"];
  const isLoading = isSchool ? schoolPackagesLoading : packagesLoading;

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'kindergarten': return 'Kindergarten';
      case 'primary': return 'Primary School';
      case 'secondary': return 'Secondary School';
      case 'all': return 'All Levels';
      default: return level;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl">
            <span className="text-2xl sm:text-3xl">{businessType.icon}</span>
            {businessType.name}
          </DialogTitle>
          <DialogDescription>
            {isSchool 
              ? "Complete school management system following Uganda's curriculum"
              : `Everything you need to manage your ${businessType.name.toLowerCase()} business`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* School Levels Note */}
          {isSchool && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary">Supports All School Levels</p>
                <p className="text-muted-foreground">Kindergarten, Primary & Secondary schools following Uganda's curriculum</p>
              </div>
            </div>
          )}

          {/* Features Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Features Included</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3">
              {isSchool ? "Per-Term Pricing" : "Pricing Plans"}
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : isSchool ? (
              // School packages (per-term)
              <div className="grid gap-3">
                {schoolPackages?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Pricing coming soon. Contact us for a quote.</p>
                ) : (
                  schoolPackages?.map((pkg, index) => (
                    <div 
                      key={pkg.id} 
                      className={`p-4 rounded-lg border ${index === 0 ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{pkg.name}</span>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">Recommended</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {new Intl.NumberFormat('en-UG', { 
                              style: 'currency', 
                              currency: 'UGX', 
                              maximumFractionDigits: 0 
                            }).format(pkg.price_per_term)}
                          </p>
                          <p className="text-xs text-muted-foreground">per term</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>{getLevelLabel(pkg.school_level)}</span>
                        <span>•</span>
                        <span>{pkg.student_limit ? `Up to ${pkg.student_limit} students` : 'Unlimited students'}</span>
                        <span>•</span>
                        <span>3 terms/year</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Regular packages (monthly/period-based)
              <div className="grid gap-3">
                {packages?.map((pkg, index) => (
                  <div 
                    key={pkg.id} 
                    className={`p-4 rounded-lg border ${index === 1 ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{pkg.name}</span>
                          {index === 1 && (
                            <Badge variant="default" className="text-xs">Popular</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {new Intl.NumberFormat('en-UG', { 
                            style: 'currency', 
                            currency: 'UGX', 
                            maximumFractionDigits: 0 
                          }).format(pkg.price)}
                        </p>
                        <p className="text-xs text-muted-foreground">/{pkg.validity_days} days</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Up to {pkg.user_limit} users</span>
                      <span>•</span>
                      <span>{pkg.branch_limit} branch{pkg.branch_limit > 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link to="/signup" className="flex-1">
              <Button className="w-full touch-target" size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" onClick={() => onOpenChange(false)} className="touch-target">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
