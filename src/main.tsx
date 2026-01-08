import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handler for debugging white screens
window.onerror = function (message, source, lineno, colno, error) {
  const errorMsg = `JS Error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}`;
  console.error(errorMsg);
  // Show an alert only in production/native environments where console is hard to access
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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
