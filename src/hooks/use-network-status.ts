import { useState, useEffect, useCallback } from "react";

export type NetworkStatus = "online" | "offline" | "slow";

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(navigator.onLine ? "online" : "offline");
  const [lastChanged, setLastChanged] = useState<Date>(new Date());

  const updateStatus = useCallback((newStatus: NetworkStatus) => {
    setStatus(newStatus);
    setLastChanged(new Date());
  }, []);

  useEffect(() => {
    const handleOnline = () => updateStatus("online");
    const handleOffline = () => updateStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check for slow connection using Network Information API
    const connection = (navigator as any).connection;
    if (connection) {
      const handleConnectionChange = () => {
        if (!navigator.onLine) {
          updateStatus("offline");
        } else if (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g") {
          updateStatus("slow");
        } else {
          updateStatus("online");
        }
      };
      connection.addEventListener("change", handleConnectionChange);
      // Initial check
      handleConnectionChange();

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        connection.removeEventListener("change", handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [updateStatus]);

  return { status, isOnline: status !== "offline", isSlow: status === "slow", lastChanged };
}
