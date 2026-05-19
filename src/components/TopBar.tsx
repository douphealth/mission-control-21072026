import { useTasks, useExportAllData } from '@/hooks/useTableData';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Search, Bell, Plus, Menu, Download, Mail, History } from 'lucide-react';
import { forwardRef, lazy, Suspense, useState, useEffect } from 'react';

const CommandPalette = lazy(() => import('./CommandPalette'));
const BulkImportModal = lazy(() => import('./BulkImportModal'));
const VersionsModal = lazy(() => import('./VersionsModal'));

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function DeferredOverlayFallback() {
  return null;
}

const quickAddItems = [
  { id: 'websites', label: 'Website', emoji: '🌐' },
  { id: 'tasks', label: 'Task', emoji: '✅' },
  { id: 'github', label: 'GitHub Repo', emoji: '🐙' },
  { id: 'builds', label: 'Build Project', emoji: '🛠️' },
  { id: 'links', label: 'Link', emoji: '🔗' },
  { id: 'notes', label: 'Note', emoji: '📝' },
  { id: 'projects', label: 'Kanban Card', emoji: '📋' },
  { id: 'payments', label: 'Payment', emoji: '💰' },
  { id: 'ideas', label: 'Idea', emoji: '💡' },
  { id: 'credentials', label: 'Credential', emoji: '🔐' },
];

