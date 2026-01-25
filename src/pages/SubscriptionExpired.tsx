import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SubscriptionExpired() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard instead of showing blocking screen
    navigate('/dashboard');
  }, [navigate]);

  return null;
}