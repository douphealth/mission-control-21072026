import { useNavigationStore } from '@/stores/navigationStore';
import { useTasks } from '@/hooks/useTableData';
import { Home, CheckSquare, FileText, Globe, Grip, DollarSign, Calendar, Timer, Lightbulb, KeyRound, Settings, Search, Flame, Github, Hammer, Link2, PanelsTopLeft } from 'lucide-react';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';

const primaryTabs = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'websites', label: 'Sites', icon: Globe },
  { id: 'more', label: 'More', icon: Grip },
];

const moreItems = [
  { id: 'calendar', label: 'Calendar', icon: Calendar, emoji: '📅' },
  { id: 'habits', label: 'Habits', icon: Flame, emoji: '🔥' },
  { id: 'payments', label: 'Payments', icon: DollarSign, emoji: '💰' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, emoji: '💡' },
  { id: 'focus', label: 'Focus', icon: Timer, emoji: '⏱️' },
  { id: 'credentials', label: 'Vault', icon: KeyRound, emoji: '🔐' },
  { id: 'github', label: 'GitHub', icon: Github, emoji: '🐙' },
  { id: 'builds', label: 'Builds', icon: Hammer, emoji: '🛠️' },
  { id: 'links', label: 'Links', icon: Link2, emoji: '🔗' },
  { id: 'projects', label: 'Kanban', icon: PanelsTopLeft, emoji: '📋' },
  { id: 'seo', label: 'SEO', icon: Search, emoji: '🔍' },
  { id: 'settings', label: 'Settings', icon: Settings, emoji: '⚙️' },
];

export default function MobileBottomNav() {
  const { activeSection, setActiveSection } = useNavigationStore();
  const tasks = useTasks();
  const [moreOpen, setMoreOpen] = useState(false);
  const dragY = useMotionValue(0);
  const sheetOpacity = useTransform(dragY, [0, 200], [1, 0]);

  const openTasks = tasks.filter(t => t.status !== 'done').length;

  const handleTab = (id: string) => {
    if (id === 'more') {
      setMoreOpen(!moreOpen);
    } else {
      setActiveSection(id);
      setMoreOpen(false);
    }
  };

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.velocity.y > 300 || info.offset.y > 120) {
      setMoreOpen(false);
    }
  }, []);

  return (
    <>
      {/* Bottom sheet overlay & content */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-lg lg:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={handleDragEnd}
              style={{ y: dragY, opacity: sheetOpacity }}
              className="mobile-sheet-luxe fixed bottom-[82px] left-2 right-2 z-50 max-h-[72vh] overflow-hidden rounded-[30px] lg:hidden"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/18 shadow-inner" />
              </div>

              {/* Section title */}
              <div className="flex items-end justify-between px-5 pb-3">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Mission Control</span>
                  <h2 className="mt-1 text-lg font-extrabold tracking-tight text-foreground">All sections</h2>
                </div>
                <span className="rounded-full border border-border/50 bg-secondary/55 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">{moreItems.length}</span>
              </div>

              {/* Grid of items */}
              <div className="overflow-y-auto px-3 pb-5">
                <div className="grid grid-cols-3 gap-2.5 min-[390px]:grid-cols-4">
                  {moreItems.map((item, i) => (
                    <motion.button
                      key={item.id}
                      onClick={() => handleTab(item.id)}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.025, duration: 0.2 }}
                      whileTap={{ scale: 0.88 }}
                      className={`relative flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-3xl p-3 transition-all touch-manipulation
                        ${activeSection === item.id
                          ? 'bg-primary/12 text-primary ring-1 ring-primary/28 shadow-[0_14px_34px_-24px_hsl(var(--primary)/0.85)]'
                          : 'bg-secondary/38 text-muted-foreground ring-1 ring-border/30 active:bg-secondary/85'}`}
                    >
                      {activeSection === item.id && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-primary" />}
                      <item.icon size={20} strokeWidth={activeSection === item.id ? 2.4 : 1.8} />
                      <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-2 pb-2 lg:hidden">
        <div className="mobile-liquid-bar rounded-[28px] px-1.5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1.5">
          <div className="flex h-[66px] items-center justify-around gap-1">
            {primaryTabs.map(tab => {
              const isActive = tab.id === 'more' ? moreOpen : activeSection === tab.id;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTab(tab.id)}
                  whileTap={{ scale: 0.82 }}
                  className={`relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-3xl transition-all duration-200 touch-manipulation
                    ${isActive ? 'text-primary' : 'text-muted-foreground/60'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="bottomTabPill"
                      className="absolute inset-y-1.5 inset-x-0 rounded-3xl bg-primary/10 ring-1 ring-primary/14"
                      transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                    />
                  )}
                  <div className="relative">
                    <motion.div
                      animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon size={21} strokeWidth={isActive ? 2.55 : 1.65} />
                    </motion.div>
                    {tab.id === 'tasks' && openTasks > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
                        {openTasks > 9 ? '9+' : openTasks}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-primary' : ''}`}>
                    {tab.label}
                  </span>
                  {isActive && tab.id !== 'more' && (
                    <motion.div
                      layoutId="bottomTabIndicator"
                      className="absolute top-1 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-primary shadow-[0_4px_16px_hsl(var(--primary)/0.5)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
