import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handler - must be registered BEFORE React renders
window.onerror = function (message, source, lineno, colno, error) {
  const errorMsg = `JS Error: ${message}
Source: ${source}
Line: ${lineno}
Column: ${colno}`;
  console.error(errorMsg);
  if (import.meta.env.PROD) {
    alert(errorMsg);
  }
  return false;
};

// Catch unhandled promise rejections
window.onunhandledrejection = function (event) {
  const errorMsg = `Unhandled Promise: ${event.reason}`;
  console.error(errorMsg);
  if (import.meta.env.PROD) {
    alert(errorMsg);
  }
};

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) {
    console.error("React Error Boundary caught:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: "40px", maxWidth: "600px", margin: "40px auto",
          fontFamily: "system-ui, sans-serif", background: "#fff3f3", borderRadius: 8,
          border: "2px solid #e53e3e"
        }}>
          <h1 style={{ color: "#e53e3e", fontSize: 20 }}>Application Error</h1>
          <pre style={{
            whiteSpace: "pre-wrap", background: "#1a1a2e", color: "#e2e2e2",
            padding: 16, borderRadius: 6, fontSize: 13, marginTop: 12,
            overflow: "auto", maxHeight: "50vh"
          }}>{this.state.error.stack || this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  document.body.innerHTML = '<div style="padding:40px;font-family:system-ui;color:red"><h1>Fatal: root element not found</h1></div>';
} else {
  try {
    createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (e: any) {
    rootElement.innerHTML = `<div style="padding:40px;font-family:system-ui;color:red"><h1>Render initialization failed</h1><pre>${e?.stack || e?.message || String(e)}</pre></div>`;
  }
}
