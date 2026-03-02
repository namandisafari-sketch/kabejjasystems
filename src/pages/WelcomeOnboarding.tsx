import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, ShoppingCart, UtensilsCrossed, Bed,
  Scissors, Pill, Wrench, Building2, LogIn, UserPlus,
  Sparkles, ArrowRight, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import kabejjaLogo from "@/assets/kabejja-logo.png";
import { FloatingParticles } from "@/components/FloatingParticles";

interface BusinessOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  businessTypes: string[];
}

const businessOptions: BusinessOption[] = [
  {
    id: "education",
    title: "Schools & Education",
    description: "Kindergartens, Primary & Secondary Schools",
    icon: <GraduationCap className="w-7 h-7" />,
    gradient: "from-blue-500 to-indigo-600",
    businessTypes: ["kindergarten", "primary_school", "secondary_school"],
  },
  {
    id: "retail",
    title: "Retail & Shops",
    description: "Supermarkets, Boutiques, Hardware",
    icon: <ShoppingCart className="w-7 h-7" />,
    gradient: "from-emerald-500 to-teal-600",
    businessTypes: ["retail_shop", "supermarket", "boutique"],
  },
  {
    id: "restaurant",
    title: "Restaurants & Bars",
    description: "Restaurants, Cafes, Bars & Food",
    icon: <UtensilsCrossed className="w-7 h-7" />,
    gradient: "from-orange-500 to-red-600",
    businessTypes: ["restaurant", "bar", "cafe"],
  },
  {
    id: "hotel",
    title: "Hotels & Lodges",
    description: "Hotels, Lodges & Guest Houses",
    icon: <Bed className="w-7 h-7" />,
    gradient: "from-purple-500 to-pink-600",
    businessTypes: ["hotel", "lodge", "guest_house"],
  },
  {
    id: "salon",
    title: "Salons & Spas",
    description: "Beauty Salons, Spas & Barbers",
    icon: <Scissors className="w-7 h-7" />,
    gradient: "from-pink-500 to-rose-600",
    businessTypes: ["salon", "spa", "barber"],
  },
  {
    id: "healthcare",
    title: "Healthcare",
    description: "Pharmacies, Clinics & Hospitals",
    icon: <Pill className="w-7 h-7" />,
    gradient: "from-cyan-500 to-blue-600",
    businessTypes: ["pharmacy", "hospital", "clinic"],
  },
  {
    id: "repair",
    title: "Repair Services",
    description: "Garages, Phone Repair & Workshops",
    icon: <Wrench className="w-7 h-7" />,
    gradient: "from-amber-500 to-orange-600",
    businessTypes: ["garage", "tech_repair", "repair_shop"],
  },
  {
    id: "other",
    title: "Other Business",
    description: "Any other business type",
    icon: <Building2 className="w-7 h-7" />,
    gradient: "from-slate-500 to-gray-600",
    businessTypes: ["other"],
  },
];

type Step = "welcome" | "select" | "action";

