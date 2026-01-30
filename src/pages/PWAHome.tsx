import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, ShoppingCart, UtensilsCrossed, Bed, 
  Scissors, Pill, Wrench, Building2, LogIn, UserPlus,
  Sparkles, Users, BookOpen, Briefcase, RefreshCw, Download,
  Award, FileSearch
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePWAUpdate } from "@/hooks/use-pwa-update";
import { toast } from "@/hooks/use-toast";
import kabejjaLogo from "@/assets/kabejja-logo.png";

interface PublicServiceCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  route: string;
}

const publicServices: PublicServiceCard[] = [
  {
    id: "exam-results",
    title: "Check Exam Results",
    description: "Look up UNEB national examination results by index number",
    icon: <Award className="w-6 h-6" />,
    gradient: "from-indigo-600 to-blue-700",
    route: "/exam-results"
  },
  {
    id: "job-status",
    title: "Job Status",
    description: "Track your repair job or service request",
    icon: <FileSearch className="w-6 h-6" />,
    gradient: "from-slate-600 to-gray-700",
    route: "/job-status"
  }
];

interface SecondaryUserCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  route: string;
}

const secondaryUsers: SecondaryUserCard[] = [
  {
    id: "parent",
    title: "Parent Portal",
    description: "Track your child's progress, fees & attendance",
    icon: <Users className="w-6 h-6" />,
    gradient: "from-violet-500 to-purple-600",
    route: "/parent"
  },
  {
    id: "renter",
    title: "KaRental Ko",
    description: "View lease, payments & maintenance",
    icon: <Building2 className="w-6 h-6" />,
    gradient: "from-amber-500 to-orange-600",
    route: "/renter"
  },
  {
    id: "teacher",
    title: "Teacher Access",
    description: "Manage classes, grades & students",
    icon: <BookOpen className="w-6 h-6" />,
    gradient: "from-sky-500 to-blue-600",
    route: "/login"
  },
  {
    id: "staff",
    title: "Staff Login",
    description: "Access your workplace dashboard",
    icon: <Briefcase className="w-6 h-6" />,
    gradient: "from-teal-500 to-emerald-600",
    route: "/login"
  }
];

interface CategoryCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  route: string;
  businessTypes: string[];
}

const categories: CategoryCard[] = [
  {
    id: "education",
    title: "Schools & Education",
    description: "Kindergartens, Primary & Secondary Schools",
    icon: <GraduationCap className="w-8 h-8" />,
    gradient: "from-blue-500 to-indigo-600",
    route: "/signup",
    businessTypes: ["kindergarten", "primary_school", "secondary_school"]
  },
  {
    id: "retail",
    title: "Retail & Shops",
    description: "Supermarkets, Boutiques, Hardware & More",
    icon: <ShoppingCart className="w-8 h-8" />,
    gradient: "from-emerald-500 to-teal-600",
    route: "/signup",
    businessTypes: ["retail_shop", "supermarket", "boutique"]
  },
  {
    id: "restaurant",
    title: "Restaurants & Bars",
    description: "Restaurants, Cafes, Bars & Food Service",
    icon: <UtensilsCrossed className="w-8 h-8" />,
    gradient: "from-orange-500 to-red-600",
    route: "/signup",
    businessTypes: ["restaurant", "bar", "cafe"]
  },
  {
    id: "hotel",
    title: "Hotels & Lodges",
    description: "Hotels, Lodges & Guest Houses",
    icon: <Bed className="w-8 h-8" />,
    gradient: "from-purple-500 to-pink-600",
    route: "/signup",
    businessTypes: ["hotel", "lodge", "guest_house"]
  },
  {
    id: "salon",
    title: "Salons & Spas",
    description: "Beauty Salons, Spas & Barber Shops",
    icon: <Scissors className="w-8 h-8" />,
    gradient: "from-pink-500 to-rose-600",
    route: "/signup",
    businessTypes: ["salon", "spa", "barber"]
  },
  {
    id: "healthcare",
    title: "Healthcare",
    description: "Pharmacies, Clinics & Hospitals",
    icon: <Pill className="w-8 h-8" />,
    gradient: "from-cyan-500 to-blue-600",
    route: "/signup",
    businessTypes: ["pharmacy", "hospital", "clinic"]
  },
  {
    id: "repair",
    title: "Repair Services",
    description: "Garages, Phone Repair & Workshops",
    icon: <Wrench className="w-8 h-8" />,
    gradient: "from-amber-500 to-orange-600",
    route: "/signup",
    businessTypes: ["garage", "tech_repair", "repair_shop"]
  },
  {
    id: "other",
    title: "Other Business",
    description: "Any other business type",
    icon: <Building2 className="w-8 h-8" />,
    gradient: "from-slate-500 to-gray-600",
    route: "/signup",
    businessTypes: ["other"]
  }
];

