import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardProvider } from '@/contexts/DashboardContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import React, { useEffect } from 'react';
import { showFatalError } from '@/lib/fatalError';
import { startNotificationLoop, stopNotificationLoop } from '@/lib/notifications';
import { startAutoSnapshots, stopAutoSnapshots } from '@/lib/versions';

// Keep errors visible without treating their messages or stacks as executable HTML.
if (typeof window !== 'undefined') {
  window.addEventListener('error', event => {
    console.error('Fatal client error:', event.error ?? event.message);
    showFatalError(event.message, event.error?.stack);
  });
  window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    showFatalError(event.reason?.message ?? String(event.reason ?? 'Unknown error'), event.reason?.stack);
  });
}
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('Mission Control Error:', error, info); }
  render() {
    const error = this.state.error;
    if (!error) return this.props.children;
    return (
      <main role="alert" style={{ minHeight: '100vh', display:'grid', placeItems:'center', padding:24, background:'#0d0f14', color:'#f8fafc', fontFamily:'system-ui' }}>
        <section style={{ maxWidth:640, padding:28, border:'1px solid #ef4444', borderRadius:16, background:'#1a1d27' }}>
          <h1 style={{ fontSize:24, fontWeight:800 }}>Mission Control hit an error</h1>
          <p style={{ color:'#fda4af', overflowWrap:'anywhere' }}>{error.message}</p>
          <pre style={{ whiteSpace:'pre-wrap', overflowWrap:'anywhere', maxHeight:220, overflow:'auto', fontSize:11 }}>{error.stack}</pre>
          <p>Do not clear browser data to recover. Saved local records are preserved.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight:44, padding:'10px 18px', border:0, borderRadius:10, background:'#3b5cf6', color:'white', cursor:'pointer' }}>Reload app</button>
        </section>
      </main>
    );
  }
}
const queryClient = new QueryClient({ defaultOptions: { queries: { retry:false } } });
function NotificationStarter() {
  useEffect(() => {
    startNotificationLoop(); startAutoSnapshots();
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
            <NotificationStarter />
            <DashboardLayout />
          </DashboardProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  </ErrorBoundary>
);
export default App;
