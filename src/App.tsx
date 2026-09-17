import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardProvider } from "@/contexts/DashboardContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import React from "react";

// ─── Global uncaught-error safety net ────────────────────────────────────────
// Catches errors that React's error boundary misses (module load failures,
// hydration crashes, async errors outside the render tree). Without this the
// app goes blank with no visible feedback.
if (typeof window !== "undefined") {
  const showFatal = (msg: string, stack?: string) => {
    const el = document.getElementById("mc-fatal");
    if (!el) return;
    el.style.display = "flex";
    el.innerHTML = `
      <div style="max-width:560px;padding:32px;background:#1a1d27;border:1px solid #ef4444;border-radius:16px;color:#f8fafc;font-family:system-ui">
        <div style="font-size:24px;font-weight:800;margin-bottom:8px">Mission Control hit an error</div>
        <div style="color:#ef4444;font-weight:700;font-size:14px;margin-bottom:12px">${msg}</div>
        ${stack ? `<pre style="background:#0d0f14;padding:12px;border-radius:8;overflow:auto;font-size:11px;color:#94a3b8;white-space:pre-wrap;max-height:240px">${stack}</pre>` : ""}
        <button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#3b5cf6;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px">Reload</button>
      </div>`;
  };
  window.addEventListener("error", (e) => {
    console.error("Fatal client error:", e.error ?? e.message);
    showFatal(e.message, e.error?.stack);
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error("Unhandled promise rejection:", e.reason);
    const msg = e.reason?.message ?? String(e.reason ?? "Unknown error");
    showFatal(msg, e.reason?.stack);
  });
}

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Mission Control Error:", error, info);
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0d0f14",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 640,
              background: "#1a1d27",
              border: "1px solid #ef4444",
              borderRadius: 16,
              padding: 32,
              color: "#f8fafc",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
              Mission Control hit an error
            </div>
            <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              {err.message}
            </div>
            <pre
              style={{
                background: "#0d0f14",
                padding: 16,
                borderRadius: 8,
                overflow: "auto",
                fontSize: 11,
                color: "#94a3b8",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 300,
              }}
            >
              {err.stack}
            </pre>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              style={{
                marginTop: 20,
                padding: "10px 20px",
                background: "#3b5cf6",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

import { useEffect } from "react";
import { startNotificationLoop, stopNotificationLoop } from "@/lib/notifications";
import { startAutoSnapshots, stopAutoSnapshots } from "@/lib/versions";

function NotificationStarter() {
  useEffect(() => {
    startNotificationLoop();
    startAutoSnapshots();
    return () => {
      stopNotificationLoop();
      stopAutoSnapshots();
    };
  }, []);
  return null;
}

const App = () => (
  <ErrorBoundary>
    <div className="contents">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <DashboardProvider>
            <NotificationStarter />
            <DashboardLayout />
          </DashboardProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  </ErrorBoundary>
);

export default App;
