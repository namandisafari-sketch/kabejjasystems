import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail, ShieldCheck, ChevronRight, GraduationCap,
  Heart, ShoppingBag, UtensilsCrossed, Building,
  Scissors, Wrench, Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

interface AuthContent {
  title: string;
  subtitle: string;
  heading: string;
  invitationDesc: string;
  signInDesc: string;
  adminTitle: string;
  adminDesc: string;
  adminAction: string;
  Icon: LucideIcon;
}

const authContentByCategory: Record<string, AuthContent> = {
  education: {
    title: "Staff & Teacher Sign-Up",
    subtitle: "School accounts are created by your administrator. Staff and teachers are invited via email.",
    heading: "Join Your School",
    invitationDesc: "If your school administrator sent you an invitation email, click here to accept it and create your account.",
    signInDesc: "Sign in to access your school dashboard, manage students, and more.",
    adminTitle: "Create a school account",
    adminDesc: "If you are a school owner or administrator, you can register your school directly.",
    adminAction: "Register your school here",
    Icon: GraduationCap,
  },
  healthcare: {
    title: "Staff Sign-Up",
    subtitle: "Pharmacy accounts are created by your administrator. Staff members are invited via email.",
    heading: "Join Your Pharmacy",
    invitationDesc: "If your pharmacy administrator sent you an invitation email, click here to accept it and create your account.",
    signInDesc: "Sign in to access your pharmacy dashboard, manage inventory, and more.",
    adminTitle: "Register your pharmacy",
    adminDesc: "If you are a pharmacy owner or administrator, you can register your pharmacy directly.",
    adminAction: "Register your pharmacy here",
    Icon: Heart,
  },
  retail: {
    title: "Staff Sign-Up",
    subtitle: "Store accounts are created by your administrator. Staff members are invited via email.",
    heading: "Join Your Store",
    invitationDesc: "If your store administrator sent you an invitation email, click here to accept it and create your account.",
    signInDesc: "Sign in to access your store dashboard, manage sales, and more.",
    adminTitle: "Register your store",
    adminDesc: "If you are a store owner or administrator, you can register your store directly.",
    adminAction: "Register your store here",
    Icon: ShoppingBag,
  },
  restaurant: {
    title: "Staff Sign-Up",
    subtitle: "Restaurant accounts are created by your administrator. Staff members are invited via email.",
    heading: "Join Your Restaurant",
    invitationDesc: "If your restaurant administrator sent you an invitation email, click here to accept it and create your account.",
    signInDesc: "Sign in to access your restaurant dashboard, manage orders, and more.",
    adminTitle: "Register your restaurant",
    adminDesc: "If you are a restaurant owner or administrator, you can register your restaurant directly.",
    adminAction: "Register your restaurant here",
    Icon: UtensilsCrossed,
  },
  hotel: {
    title: "Staff Sign-Up",
    subtitle: "Hotel accounts are created by your administrator. Staff members are invited via email.",
    heading: "Join Your Hotel",
    invitationDesc: "If your hotel administrator sent you an invitation email, click here to accept it and create your account.",
    signInDesc: "Sign in to access your hotel dashboard, manage bookings, and more.",
    adminTitle: "Register your hotel",
    adminDesc: "If you are a hotel owner or administrator, you can register your hotel directly.",
    adminAction: "Register your hotel here",
    Icon: Building,
  },
  salon: {
    title: "Staff Sign-Up",
    subtitle: "Salon accounts are created by your administrator. Staff members are invited via email.",
    heading: "Join Your Salon",
    invitationDesc: "If your salon administrator sent you an invitation email, click here to accept it and create your account.",
    signInDesc: "Sign in to access your salon dashboard, manage appointments, and more.",
    adminTitle: "Register your salon",
    adminDesc: "If you are a salon owner or administrator, you can register your salon directly.",
    adminAction: "Register your salon here",
    Icon: Scissors,
  },
  repair: {
    title: "Staff Sign-Up",
    subtitle: "Workshop accounts are created by your administrator. Staff members are invited via email.",
    heading: "Join Your Workshop",
    invitationDesc: "If your workshop administrator sent you an invitation email, click here to accept it and create your account.",
    signInDesc: "Sign in to access your workshop dashboard, manage jobs, and more.",
    adminTitle: "Register your workshop",
    adminDesc: "If you are a workshop owner or administrator, you can register your workshop directly.",
    adminAction: "Register your workshop here",
    Icon: Wrench,
  },
  other: {
    title: "Staff Sign-Up",
    subtitle: "Business accounts are created by your administrator. Staff members are invited via email.",
    heading: "Join Your Business",
    invitationDesc: "If your business administrator sent you an invitation email, click here to accept it and create your account.",
    signInDesc: "Sign in to access your dashboard and manage your business.",
    adminTitle: "Register your business",
    adminDesc: "If you are a business owner or administrator, you can register your business directly.",
    adminAction: "Register your business here",
    Icon: Building2,
  },
};

const defaultContent = authContentByCategory.education;

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const suggestedCategory = (location.state as { suggestedCategory?: string })?.suggestedCategory;
  const content = (suggestedCategory && authContentByCategory[suggestedCategory]) || defaultContent;

  return (
    <AuthLayout
      title={content.title}
      subtitle={content.subtitle}
      backTo={{ label: "Back to home", to: "/" }}
    >
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="text-center pb-4 sm:pb-6 pt-0 px-0">
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
            {content.heading}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1.5">
            Choose how you&apos;d like to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 pb-0 space-y-4 sm:space-y-5">
          <div className="grid gap-3 sm:gap-4">
            <button
              onClick={() => navigate("/accept-invitation")}
              className="group relative w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-6 text-left rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 active:scale-[0.99] transition-all duration-200 touch-target cursor-pointer"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200">
                <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                <p className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                  I have an invitation link
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {content.invitationDesc}
                </p>
              </div>
              <div className="shrink-0 flex items-center mt-1 sm:mt-2 text-muted-foreground/40 group-hover:text-primary/60 transition-colors duration-200">
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
            </button>

            <button
              onClick={() => navigate("/login")}
              className="group relative w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-6 text-left rounded-xl border bg-card hover:bg-accent/50 hover:border-emerald-300/40 hover:shadow-md hover:shadow-emerald-500/5 active:scale-[0.99] transition-all duration-200 touch-target cursor-pointer"
            >
              <div className="h-10 w-10 sm:h-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
                <p className="font-semibold text-sm sm:text-base text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  I already have an account
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {content.signInDesc}
                </p>
              </div>
              <div className="shrink-0 flex items-center mt-1 sm:mt-2 text-muted-foreground/40 group-hover:text-emerald-500/60 transition-colors duration-200">
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
            </button>
          </div>

          <div className="relative my-5 sm:my-7">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 sm:px-4 text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">
                For administrators
              </span>
            </div>
          </div>

          <div className="relative rounded-xl border border-dashed bg-gradient-to-br from-muted/30 to-muted/50 p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-0.5 sm:w-1 bg-primary/30 rounded-r-full" />
            <div className="flex items-start gap-3 sm:gap-4 pl-2 sm:pl-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0 mt-0.5">
                <content.Icon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 space-y-1.5 sm:space-y-2">
                <p className="font-semibold text-sm sm:text-base">{content.adminTitle}</p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {content.adminDesc}
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  onClick={() => navigate("/admin-signup")}
                >
                  {content.adminAction} &rarr;
                </Button>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-1 sm:pt-2">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-all whitespace-nowrap"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default Signup;
