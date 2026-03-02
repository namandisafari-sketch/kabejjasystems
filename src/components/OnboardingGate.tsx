import { Navigate } from "react-router-dom";
import WelcomeOnboarding from "@/pages/WelcomeOnboarding";

export default function OnboardingGate() {
  const hasOnboarded = localStorage.getItem("tennahub-onboarded") === "true";

  if (hasOnboarded) {
    return <Navigate to="/home" replace />;
  }

  return <WelcomeOnboarding />;
}