const TopBar = forwardRef<HTMLElement>(function TopBar(_props, ref) {
  const tasks = useTasks();
  const exportAllData = useExportAllData();
  const { userName } = useSettingsStore();
  const { setSidebarOpen, setActiveSection, commandPaletteOpen, setCommandPaletteOpen, importModalOpen, setImportModalOpen } = useNavigationStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < today);
  const dueTodayTasks = tasks.filter(t => t.status !== 'done' && t.dueDate === today);
  const overdueCount = overdueTasks.length;
  const dueTodayCount = dueTodayTasks.length;
  const notifCount = overdueCount + dueTodayCount;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); setQuickAddOpen(true); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen]);

  useEffect(() => {
    if (!quickAddOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setQuickAddOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [quickAddOpen]);

  const handleQuickAdd = (sectionId: string) => {
    setActiveSection(sectionId);
    setQuickAddOpen(false);
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mission-control-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <>
      <header ref={ref} className="mobile-top-glass sm:enterprise-panel sticky top-0 z-30 px-3 sm:px-6 lg:px-8 h-[62px] sm:h-[72px] flex items-center gap-2 sm:gap-3 border-x-0 border-t-0 rounded-none shadow-none">
        {/* Mobile menu */}
        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground p-2 -ml-1 rounded-2xl active:scale-90 active:bg-secondary/70 transition-all touch-manipulation">
          <Menu size={18} />
        </button>

        {/* Search — Dribbble style with shortcut indicator */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          }
          className="flex items-center gap-2 sm:gap-2.5 flex-1 max-w-xl h-10 sm:h-11 px-3 sm:px-4 rounded-2xl bg-card/62 border border-border/50 hover:border-primary/35 hover:bg-card/80 hover:shadow-[var(--shadow-glow)] transition-all duration-300 cursor-pointer group touch-manipulation"
        >
          <Search size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm text-muted-foreground/40 flex-1 text-left truncate">Search...</span>
          <div className="hidden md:flex items-center gap-1">
            <kbd className="text-[10px] text-muted-foreground/30 bg-card px-2 py-1 rounded-lg font-mono border border-border/30 shadow-sm">⌘ F</kbd>
          </div>
        </button>

        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
          {/* Action buttons — hidden on mobile for cleaner bar */}
          <button
            onClick={() => setImportModalOpen(true)}
            }
            className="hidden sm:flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 rounded-xl sm:rounded-2xl text-muted-foreground/55 hover:text-foreground hover:bg-secondary/75 hover:shadow-sm transition-all touch-manipulation"
            title="Import"
          >
            <Mail size={16} />
          </button>

          <button
            onClick={() => setVersionsOpen(true)}
            }
            className="flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 rounded-xl sm:rounded-2xl text-muted-foreground/55 hover:text-foreground hover:bg-secondary/75 hover:shadow-sm transition-all touch-manipulation"
            title="Versions — save & restore"
          >
            <History size={16} />
          </button>

          <button
            onClick={handleExport}
            }
            className="hidden sm:flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 rounded-xl sm:rounded-2xl text-muted-foreground/55 hover:text-foreground hover:bg-secondary/75 hover:shadow-sm transition-all touch-manipulation"
            title="Export"
          >
            <Download size={16} />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(o => !o)}
              }
              className="relative flex items-center justify-center w-10 h-10 rounded-2xl text-muted-foreground/60 hover:text-foreground hover:bg-secondary/75 hover:shadow-sm transition-all touch-manipulation"
              title="Notifications"
            >
              <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
              {notifCount > 0 && (
                <span
                  }
                  }
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center shadow-md"
                >
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

                          {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div
                    }
                    }
                    }
                    }
                    className="absolute right-0 top-full mt-3 z-50 w-80 max-h-[70vh] overflow-y-auto mobile-sheet-luxe rounded-[24px] p-2"
                  >
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Notifications</span>
                      <span className="text-[10px] text-muted-foreground/50">{notifCount} pending</span>
                    </div>
                    {notifCount === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground/60">
                        🎉 You're all caught up!
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {overdueCount > 0 && (
                          <div className="px-4 py-1.5 text-[10px] font-semibold text-destructive uppercase tracking-wider">Overdue ({overdueCount})</div>
                        )}
                        {overdueTasks.slice(0, 8).map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setNotifOpen(false); setActiveSection('tasks'); }}
                            className="w-full flex items-start gap-3 px-4 py-2.5 rounded-2xl text-left hover:bg-secondary/60 transition-all"
                          >
                            <span className="text-base">⚠️</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-foreground truncate">{t.title}</div>
                              <div className="text-[10px] text-destructive">Due {t.dueDate}</div>
                            </div>
                          </button>
                        ))}
                        {dueTodayCount > 0 && (
                          <div className="px-4 py-1.5 mt-2 text-[10px] font-semibold text-primary uppercase tracking-wider">Due Today ({dueTodayCount})</div>
                        )}
                        {dueTodayTasks.slice(0, 8).map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setNotifOpen(false); setActiveSection('tasks'); }}
                            className="w-full flex items-start gap-3 px-4 py-2.5 rounded-2xl text-left hover:bg-secondary/60 transition-all"
                          >
                            <span className="text-base">📌</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-foreground truncate">{t.title}</div>
                              <div className="text-[10px] text-muted-foreground">Due today</div>
                            </div>
                          </button>
                        ))}
                        <div className="border-t border-border/20 mt-1 pt-1">
                          <button
                            onClick={() => { setNotifOpen(false); setActiveSection('tasks'); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-medium text-primary hover:bg-secondary/60 transition-all"
                          >
                            View all tasks →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
          </div>

          <div className="h-8 w-px bg-border/30 mx-1 hidden sm:block" />

          {/* User avatar — larger, with details */}
          <div className="hidden sm:flex items-center gap-3 pl-2">
            <div
              }
              className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-[13px] font-bold text-primary-foreground shadow-[var(--shadow-primary)] cursor-pointer"
            >
              {userName.charAt(0)}
            </div>
            <div className="hidden lg:block min-w-0 mr-2">
              <div className="text-sm font-semibold text-foreground truncate">{userName}</div>
              <div className="text-[10px] text-muted-foreground/50 truncate">{userName.toLowerCase().replace(/\s/g, '')}@email.com</div>
            </div>
          </div>

          {/* Quick Add — floating action button */}
          <div className="relative">
            <button
              onClick={() => setQuickAddOpen(!quickAddOpen)}
              }
              className="w-10 h-10 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-primary)] hover:shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.5)] transition-shadow touch-manipulation"
            >
              <Plus size={16} className={`transition-transform duration-200 ${quickAddOpen ? 'rotate-45' : ''}`} />
            </button>

                          {quickAddOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-foreground/10 sm:bg-transparent" onClick={() => setQuickAddOpen(false)} />
                  <div
                    }
                    }
                    }
                    }
                    className="fixed sm:absolute inset-x-3 sm:inset-x-auto bottom-[92px] sm:bottom-auto sm:right-0 sm:top-full sm:mt-3 z-50 sm:w-60 mobile-sheet-luxe rounded-[28px] p-2 overflow-hidden"
                  >
                    <div className="px-4 py-2.5 text-[10px] font-semibold text-muted-foreground/35 uppercase tracking-widest">Quick Add</div>
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-0.5">
                      {quickAddItems.map((item, i) => (
                        <button
                          key={item.id}
                          onClick={() => handleQuickAdd(item.id)}
                          }
                          }
                          }
                          className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 rounded-2xl text-[13px] text-foreground hover:bg-secondary/60 active:bg-secondary transition-all touch-manipulation"
                        >
                          <span className="text-base sm:text-sm">{item.emoji}</span>
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-border/20 mt-1 pt-1">
                      <button
                        onClick={() => { setQuickAddOpen(false); setImportModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 rounded-2xl text-[13px] text-foreground hover:bg-secondary/60 active:bg-secondary transition-all touch-manipulation"
                      >
                        <span className="text-base sm:text-sm">📥</span>
                        <span className="font-medium">Bulk Import</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
          </div>
        </div>
      </header>

      <Suspense fallback={<DeferredOverlayFallback />}>
        {commandPaletteOpen && (
          <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onImport={() => setImportModalOpen(true)} />
        )}
        {importModalOpen && <BulkImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />}
        {versionsOpen && <VersionsModal open={versionsOpen} onClose={() => setVersionsOpen(false)} />}
      </Suspense>
    </>
  );
});

export default TopBar;
