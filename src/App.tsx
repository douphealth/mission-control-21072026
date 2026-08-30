import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardProvider } from "@/contexts/DashboardContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import React, { useEffect } from "react";

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Mission Control Error:", error, info);
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ minHeight: "100vh", background: "#0d0f14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", padding: 24 }}>
          <div style={{ maxWidth: 640, background: "#1a1d27", border: "1px solid #ef4444", borderRadius: 16, padding: 32, color: "#f8fafc" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>Mission Control crashed</div>
            <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{err.message}</div>
            <pre style={{ background: "#0d0f14", padding: 16, borderRadius: 8, overflow: "auto", fontSize: 11, color: "#94a3b8", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 300 }}>
              {err.stack}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{ marginTop: 20, padding: "10px 20px", background: "#3b5cf6", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
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

import { startNotificationLoop, stopNotificationLoop } from "@/lib/notifications";
import { startAutoSnapshots, stopAutoSnapshots } from "@/lib/versions";
import { bridgeLegacyIntoOS } from "@/lib/osLegacyBridge";

function RuntimeStarter() {
  useEffect(() => {
    startNotificationLoop();
    startAutoSnapshots();

    // Additive migration only: legacy tables remain intact. The OS layer is a
    // canonical graph used by new workflows and can be rolled back independently.
    bridgeLegacyIntoOS()
      .then((result) => {
        const changed = result.projects + result.entities + result.workItems;
        if (changed) console.info("Mission Control OS bridge completed", result);
      })
      .catch((error) => console.warn("Mission Control OS bridge deferred:", error));

    return () => { stopNotificationLoop(); stopAutoSnapshots(); };
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
            <RuntimeStarter />
            <DashboardLayout />
          </DashboardProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  </ErrorBoundary>
);

export default App;