export default function WelcomeOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<BusinessOption | null>(null);

  const handleComplete = () => {
    localStorage.setItem("tennahub-onboarded", "true");
  };

  const goToSignup = () => {
    handleComplete();
    navigate("/signup", {
      state: {
        suggestedCategory: selected?.id,
        suggestedBusinessTypes: selected?.businessTypes,
      },
    });
  };

  const goToLogin = () => {
    handleComplete();
    navigate("/login");
  };

  const skipToHome = () => {
    handleComplete();
    navigate("/home");
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Animated gradient background */}
      <div
        className="fixed inset-0 -z-10 animate-gradient-shift"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)/0.12) 0%, hsl(var(--background)) 30%, hsl(var(--accent)/0.08) 60%, hsl(var(--background)) 80%, hsl(var(--primary)/0.06) 100%)",
          backgroundSize: "400% 400%",
        }}
      />
      <FloatingParticles count={18} />

      <AnimatePresence mode="wait">
        {/* STEP 1: Welcome */}
        {step === "welcome" && (
          <motion.div
            key="welcome"
            className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.5 }}
          >
            <motion.img
              src={kabejjaLogo}
              alt="TennaHub"
              className="h-24 w-auto mb-6"
              animate={{ rotate: [0, -4, 4, 0], scale: [1, 1.03, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Made for Uganda 🇺🇬
              </div>
            </motion.div>
            <motion.h1
              className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Welcome to{" "}
              <span className="text-gradient">TennaHub</span>
            </motion.h1>
            <motion.p
              className="text-muted-foreground max-w-sm mb-8 text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              The all-in-one platform to run your business like a pro. Let's get you started!
            </motion.p>
            <motion.div
              className="flex flex-col gap-3 w-full max-w-xs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                size="lg"
                className="w-full text-base gap-2"
                onClick={() => setStep("select")}
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={skipToHome}
              >
                I'll just browse
              </Button>
            </motion.div>
            <motion.p
              className="text-xs text-muted-foreground mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Powered by Kabejja Systems
            </motion.p>
          </motion.div>
        )}

        {/* STEP 2: Select Business */}
        {step === "select" && (
          <motion.div
            key="select"
            className="flex-1 flex flex-col px-4 py-6 safe-top safe-bottom"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.4, ease: [0.21, 0.45, 0.27, 0.9] }}
          >
            <div className="max-w-lg mx-auto w-full">
              <button
                onClick={() => setStep("welcome")}
                className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-6"
              >
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                  What type of business do you run?
                </h2>
                <p className="text-sm text-muted-foreground">
                  We'll personalize your experience
                </p>
              </motion.div>

              <div className="grid grid-cols-2 gap-3">
                {businessOptions.map((option, index) => (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.06 }}
                    className={`relative overflow-hidden rounded-xl text-left transition-all duration-200 ${
                      selected?.id === option.id
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]"
                        : "hover:scale-[1.02]"
                    }`}
                    onClick={() => setSelected(option)}
                  >
                    <div
                      className={`bg-gradient-to-br ${option.gradient} p-4 text-white h-full`}
                    >
                      <div className="flex items-center justify-center w-11 h-11 mb-2 rounded-xl bg-white/20 backdrop-blur-sm">
                        {option.icon}
                      </div>
                      <h3 className="font-semibold text-sm leading-tight mb-0.5">
                        {option.title}
                      </h3>
                      <p className="text-2xs text-white/75 line-clamp-2">
                        {option.description}
                      </p>
                    </div>
                    {selected?.id === option.id && (
                      <motion.div
                        layoutId="check"
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      >
                        <span className="text-primary text-sm font-bold">✓</span>
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>

              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 20, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6"
                  >
                    <Button
                      size="lg"
                      className="w-full text-base gap-2"
                      onClick={() => setStep("action")}
                    >
                      Continue with {selected.title}
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Login or Signup */}
        {step === "action" && (
          <motion.div
            key="action"
            className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.4, ease: [0.21, 0.45, 0.27, 0.9] }}
          >
            <div className="max-w-sm w-full">
              <button
                onClick={() => setStep("select")}
                className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              {selected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${selected.gradient} text-white text-sm font-medium mb-6`}
                >
                  {selected.icon}
                  {selected.title}
                </motion.div>
              )}

              <motion.h2
                className="text-2xl font-bold text-foreground mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                How would you like to proceed?
              </motion.h2>
              <motion.p
                className="text-sm text-muted-foreground mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Create a new account or sign in to your existing one
              </motion.p>

              <motion.div
                className="flex flex-col gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  size="lg"
                  className="w-full text-base gap-2"
                  onClick={goToSignup}
                >
                  <UserPlus className="w-5 h-5" />
                  Create New Account
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full text-base gap-2"
                  onClick={goToLogin}
                >
                  <LogIn className="w-5 h-5" />
                  Sign In to Existing Account
                </Button>
              </motion.div>

              <motion.button
                className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={skipToHome}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Skip — take me to the homepage
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
