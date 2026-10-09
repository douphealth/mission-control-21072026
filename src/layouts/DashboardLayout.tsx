import CrossDeviceSyncBar from "@/components/CrossDeviceSyncBar";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import StatusBar from "@/components/StatusBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import DailyBriefingBanner from "@/components/DailyBriefingBanner";
import WorkspacePulseBar from "@/components/WorkspacePulseBar";

import { useIsMobile } from "@/hooks/use-mobile";
import { DashboardProvider, useDashboardOptional } from "@/contexts/DashboardContext";
import { useNavigationStore } from "@/stores/navigationStore";
import { useSettingsStore } from "@/stores/settingsStore";

import React, { Suspense, useEffect } from "react";
import { useA11yStore } from "@/stores/a11yStore";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import GoogleTasksPage from "@/pages/GoogleTasksPage";
import SnapCapture from "@/components/SnapCapture";

const VoiceCapture = lazy(() => import("@/components/VoiceCapture"));

const DashboardHome = lazy(() => import("@/pages/DashboardHome"));
const TasksPage = lazy(() => import("@/pages/TasksPage"));
const WebsitesPage = lazy(() => import("@/pages/WebsitesPage"));
const WordPressManagementPage = lazy(() => import("@/pages/WordPressManagementPage"));
const GitHubPage = lazy(() => import("@/pages/GitHubPage"));
const BuildsPage = lazy(() => import("@/pages/BuildsPage"));
const AppsFunnelsPage = lazy(() => import("@/pages/AppsFunnelsPage"));
const LinksPage = lazy(() => import("@/pages/LinksPage"));
const NotesPage = lazy(() => import("@/pages/NotesPage"));
const FocusPage = lazy(() => import("@/pages/FocusPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const PaymentsPage = lazy(() => import("@/pages/PaymentsPage"));
const IdeasPage = lazy(() => import("@/pages/IdeasPage"));
const CredentialsPage = lazy(() => import("@/pages/CredentialsPage"));
const SEOPage = lazy(() => import("@/pages/SEOPage"));
const CloudflarePage = lazy(() => import("@/pages/CloudflarePage"));
const VercelPage = lazy(() => import("@/pages/VercelPage"));
const HabitsPage = lazy(() => import("@/pages/HabitsPage"));
const ReviewPage = lazy(() => import("@/pages/ReviewPage"));
const NowTodayPage = lazy(() => import("@/pages/NowTodayPage"));
const DecisionsPage = lazy(() => import("@/pages/DecisionsPage"));
const ControlCenterPage = lazy(() => import("@/pages/ControlCenterPage"));
const IndustryPage = lazy(() => import("@/pages/IndustryPage"));
const MentionsPage = lazy(() => import("@/pages/MentionsPage"));
const AudiencePage = lazy(() => import("@/pages/AudiencePage"));
const RemindersPage = lazy(() => import("@/pages/RemindersPage"));
const CustomModulePage = lazy(() => import("@/pages/CustomModulePage"));
const DemoPage = lazy(() => import("@/pages/DemoPage"));

const sectionMap: Record<string, React.ComponentType<any> | React.LazyExoticComponent<any>> = {
  dashboard: DashboardHome,
  now: NowTodayPage,
  decisions: DecisionsPage,
  tasks: TasksPage,
  "google-tasks": GoogleTasksPage,
  websites: WebsitesPage,
  "wp-manage": WordPressManagementPage,
  github: GitHubPage,
  builds: BuildsPage,
  "apps-funnels": AppsFunnelsPage,
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
  habits: HabitsPage,
  review: ReviewPage,
  "control-center": ControlCenterPage,
  industry: IndustryPage,
  mentions: MentionsPage,
  audience: AudiencePage,
  reminders: RemindersPage,
  demo: DemoPage,
};

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-2">
      <div className="h-8 rounded-xl bg-muted/50 w-48" />
      <div className="v10-skeleton h-24" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="v10-skeleton h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="v10-skeleton h-64" />
        <div className="v10-skeleton h-64" />
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const dashboard = useDashboardOptional();
  const applyA11y = useA11yStore((s) => s.apply);
  // Hooks must run before any early return so their order is identical on
  // every render (react-hooks/rules-of-hooks).
  const { activeSection } = useNavigationStore();
  const floatingCaptureDockVisible = useSettingsStore((state) => state.floatingCaptureDockVisible);
  const isMobile = useIsMobile();
  useEffect(() => {
    applyA11y();
  }, [applyA11y]);

  if (!dashboard) {
    return (
      <DashboardProvider>
        <DashboardLayout />
      </DashboardProvider>
    );
  }

  const { isLoading } = dashboard;
  const Section = activeSection.startsWith("custom-")
    ? CustomModulePage
    : sectionMap[activeSection] || DashboardHome;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="mx-auto h-14 w-14 overflow-hidden rounded-2xl shadow-[var(--shadow-primary)] animate-in zoom-in-75 fade-in duration-400">
            <img src="/mission-control-mark.svg" alt="" className="h-full w-full" />
          </div>
          <div className="text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300 delay-200 fill-mode-both">
            Loading Mission Control...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enterprise-shell mc13-shell relative flex h-dvh min-h-0 overflow-hidden bg-background">
      <div className="v10-aurora-bg" aria-hidden />
      <a href="#main-content" className="a11y-skip-link">
        Skip to content
      </a>
      {/* Hide sidebar on mobile — use bottom nav instead */}
      <div className="mc13-sidebar-wrap relative z-[1] hidden lg:block">
        <Sidebar />
      </div>
      <div className="mc13-main-wrap relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <CrossDeviceSyncBar />
        <main
          id="main-content"
          tabIndex={-1}
          className="mc13-main mobile-content-pad flex-1 overflow-y-auto lg:pb-0 overscroll-contain"
        >
          <div className="mc13-page max-w-[1680px] mx-auto px-3 pb-5 pt-3 sm:p-5 lg:p-7 xl:p-9">
            {(activeSection === "tasks" ||
              activeSection === "focus" ||
              activeSection === "review") && <DailyBriefingBanner />}

            {activeSection !== "dashboard" && <WorkspacePulseBar />}

            <RouteErrorBoundary sectionName={activeSection} key={activeSection}>
              <Suspense fallback={<LoadingSkeleton />}>
                <div
                  key={activeSection}
                  className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
                >
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
      {/* Instant photo/file/voice capture → AI import. User can hide this dock in Settings. */}
      {floatingCaptureDockVisible && <SnapCapture />}
      {/* Voice capture — lazy-loaded floating mic */}
      <Suspense fallback={null}>
        <VoiceCapture />
      </Suspense>
    </div>
  );
}
