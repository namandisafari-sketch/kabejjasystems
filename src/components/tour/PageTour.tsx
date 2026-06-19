import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride";
import type { Step, CallBackProps } from "react-joyride";
import { HelpCircle } from "lucide-react";
import { getTourForPath, isEducationRoute } from "./educationTourSteps";

const TOUR_STORAGE_KEY = "tennahub-education-tour-completed";

export function PageTour() {
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tourKey, setTourKey] = useState(0);
  const [showHelpButton, setShowHelpButton] = useState(false);
  const [hasRunBefore, setHasRunBefore] = useState(false);
  const currentPathRef = useRef(location.pathname);

  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (isEducationRoute(location.pathname)) {
      const tour = getTourForPath(location.pathname);
      if (tour) {
        const patchedSteps = tour.steps.map((s) => ({
          ...s,
          disableOverlay: true,
          disableBeacon: true,
        }));
        setSteps(patchedSteps);

        const completed = localStorage.getItem(TOUR_STORAGE_KEY);
        const completedTours: Record<string, boolean> = completed
          ? JSON.parse(completed)
          : {};

        const alreadyCompleted = !!completedTours[location.pathname];
        setHasRunBefore(alreadyCompleted);
        setShowHelpButton(true);

        if (!alreadyCompleted) {
          const timer = setTimeout(() => {
            setStepIndex(0);
            setRun(true);
            setTourKey((k) => k + 1);
          }, 800);
          return () => clearTimeout(timer);
        }
      }
    } else {
      setRun(false);
      setSteps([]);
      setShowHelpButton(false);
    }
  }, [location.pathname]);

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { action, index, status, type } = data;

      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
        if (nextStepIndex < steps.length && nextStepIndex >= 0) {
          setStepIndex(nextStepIndex);
          return;
        }
      }

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
        setStepIndex(0);
        setHasRunBefore(true);

        try {
          const completed = localStorage.getItem(TOUR_STORAGE_KEY);
          const completedTours: Record<string, boolean> = completed
            ? JSON.parse(completed)
            : {};
          completedTours[currentPathRef.current] = true;
          localStorage.setItem(
            TOUR_STORAGE_KEY,
            JSON.stringify(completedTours)
          );
        } catch {
          // localStorage not available
        }
      }
    },
    [steps.length]
  );

  const handleRestartTour = useCallback(() => {
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      const completedTours: Record<string, boolean> = completed
        ? JSON.parse(completed)
        : {};
      delete completedTours[currentPathRef.current];
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completedTours));
    } catch {
      // localStorage not available
    }
    setHasRunBefore(false);
    setStepIndex(0);
    setRun(true);
    setTourKey((k) => k + 1);
  }, []);

  return (
    <>
      {steps.length > 0 && (
        <Joyride
          key={tourKey}
          steps={steps}
          run={run}
          stepIndex={stepIndex}
          continuous
          showProgress
          showSkipButton
          hideBackButton={stepIndex === 0}
          callback={handleJoyrideCallback}
          styles={{
            options: {
              zIndex: 10000,
              primaryColor: "#2563eb",
              textColor: "#0f172a",
              backgroundColor: "#ffffff",
              arrowColor: "#ffffff",
              overlayColor: "transparent",
            },
            tooltipContainer: {
              textAlign: "left",
            },
            buttonNext: {
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            },
            buttonBack: {
              color: "#64748b",
              fontSize: "13px",
              marginRight: "8px",
              cursor: "pointer",
              border: "none",
              background: "none",
              padding: "8px 12px",
              borderRadius: "8px",
              transition: "all 0.15s ease",
            },
            buttonSkip: {
              color: "#94a3b8",
              fontSize: "12px",
              cursor: "pointer",
              border: "none",
              background: "none",
              padding: "8px 12px",
            },
            tooltip: {
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)",
            },
            tooltipTitle: {
              fontSize: "17px",
              fontWeight: 700,
              marginBottom: "10px",
              color: "#0f172a",
              lineHeight: "1.4",
            },
            tooltipContent: {
              fontSize: "14px",
              lineHeight: "1.7",
              color: "#475569",
            },
            buttonClose: {
              display: "none",
            },
            progress: {
              color: "#94a3b8",
              fontSize: "12px",
            },
            spotlight: {
              borderRadius: "12px",
            },
          }}
          locale={{
            back: "Back",
            close: "Close",
            last: "Got it!",
            next: "Next",
            skip: "Skip",
          }}
          floaterProps={{
            disableAnimation: false,
            options: {
              preventOverflow: true,
            },
          }}
        />
      )}

      {showHelpButton && (
        <button
          onClick={handleRestartTour}
          title="Show page guide"
          className={`fixed bottom-6 right-6 z-[9999] flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 ${
            run
              ? "bg-blue-500 text-white"
              : hasRunBefore
              ? "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 hover:border-blue-300"
              : "bg-blue-600 text-white animate-bounce"
          }`}
          style={{
            boxShadow: hasRunBefore
              ? "0 4px 16px rgba(37,99,235,0.15)"
              : "0 8px 32px rgba(37,99,235,0.35)",
          }}
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
