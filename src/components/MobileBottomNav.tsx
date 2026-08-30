import { useNavigationStore } from '@/stores/navigationStore';
import { useTasks } from '@/hooks/useTableData';
import { RefreshCcw, Home, CheckSquare, FileText, Globe, Grip, DollarSign, Calendar, Timer, Lightbulb, KeyRound, Settings, Search, Flame, Github, Hammer, Link2, PanelsTopLeft } from 'lucide-react';
import { useState } from 'react';

const primaryTabs = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'review', label: 'Review', icon: RefreshCcw },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'more', label: 'More', icon: Grip },
];

const moreItems = [
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'websites', label: 'Sites', icon: Globe },
  { id: 'habits', label: 'Habits', icon: Flame },
  { id: 'payments', label: 'Payments', icon: DollarSign },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'credentials', label: 'Vault', icon: KeyRound },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'builds', label: 'Builds', icon: Hammer },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'projects', label: 'Kanban', icon: PanelsTopLeft },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileBottomNav() {
  const { activeSection, setActiveSection } = useNavigationStore();
  const tasks = useTasks();
  const [moreOpen, setMoreOpen] = useState(false);

  const openTasks = tasks.filter(t => t.status !== 'done').length;

  const handleTab = (id: string) => {
    if (id === 'more') {
      setMoreOpen(o => !o);
    } else {
      setActiveSection(id);
      setMoreOpen(false);
    }
  };

  return (
    <>
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-lg lg:hidden animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="mobile-sheet-luxe fixed bottom-[82px] left-2 right-2 z-50 max-h-[72vh] overflow-hidden rounded-[30px] lg:hidden animate-slide-up"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1.5 w-12 rounded-full bg-muted-foreground/18 shadow-inner" />
            </div>
            <div className="flex items-end justify-between px-5 pb-3">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Mission Control</span>
                <h2 className="mt-1 text-lg font-extrabold tracking-tight text-foreground">All sections</h2>
              </div>
              <span className="rounded-full border border-border/50 bg-secondary/55 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">{moreItems.length}</span>
            </div>
            <div className="overflow-y-auto px-3 pb-5">
              <div className="grid grid-cols-3 gap-2.5 min-[390px]:grid-cols-4">
                {moreItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTab(item.id)}
                    className={`relative flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-3xl p-3 transition-all touch-manipulation active:scale-90
                      ${activeSection === item.id
                        ? 'bg-primary/12 text-primary ring-1 ring-primary/28 shadow-[0_14px_34px_-24px_hsl(var(--primary)/0.85)]'
                        : 'bg-secondary/38 text-muted-foreground ring-1 ring-border/30 active:bg-secondary/85'}`}
                  >
                    {activeSection === item.id && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-primary" />}
                    <item.icon size={20} strokeWidth={activeSection === item.id ? 2.4 : 1.8} />
                    <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)*0.5+0.5rem)] lg:hidden">
        <div className="mobile-liquid-bar rounded-[26px] px-1.5 py-1.5">
          <div className="flex h-[60px] items-stretch justify-around gap-1">
            {primaryTabs.map(tab => {
              const isActive = tab.id === 'more' ? moreOpen : activeSection === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[20px] transition-all duration-200 touch-manipulation active:scale-[0.9]
                    ${isActive ? 'text-primary' : 'text-muted-foreground/65'}`}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-[20px] bg-primary/12 ring-1 ring-primary/20 shadow-[0_10px_28px_-18px_hsl(var(--primary)/0.9)]" />
                  )}
                  <div className="relative">
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.7} />
                    {tab.id === 'tasks' && openTasks > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1 ring-2 ring-background/70">
                        {openTasks > 99 ? '99+' : openTasks}
                      </span>
                    )}
                  </div>
                  <span className={`relative text-[10px] font-semibold leading-none tracking-tight ${isActive ? 'text-primary' : ''}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

    </>
  );
}
