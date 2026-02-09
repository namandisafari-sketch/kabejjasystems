import { useState, useEffect, useCallback } from "react";

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        // Try fullscreen on document element first
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          // Safari support
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).msRequestFullscreen) {
          // IE/Edge support
          await (elem as any).msRequestFullscreen();
        }
      }
    } catch (err) {
      // Fullscreen may fail in iframes - try opening in new tab
      console.warn("Fullscreen not available (may be in iframe):", err);
      // If in iframe, open the app in a new window for fullscreen
      if (window.self !== window.top) {
        window.open(window.location.href, '_blank');
      }
    }
  }, []);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  return { isFullscreen, toggleFullscreen };
}
