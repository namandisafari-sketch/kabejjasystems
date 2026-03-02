import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  GraduationCap, ShoppingCart, UtensilsCrossed, Bed, 
  Scissors, Pill, Wrench, Building2, LogIn,
  Sparkles, Users, BookOpen, Briefcase, RefreshCw, Download,
  Award, FileSearch, Moon, Star
} from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePWAUpdate } from "@/hooks/use-pwa-update";
import { toast } from "@/hooks/use-toast";
import kabejjaLogo from "@/assets/kabejja-logo.png";
import { SponsorMarquee } from "@/components/SponsorMarquee";
import { FloatingParticles } from "@/components/FloatingParticles";
import { AnimatedCard } from "@/components/AnimatedCard";

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
    navigate(category.route, { 
      state: { 
        suggestedCategory: category.id,
        suggestedBusinessTypes: category.businessTypes 
      } 
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden safe-top safe-bottom">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10 animate-gradient-shift" style={{
        background: "linear-gradient(135deg, hsl(var(--primary)/0.08) 0%, hsl(var(--background)) 25%, hsl(var(--accent)/0.06) 50%, hsl(var(--background)) 75%, hsl(var(--primary)/0.05) 100%)",
        backgroundSize: "400% 400%",
      }} />
      
      {/* Floating particles */}
      <FloatingParticles count={25} />

      {/* Header */}
      <motion.header 
        className="sticky top-0 z-50 glass border-b border-border/50 safe-top backdrop-blur-xl"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="container flex items-center justify-between h-16 px-4">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <motion.img 
              src={kabejjaLogo} 
              alt="TennaHub" 
              className="h-14 w-auto sm:h-16"
              animate={{ rotate: [0, -3, 3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">TennaHub</h1>
              <p className="text-2xs text-muted-foreground">Powered by Kabejja Systems</p>
            </div>
          </motion.div>
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
      </motion.header>

      {/* Ramadan Kareem Banner */}
      <section className="px-4 pt-6 pb-2">
        <motion.div 
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.21, 0.45, 0.27, 0.9] }}
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-5 text-center shadow-lg">
            {/* Decorative stars */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                animate={{
                  opacity: [0.1, 0.4, 0.1],
                  scale: [0.8, 1.2, 0.8],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: Math.random() * 3 + 3,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                }}
              >
                <Star
                  className="text-yellow-300/30"
                  size={Math.random() * 10 + 5}
                  fill="currentColor"
                />
              </motion.div>
            ))}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  y: [0, -5, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Moon className="text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.4)]" size={36} strokeWidth={1.5} />
              </motion.div>
              <p className="text-yellow-400/90 text-lg font-light" style={{ fontFamily: 'serif' }}>رمضان كريم</p>
              <h3 className="text-xl font-bold text-white tracking-tight">Ramadan Kareem 🌙</h3>
              <p className="text-emerald-200/70 text-xs max-w-xs">
                Wishing all Muslims a blessed and peaceful holy month 🤲
              </p>
              <div className="mt-3 pt-3 border-t border-emerald-700/40 w-full">
                <p className="text-white font-semibold text-sm">✝️ Happy Lenten Season</p>
                <p className="text-emerald-200/70 text-xs max-w-xs mx-auto">
                  Wishing all Christians a reflective and blessed season of prayer & fasting 🙏
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Hero Section */}
      <section className="px-4 py-6 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-primary/10 text-primary text-sm font-medium"
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
          Made for Uganda
        </motion.div>
        <motion.h2 
          className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          Run Your Business
          <motion.span 
            className="block text-gradient"
            animate={{ 
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            style={{ backgroundSize: "200% 200%" }}
          >
            Like a Pro
          </motion.span>
        </motion.h2>
        <motion.p 
          className="text-muted-foreground max-w-md mx-auto mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          Select your business category to get started with powerful management tools
        </motion.p>
      </section>

      {/* Category Cards Grid */}
      <section className="px-4 pb-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto">
          {categories.map((category, index) => (
            <AnimatedCard
              key={category.id}
              className="cursor-pointer overflow-hidden rounded-xl border-0 shadow-md"
              delay={index * 0.08}
              onClick={() => handleCategoryClick(category)}
            >
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${category.gradient} p-4 text-white`}>
                  <motion.div 
                    className="flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-white/20 backdrop-blur-sm"
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
                    transition={{ duration: 0.5 }}
                  >
                    {category.icon}
                  </motion.div>
                  <h3 className="font-semibold text-sm sm:text-base leading-tight mb-1">
                    {category.title}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-2">
                    {category.description}
                  </p>
                </div>
              </CardContent>
            </AnimatedCard>
          ))}
        </div>
      </section>

      {/* Public Services Section */}
      <section className="px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <motion.div 
            className="text-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-1">
              🔓 Public Services
            </h3>
            <p className="text-sm text-muted-foreground">
              Access these services without logging in
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicServices.map((service, index) => (
              <AnimatedCard
                key={service.id}
                className="cursor-pointer overflow-hidden rounded-xl border-2 border-primary/20 shadow-lg"
                delay={index * 0.1}
                onClick={() => navigate(service.route)}
              >
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${service.gradient} p-4 text-white`}>
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm"
                        whileHover={{ scale: 1.15, rotate: 5 }}
                      >
                        {service.icon}
                      </motion.div>
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
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary Users Section */}
      <section className="px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <motion.div 
            className="text-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Employee & Parent Access
            </h3>
            <p className="text-sm text-muted-foreground">
              Access your organization's dashboard
            </p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {secondaryUsers.map((user, index) => (
              <AnimatedCard
                key={user.id}
                className="cursor-pointer overflow-hidden rounded-xl border-0 shadow-sm"
                delay={index * 0.08}
                onClick={() => navigate(user.route)}
              >
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${user.gradient} p-3 text-white text-center`}>
                    <motion.div 
                      className="flex items-center justify-center w-10 h-10 mb-2 mx-auto rounded-full bg-white/20 backdrop-blur-sm"
                      whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
                    >
                      {user.icon}
                    </motion.div>
                    <h4 className="font-medium text-xs sm:text-sm leading-tight mb-0.5">
                      {user.title}
                    </h4>
                    <p className="text-2xs text-white/80 hidden sm:block line-clamp-2">
                      {user.description}
                    </p>
                  </div>
                </CardContent>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="px-4 pb-8">
        <motion.div 
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.21, 0.45, 0.27, 0.9] }}
        >
          <div className="rounded-xl border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 border p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  Business Owner?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sign in to manage your business dashboard
                </p>
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={() => navigate("/login")}
                  className="w-full sm:w-auto"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Sponsors Marquee */}
      <SponsorMarquee />

      {/* Bottom Info */}
      <section className="px-4 pb-safe-bottom pb-8 pt-6">
        <motion.div 
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-xs text-muted-foreground">
            Trusted by 500+ Ugandan businesses
          </p>
        </motion.div>
      </section>
    </div>
  );
}
