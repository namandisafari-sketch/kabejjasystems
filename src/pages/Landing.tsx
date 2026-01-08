import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Store, TrendingUp, Users, Building2, Menu, X, Package, GraduationCap, Printer, ScanBarcode, Globe, Server, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TestimonialsSection } from "@/components/testimonials/TestimonialsSection";
import { BusinessTypeDialog } from "@/components/landing/BusinessTypeDialog";
import kabejjaLogo from "@/assets/kabejja-logo.png";
import hero1 from "@/assets/hero1.png";
import hero2 from "@/assets/hero2.png";
import hardwareScanner from "@/assets/hardware-scanner.png";
import hardwarePrinter from "@/assets/hardware-printer.jpg";

const Landing = () => {
  const [mainImage, setMainImage] = useState(hero1);
  const [secondaryImage, setSecondaryImage] = useState(hero2);
  const [selectedBusinessType, setSelectedBusinessType] = useState<{ icon: string; name: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const swapImages = () => {
    setMainImage(secondaryImage);
    setSecondaryImage(mainImage);
  };

  const handleBusinessTypeClick = (businessType: { icon: string; name: string }) => {
    setSelectedBusinessType(businessType);
    setDialogOpen(true);
  };

  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: rentalPackages, isLoading: isLoadingRental } = useQuery({
    queryKey: ['rental-packages-landing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Separate installation package from subscription packages
  const installationPackage = packages?.find(pkg => pkg.package_type === 'installation');
  const subscriptionPackages = packages?.filter(pkg => pkg.package_type === 'subscription');

  const features = [
    {
      icon: Store,
      title: "Multi-Business Ready",
      description: "Perfect for restaurants, salons, boutiques, garages, pharmacies, and more",
    },
    {
      icon: TrendingUp,
      title: "Grow Your Revenue",
      description: "Track sales, manage inventory, and get insights to boost your business",
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Manage staff, track attendance, and handle payroll with ease",
    },
    {
      icon: Building2,
      title: "Multi-Branch Support",
      description: "Manage multiple locations from a single dashboard",
    },
  ];

  const businessTypes = [
    { icon: "🏫", name: "Schools" },
    { icon: "💊", name: "Pharmacies" },
    { icon: "🍽️", name: "Restaurants" },
    { icon: "✂️", name: "Salons" },
    { icon: "👗", name: "Boutiques" },
    { icon: "🔧", name: "Garages" },
    { icon: "🏨", name: "Lodges" },
    { icon: "🛒", name: "Retail Shops" },
    { icon: "📱", name: "Phone Repair" },
    { icon: "💻", name: "Tech Shops" },
    { icon: "🏠", name: "Rentals" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - Mobile Optimized */}
      <nav className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50 safe-top">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={kabejjaLogo} alt="Kabejja Systems" className="h-10 w-auto" />
            <div className="hidden sm:block">
              <span className="text-base font-bold text-primary">KABEJJA SYSTEMS</span>
              <p className="text-2xs text-muted-foreground -mt-0.5">Business Management</p>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="btn-press">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              className="touch-target"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card animate-fade-in">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full touch-target">Login</Button>
              </Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full touch-target">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Mobile First */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 py-10 sm:py-16 lg:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Content */}
            <div className="text-center lg:text-left space-y-5 animate-fade-up">
              <Badge className="bg-accent/20 text-primary-foreground border-primary-foreground/20 hover:bg-accent/30">
                🇺🇬 Built for Uganda
              </Badge>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                One Platform.
                <br />
                <span className="text-accent">Any Business.</span>
                <br />
                Local-first.
              </h1>
              
              <p className="text-base sm:text-lg text-primary-foreground/85 max-w-lg mx-auto lg:mx-0">
                Manage your restaurant, salon, boutique, garage, or any business with powerful tools designed for the Ugandan market.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground touch-target btn-press shadow-elevated"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#pricing" className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="w-full sm:w-auto bg-primary-foreground/10 border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/20 touch-target"
                  >
                    View Pricing
                  </Button>
                </a>
              </div>
            </div>
            
            {/* Hero Images */}
            <div className="relative mt-4 lg:mt-0 min-h-[280px] sm:min-h-[350px] lg:min-h-[400px] animate-fade-in delay-300">
              {/* Main image */}
              <div className="relative z-10 mx-auto max-w-[280px] sm:max-w-sm lg:max-w-md lg:ml-auto">
                <div className="absolute -inset-2 bg-gradient-to-r from-accent/30 via-primary-foreground/10 to-accent/30 rounded-2xl blur-xl opacity-60" />
                <img 
                  src={mainImage} 
                  alt="Ugandan business team" 
                  className="relative rounded-2xl shadow-xl w-full object-cover border border-primary-foreground/10"
                />
              </div>
              
              {/* Secondary image - clickable */}
              <button 
                onClick={swapImages}
                className="absolute -bottom-4 left-0 sm:-bottom-6 sm:left-4 lg:-left-4 z-20 group"
              >
                <div className="absolute -inset-1 bg-accent/40 rounded-xl blur-md opacity-60 group-hover:opacity-80 transition" />
                <img 
                  src={secondaryImage} 
                  alt="Business collaboration" 
                  className="relative rounded-xl shadow-lg w-24 sm:w-32 lg:w-40 border-2 border-primary object-cover transition-transform group-hover:scale-105"
                />
              </button>
              
              {/* Stats badge */}
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 lg:-right-2 z-30 animate-fade-in delay-500">
                <div className="bg-accent text-accent-foreground px-3 py-1.5 rounded-full shadow-lg text-xs sm:text-sm font-semibold">
                  ✨ 500+ Businesses
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Types - Scrollable on Mobile */}
      <section className="py-6 sm:py-8 border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-4">Works for all business types</p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {businessTypes.map((type) => (
              <button 
                key={type.name} 
                onClick={() => handleBusinessTypeClick(type)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border hover:border-primary hover:shadow-soft transition-all duration-200 touch-target text-sm"
              >
                <span className="text-lg">{type.icon}</span>
                <span className="font-medium text-foreground">{type.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Mobile Optimized Grid */}
      <section className="section-padding">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Everything You Need to Succeed
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful features designed specifically for Ugandan businesses
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="card-elevated border hover:border-primary/40 transition-colors animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Installation Package - Featured Section */}
      {installationPackage && (
        <section className="section-padding bg-gradient-to-br from-accent/10 via-background to-primary/5 border-y">
          <div className="container mx-auto">
            <div className="text-center mb-8">
              <Badge className="bg-accent text-accent-foreground mb-4">
                🎉 First-Time Installation Offer
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                Get Started with Everything You Need
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Complete hardware, professional setup, and hands-on training - all in one package
              </p>
            </div>
            
            <Card className="max-w-4xl mx-auto border-2 border-accent shadow-xl animate-fade-up overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Hardware Images */}
                <div className="bg-muted/50 p-6 flex flex-col items-center justify-center gap-4">
                  <div className="flex gap-4 items-center">
                    <div className="relative group">
                      <div className="absolute -inset-2 bg-primary/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition" />
                      <img 
                        src={hardwareScanner} 
                        alt="NETUM Desktop Barcode Scanner" 
                        className="relative h-28 sm:h-36 object-contain rounded-lg"
                      />
                    </div>
                    <div className="relative group">
                      <div className="absolute -inset-2 bg-primary/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition" />
                      <img 
                        src={hardwarePrinter} 
                        alt="Xprinter Thermal Printer" 
                        className="relative h-28 sm:h-36 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    NETUM Scanner + Xprinter Thermal Printer included
                  </p>
                </div>
                
                {/* Package Details */}
                <div className="p-6">
                  <CardHeader className="p-0 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-accent" />
                      <CardTitle className="text-xl">{installationPackage.name}</CardTitle>
                    </div>
                    <CardDescription>{installationPackage.description}</CardDescription>
                    <div className="pt-3">
                      <span className="text-3xl sm:text-4xl font-bold text-foreground">
                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(installationPackage.price)}
                      </span>
                      <Badge variant="secondary" className="ml-2">One-time</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Pay 33% upfront (UGX 317,000) • Balance in 2 payments
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="space-y-2 mb-4 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <span><strong>2 Months FREE</strong> Subscription Included</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Globe className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                        <span><strong>2-Page Professional Website</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Globe className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                        <span><strong>Domain Name</strong> (1 Year)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Server className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                        <span><strong>1 Month</strong> Web Hosting</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ScanBarcode className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                        <span>NETUM Desktop Barcode Scanner</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Printer className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                        <span>Xprinter Thermal Receipt Printer</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <GraduationCap className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                        <span><strong>{installationPackage.training_days} Days</strong> Staff Training (On-site)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Complete System Setup & Configuration</span>
                      </li>
                    </ul>
                    
                    {/* Payment & Refund Policy */}
                    <div className="bg-muted/50 rounded-lg p-3 mb-4 text-xs space-y-1">
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        <span>Final payment only when satisfied</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        <span>Refunds available if not satisfied</span>
                      </p>
                    </div>
                    
                    <Link to="/signup">
                      <Button className="w-full touch-target btn-press bg-accent hover:bg-accent/90 text-accent-foreground">
                        Get Complete Setup
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Subscription Pricing - Monthly Plans */}
      <section id="pricing" className="section-padding bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Monthly Subscription Plans
            </h2>
            <p className="text-muted-foreground">After installation, continue with a plan that fits your business</p>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse-soft text-muted-foreground">Loading packages...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {subscriptionPackages?.map((pkg, index) => (
                <Card 
                  key={pkg.id} 
                  className={`relative card-elevated animate-fade-up ${
                    index === 1 ? 'border-primary border-2 md:-translate-y-2' : 'border'
                  }`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {index === 1 && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary shadow-md">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                    <div className="pt-3">
                      <span className="text-3xl sm:text-4xl font-bold text-foreground">
                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(pkg.price)}
                      </span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5 mb-6 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Up to {pkg.user_limit} users</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Up to {pkg.branch_limit} branch{pkg.branch_limit > 1 ? 'es' : ''}</span>
                      </li>
                      {(pkg.modules_allowed as string[]).slice(0, 4).map((module) => (
                        <li key={module} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                          <span className="capitalize">{module.replace('_', ' ')}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/signup">
                      <Button 
                        className={`w-full touch-target btn-press`}
                        variant={index === 1 ? "default" : "outline"}
                      >
                        Subscribe
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Note about installation */}
          <div className="text-center mt-8 p-4 bg-card rounded-lg border max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">New to Kabejja?</strong> Start with our{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-accent font-medium hover:underline">
                Complete Installation Package
              </a>{" "}
              for UGX 800,000 which includes hardware, training, and your first month free!
            </p>
          </div>
        </div>
      </section>

      {/* Rental Management Pricing */}
      <section id="rental-pricing" className="section-padding bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <Badge className="bg-primary/10 text-primary mb-4">
              <Home className="h-3 w-3 mr-1" />
              Property Management
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Rental Property Management
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful tools for landlords - manage properties, tenants, leases, and payments all in one place
            </p>
          </div>
          
          {isLoadingRental ? (
            <div className="text-center py-8">
              <div className="animate-pulse-soft text-muted-foreground">Loading packages...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {rentalPackages?.map((pkg, index) => (
                <Card 
                  key={pkg.id} 
                  className={`relative card-elevated animate-fade-up ${
                    index === 2 ? 'border-primary border-2 lg:-translate-y-2' : 'border'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {index === 2 && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary shadow-md">
                      Best Value
                    </Badge>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    <CardDescription className="text-xs min-h-[2.5rem]">{pkg.description}</CardDescription>
                    <div className="pt-3">
                      <span className="text-2xl sm:text-3xl font-bold text-foreground">
                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(pkg.monthly_price)}
                      </span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Up to {pkg.max_properties} properties</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <span>Up to {pkg.max_units} units</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <span>{pkg.included_users} user{pkg.included_users > 1 ? 's' : ''} included</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">
                          +{new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(pkg.price_per_additional_user)}/extra user
                        </span>
                      </li>
                    </ul>
                    <Link to="/signup">
                      <Button 
                        className="w-full touch-target btn-press"
                        variant={index === 2 ? "default" : "outline"}
                      >
                        Get Started
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Rental Features */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="text-center p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Property Tracking</p>
            </div>
            <div className="text-center p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Tenant Management</p>
            </div>
            <div className="text-center p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Payment Tracking</p>
            </div>
            <div className="text-center p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Lease Management</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsSection />

      {/* CTA - Mobile Optimized */}
      <section className="section-padding bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to Transform Your Business?
          </h2>
          <p className="text-primary-foreground/85 mb-6 max-w-lg mx-auto">
            Join hundreds of Ugandan businesses already using Kabejja Systems
          </p>
          <Link to="/signup">
            <Button 
              size="lg" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground touch-target btn-press shadow-elevated"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 safe-bottom">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Kabejja Systems. All rights reserved.</p>
        </div>
      </footer>

      {/* Business Type Dialog */}
      <BusinessTypeDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        businessType={selectedBusinessType} 
      />
    </div>
  );
};

export default Landing;
