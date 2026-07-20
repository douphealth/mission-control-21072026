import { db } from '@/lib/db';
import { isSupabaseConnected } from '@/lib/supabase';

const ONBOARDING_KEY = 'mc-onboarding-complete';

export interface OnboardingState {
  complete: boolean;
  hasLocalData: boolean;
  cloudConfigured: boolean;
  userName: string;
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const [tasks, websites, settings] = await Promise.all([
    db.tasks.count(),
    db.websites.count(),
    db.settings.get('default'),
  ]);

  return {
    complete: localStorage.getItem(ONBOARDING_KEY) === '1',
    hasLocalData: tasks + websites > 0,
    cloudConfigured: isSupabaseConnected(),
    userName: settings?.userName || 'Alex',
  };
}

export function completeOnboarding(): void {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

export async function initializeEmptyWorkspace(userName = 'Alex'): Promise<void> {
  const settings = await db.settings.get('default');
  if (!settings) {
    await db.settings.put({
      id: 'default',
      userName,
      userRole: 'Mission Control Operator',
      theme: 'dark',
      sidebarCollapsed: false,
      dashboardLayout: [],
    });
  }
  completeOnboarding();
}
