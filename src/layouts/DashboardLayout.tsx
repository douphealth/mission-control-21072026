import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import StatusBar from '@/components/StatusBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { DashboardProvider, useDashboardOptional } from '@/contexts/DashboardContext';
import { useNavigationStore } from '@/stores/navigationStore';

import React, { lazy, Suspense } from 'react';
import RouteErrorBoundary from '@/components/RouteErrorBoundary';

const VoiceCapture = lazy(() => import('@/components/VoiceCapture'));

const DashboardHome = lazy(() => import('@/pages/DashboardHome'));
const TasksPage = lazy(() => import('@/pages/TasksPage'));
const WebsitesPage = lazy(() => import('@/pages/WebsitesPage'));
const WordPressManagementPage = lazy(() => import('@/pages/WordPressManagementPage'));
const GitHubPage = lazy(() => import('@/pages/GitHubPage'));
const BuildsPage = lazy(() => import('@/pages/BuildsPage'));
const LinksPage = lazy(() => import('@/pages/LinksPage'));
const NotesPage = lazy(() => import('@/pages/NotesPage'));
const FocusPage = lazy(() => import('@/pages/FocusPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));
const IdeasPage = lazy(() => import('@/pages/IdeasPage'));
const CredentialsPage = lazy(() => import('@/pages/CredentialsPage'));
const SEOPage = lazy(() => import('@/pages/SEOPage'));
const CloudflarePage = lazy(() => import('@/pages/CloudflarePage'));
const VercelPage = lazy(() => import('@/pages/VercelPage'));
const OpenClawPage = lazy(() => import('@/pages/OpenClawPage'));
const HabitsPage = lazy(() => import('@/pages/HabitsPage'));
const CustomModulePage = lazy(() => import('@/pages/CustomModulePage'));

const sectionMap: Record<string, React.LazyExoticComponent<any>> = {
  dashboard: DashboardHome,
  tasks: TasksPage,
  websites: WebsitesPage,
  'wp-manage': WordPressManagementPage,
  github: GitHubPage,
  builds: BuildsPage,
  links: LinksPage,
  notes: NotesPage,
  focus: FocusPage,
  calendar: CalendarPage,
  projects: ProjectsPage,
  settings: SettingsPage,
  payments: PaymentsPage,
  ideas: IdeasPage,
  credentials: CredentialsPage,
  seo: SEOPage,
  cloudflare: CloudflarePage,
  vercel: VercelPage,
  openclaw: OpenClawPage,
  habits: HabitsPage,
};

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-2">
      <div className="h-8 bg-muted/50 rounded-xl w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/30 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-muted/30 rounded-2xl" />
        <div className="h-64 bg-muted/30 rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const dashboard = useDashboardOptional();

  if (!dashboard) {
    return (
      <DashboardProvider>
        <DashboardLayout />
      </DashboardProvider>
    );
  }

  const { isLoading } = dashboard;
  const { activeSection } = useNavigationStore();
  const isMobile = useIsMobile();
  const Section = activeSection.startsWith('custom-') ? CustomModulePage : (sectionMap[activeSection] || DashboardHome);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl gradient-primary flex items-center justify-center shadow-[var(--shadow-primary)] animate-in zoom-in-75 fade-in duration-400">
            <span className="text-primary-foreground font-bold text-lg">N</span>
          </div>
          <div className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300 delay-200 fill-mode-both">
            Loading Mission Control...
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="enterprise-shell flex h-screen overflow-hidden bg-background">
      {/* Hide sidebar on mobile — use bottom nav instead */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-28 lg:pb-0 overscroll-contain">
          <div className="max-w-[1680px] mx-auto px-3 pb-5 pt-3 sm:p-5 lg:p-7 xl:p-9">
            <RouteErrorBoundary sectionName={activeSection} key={activeSection}>
              <Suspense fallback={<LoadingSkeleton />}>
                <div key={activeSection} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                  <Section sectionId={activeSection} {...({ sectionId: activeSection } as any)} />
                </div>
              </Suspense>
            </RouteErrorBoundary>
          </div>
        </main>
        {!isMobile && <StatusBar />}
      </div>
      {/* Mobile bottom navigation */}
      <MobileBottomNav />
      {/* Voice capture — lazy-loaded floating mic */}
      <Suspense fallback={null}>
        <VoiceCapture />
      </Suspense>
    </div>
  );
}
