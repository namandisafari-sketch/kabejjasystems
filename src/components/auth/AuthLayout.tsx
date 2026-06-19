import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export interface WizardStep {
  id: string;
  label: string;
  icon: ReactNode;
}

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  steps?: WizardStep[];
  currentStep?: string;
  backTo?: { label: string; to: string };
}

export function AuthLayout({ children, title, subtitle, steps, currentStep, backTo }: AuthLayoutProps) {
  const currentIndex = steps ? steps.findIndex((s) => s.id === currentStep) : -1;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row safe-top safe-bottom">
      {/* Left Panel - Branding & Wizard */}
      <div className="relative flex flex-col justify-between lg:w-[45%] bg-gradient-to-br from-[#005bc4] via-[#004a9e] to-[#003078] p-8 lg:p-12 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, white 1px, transparent 0)`,
            backgroundSize: '50px 50px',
          }} />
        </div>

        {/* Floating decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5" />

        {/* Top section */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">Back</span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="mt-12 lg:mt-16">
            <svg viewBox="0 0 680 220" className="h-10 mb-8" role="img" aria-label="TennaHub">
              <g transform="translate(340,110)">
                <rect x="-178" y="-52" width="7" height="80" rx="3.5" fill="white" />
                <text x="-158" y="8" fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif"
                  fontWeight="800" fontSize="58" fill="white" textAnchor="start" letterSpacing="-1">TENNA</text>
                <text x="10" y="8" fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif"
                  fontWeight="800" fontSize="58" fill="#6ab0ff" textAnchor="start" letterSpacing="-1">HUB</text>
              </g>
            </svg>

            <h1 className="text-3xl lg:text-4xl font-bold leading-tight">{title}</h1>
            <p className="mt-3 text-white/70 text-lg max-w-md">{subtitle}</p>
          </div>
        </div>

        {/* Wizard Steps */}
        {steps && steps.length > 0 && (
          <div className="relative z-10 my-12 lg:my-0 lg:mb-16">
            <div className="space-y-6">
              {steps.map((step, i) => {
                const isActive = i === currentIndex;
                const isComplete = i < currentIndex;
                const isPending = i > currentIndex;

                return (
                  <div key={step.id} className="flex items-center gap-4">
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 transition-all duration-300
                      ${isActive ? 'border-white bg-white/20 scale-110 shadow-lg shadow-white/20' : ''}
                      ${isComplete ? 'border-white bg-white text-[#005bc4]' : ''}
                      ${isPending ? 'border-white/30 text-white/30' : ''}
                    `}>
                      <span className={`
                        ${isActive ? 'text-white' : ''}
                        ${isComplete ? '' : ''}
                        ${isPending ? 'opacity-40' : ''}
                      `}>
                        {step.icon}
                      </span>
                    </div>
                    <div className={`
                      transition-all duration-300
                      ${isActive ? 'opacity-100' : ''}
                      ${isComplete ? 'opacity-70' : ''}
                      ${isPending ? 'opacity-30' : ''}
                    `}>
                      <p className="text-sm font-medium">
                        Step {i + 1}
                      </p>
                      <p className="text-white/80 text-sm">{step.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom info */}
        <div className="relative z-10 text-white/40 text-xs">
          <p>&copy; {new Date().getFullYear()} TennaHub. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-background to-muted/30 min-h-0">
        {backTo && (
          <div className="hidden lg:flex items-center p-4">
            <Link
              to={backTo.to}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {backTo.label}
            </Link>
          </div>
        )}

        <main className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
