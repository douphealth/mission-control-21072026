import { useNavigationStore } from '@/stores/navigationStore';
import { useTasks, useDecisions } from '@/hooks/useTableData';
import {
  Crosshair, Inbox, Plus, Search, Grip, CheckSquare, Calendar, FileText, Globe,
  DollarSign, Timer, Flame, Lightbulb, KeyRound, Settings, Github, Hammer, Link2,
  PanelsTopLeft, RefreshCcw, Scale, Bell, Radar, Newspaper, AtSign, Users, Home,
} from 'lucide-react';
import { useState } from 'react';

const moreItems = [
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'review', label: 'Review', icon: RefreshCcw },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'decisions', label: 'Findings', icon: Scale },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'control-center', label: 'Captures', icon: Radar },
  { id: 'websites', label: 'Sites', icon: Globe },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'payments', label: 'Finance', icon: DollarSign },
  { id: 'industry', label: 'Trends', icon: Newspaper },
  { id: 'mentions', label: 'Mentions', icon: AtSign },
  { id: 'audience', label: 'Audience', icon: Users },
  { id: 'projects', label: 'Projects', icon: PanelsTopLeft },
  { id: 'habits', label: 'Habits', icon: Flame },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'credentials', label: 'Vault', icon: KeyRound },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'builds', label: 'Builds', icon: Hammer },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileBottomNav() {
  const { activeSection, setActiveSection, setImportModalOpen, setCommandPaletteOpen } = useNavigationStore();
  const tasks = useTasks();
  const decisions = useDecisions();
  const [moreOpen, setMoreOpen] = useState(false);

  const inboxCount =
    tasks.filter((t) => t.status === 'todo' && !t.dueDate).length +
    decisions.filter((d) => d.status === 'open').length;

  const go = (id: string) => { setActiveSection(id); setMoreOpen(false); };

  const tabCls = (active: boolean) =>
    `relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition-colors touch-manipulation active:scale-[0.94] ${
      active ? 'text-primary' : 'text-muted-foreground/70'
    }`;

  return (
    <>
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="mobile-sheet-luxe fixed bottom-[80px] left-2 right-2 z-50 max-h-[70vh] overflow-hidden rounded-[26px] lg:hidden animate-slide-up">
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="px-5 pb-2 pt-1">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">All sections</h2>
            </div>
            <div className="overflow-y-auto px-3 pb-5">
              <div className="grid grid-cols-4 gap-2">
                {moreItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl p-2 text-center transition touch-manipulation active:scale-90 ${
                      activeSection === item.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground active:bg-secondary/70'
                    }`}
                  >
                    <item.icon size={19} strokeWidth={1.8} />
                    <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)*0.5+0.5rem)] lg:hidden">
        <div className="mobile-liquid-bar rounded-[24px] px-2 py-1.5">
          <div className="flex items-stretch justify-around gap-1">
            <button onClick={() => go('now')} className={tabCls(activeSection === 'now')}>
              <Crosshair size={20} strokeWidth={activeSection === 'now' ? 2.4 : 1.7} />
              <span className="text-[10px] font-medium leading-none">Today</span>
            </button>

            <button onClick={() => go('control-center')} className={tabCls(activeSection === 'control-center')}>
              <div className="relative">
                <Inbox size={20} strokeWidth={activeSection === 'control-center' ? 2.4 : 1.7} />
                {inboxCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {inboxCount > 99 ? '99+' : inboxCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">Inbox</span>
            </button>

            {/* Central, visually dominant capture */}
            <button
              onClick={() => { setMoreOpen(false); setImportModalOpen(true); }}
              aria-label="Capture"
              className="relative -mt-6 flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_34px_-12px_hsl(var(--primary)/0.85)] transition active:scale-90 touch-manipulation"
            >
              <Plus size={24} strokeWidth={2.4} />
            </button>

            <button
              onClick={() => { setMoreOpen(false); setCommandPaletteOpen(true); }}
              className={tabCls(false)}
            >
              <Search size={20} strokeWidth={1.7} />
              <span className="text-[10px] font-medium leading-none">Search</span>
            </button>

            <button onClick={() => setMoreOpen((o) => !o)} className={tabCls(moreOpen)}>
              <Grip size={20} strokeWidth={moreOpen ? 2.4 : 1.7} />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
