import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride";
import type { Step, CallBackProps } from "react-joyride";
import { getTourForPath, isEducationRoute } from "./educationTourSteps";

const TOUR_STORAGE_KEY = "tennahub-education-tour-completed";

export function PageTour() {
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tourKey, setTourKey] = useState(0);
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

        if (!completedTours[location.pathname]) {
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

      if (
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED
      ) {
        setRun(false);
        setStepIndex(0);

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

  if (steps.length === 0) return null;

  return (
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
          textColor: "#1e293b",
          backgroundColor: "#ffffff",
          arrowColor: "#ffffff",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "#2563eb",
          fontSize: "14px",
          padding: "8px 18px",
          borderRadius: "8px",
        },
        buttonBack: {
          color: "#64748b",
          fontSize: "14px",
          marginRight: "8px",
        },
        buttonSkip: {
          color: "#94a3b8",
          fontSize: "13px",
        },
        tooltip: {
          borderRadius: "12px",
          padding: "20px",
          maxWidth: "420px",
        },
        tooltipTitle: {
          fontSize: "18px",
          fontWeight: 600,
          marginBottom: "8px",
          color: "#0f172a",
        },
        tooltipContent: {
          fontSize: "14px",
          lineHeight: "1.6",
          color: "#334155",
        },
        buttonClose: {
          display: "none",
        },
      }}
      locale={{
        back: "Previous",
        close: "Close",
        last: "Done",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
}