export default function PWAHome() {
  const navigate = useNavigate();
  const { needRefresh, updateServiceWorker, checkForUpdates, isChecking } = usePWAUpdate();

  const handleCheckUpdates = async () => {
    await checkForUpdates();
    if (!needRefresh) {
      toast({
        title: "You're up to date!",
        description: "No new updates available.",
      });
    }
  };

  const handleUpdate = async () => {
    await updateServiceWorker();
    toast({
      title: "Updating...",
      description: "The app will reload with the latest version.",
    });
  };

  const handleCategoryClick = (category: CategoryCard) => {
    // Navigate to signup with pre-selected business type
    navigate(category.route, { 
      state: { 
        suggestedCategory: category.id,
        suggestedBusinessTypes: category.businessTypes 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 safe-top">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <img 
              src={kabejjaLogo} 
              alt="TennaHub" 
              className="h-14 w-auto sm:h-16"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">TennaHub</h1>
              <p className="text-2xs text-muted-foreground">Powered by Kabejja Systems</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {needRefresh ? (
              <Button 
                variant="default" 
                size="sm"
                onClick={handleUpdate}
                className="text-sm gap-1 animate-pulse"
              >
                <Download className="w-4 h-4" />
                Update
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleCheckUpdates}
                disabled={isChecking}
                className="h-9 w-9"
                title="Check for updates"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/login")}
              className="text-sm"
            >
              <LogIn className="w-4 h-4 mr-1" />
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          Made for Uganda
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Run Your Business
          <span className="block text-gradient">Like a Pro</span>
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Select your business category to get started with powerful management tools
        </p>
      </section>

      {/* Category Cards Grid */}
      <section className="px-4 pb-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto">
          {categories.map((category, index) => (
            <Card
              key={category.id}
              className="group cursor-pointer overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 active:scale-[0.98] animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleCategoryClick(category)}
            >
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${category.gradient} p-4 text-white`}>
                  <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base leading-tight mb-1">
                    {category.title}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-2">
                    {category.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Public Services Section - No Login Required */}
      <section className="px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              🔓 Public Services
            </h3>
            <p className="text-sm text-muted-foreground">
              Access these services without logging in
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicServices.map((service, index) => (
              <Card
                key={service.id}
                className="group cursor-pointer overflow-hidden border-2 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98] animate-fade-up"
                style={{ animationDelay: `${(index + 8) * 50}ms` }}
                onClick={() => navigate(service.route)}
              >
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${service.gradient} p-4 text-white`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        {service.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-base leading-tight mb-1">
                          {service.title}
                        </h4>
                        <p className="text-xs text-white/80 line-clamp-2">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary Users Section */}
      <section className="px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Employee & Parent Access
            </h3>
            <p className="text-sm text-muted-foreground">
              Access your organization's dashboard
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {secondaryUsers.map((user, index) => (
              <Card
                key={user.id}
                className="group cursor-pointer overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 active:scale-[0.98] animate-fade-up"
                style={{ animationDelay: `${(index + 10) * 50}ms` }}
                onClick={() => navigate(user.route)}
              >
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${user.gradient} p-3 text-white text-center`}>
                    <div className="flex items-center justify-center w-10 h-10 mb-2 mx-auto rounded-full bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                      {user.icon}
                    </div>
                    <h4 className="font-medium text-xs sm:text-sm leading-tight mb-0.5">
                      {user.title}
                    </h4>
                    <p className="text-2xs text-white/80 hidden sm:block line-clamp-2">
                      {user.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">
                    Business Owner?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sign in to manage your business dashboard
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/login")}
                  className="w-full sm:w-auto"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 pb-safe-bottom pb-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs text-muted-foreground mb-4">
            Join 500+ Ugandan businesses already using TennaHub
          </p>
          <Button 
            size="lg"
            onClick={() => navigate("/signup")}
            className="w-full sm:w-auto gap-2 btn-press"
          >
            <UserPlus className="w-5 h-5" />
            Create Free Account
          </Button>
        </div>
      </section>
    </div>
  );
}
