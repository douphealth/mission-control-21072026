import { useTasks, usePayments, useIdeas, useCustomModules, useAddItem, genId } from '@/hooks/useTableData';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState } from 'react';
import {
  Home, CheckSquare, Calendar, FileText, Timer,
  Globe, Github, Hammer, Link2, BarChart3,
  Search as SearchIcon, Cloud, Rocket, Bug,
  Settings, Sun, Moon, X, Sparkles,
  DollarSign, Lightbulb, KeyRound, Flame,
  ChevronLeft, ChevronRight, Plus, Check, Download, Zap
} from 'lucide-react';
import { toast } from 'sonner';

const navGroups = [
  {
    label: 'MENU',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'tasks', label: 'Tasks', icon: CheckSquare },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'notes', label: 'Notes', icon: FileText },
      { id: 'habits', label: 'Habit Tracker', icon: Flame },
      { id: 'focus', label: 'Focus Timer', icon: Timer },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { id: 'websites', label: 'My Websites', icon: Globe },
      { id: 'wp-manage', label: 'WP Management', icon: Zap, indent: true },
      { id: 'github', label: 'GitHub', icon: Github },
      { id: 'builds', label: 'Build Projects', icon: Hammer },
      { id: 'links', label: 'Links Hub', icon: Link2 },
      { id: 'projects', label: 'Kanban Board', icon: BarChart3 },
    ],
  },
  {
    label: 'BUSINESS',
    items: [
      { id: 'payments', label: 'Payments', icon: DollarSign },
      { id: 'ideas', label: 'Ideas', icon: Lightbulb },
      { id: 'credentials', label: 'Credentials', icon: KeyRound },
    ],
  },
  {
    label: 'PLATFORMS',
    items: [
      { id: 'seo', label: 'SEO Center', icon: SearchIcon },
      { id: 'cloudflare', label: 'Cloudflare', icon: Cloud },
      { id: 'vercel', label: 'Vercel', icon: Rocket },
      { id: 'openclaw', label: 'OpenClaw', icon: Bug },
    ],
  },
  {
    label: 'GENERAL',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const tasks = useTasks();
  const payments = usePayments();
  const ideas = useIdeas();
  const customModules = useCustomModules();
  const addItem = useAddItem();
  const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useNavigationStore();
  const { userName, userRole, theme, toggleTheme } = useSettingsStore();
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newModName, setNewModName] = useState('');
  const [newModEmoji, setNewModEmoji] = useState('📁');

  const openTaskCount = tasks.filter(t => t.status !== 'done').length;
  const overduePayments = payments.filter(p => p.status === 'overdue').length;
  const activeIdeas = ideas.filter(i => i.status === 'exploring' || i.status === 'validated').length;

  const getBadge = (id: string): number | null => {
    if (id === 'tasks') return openTaskCount || null;
    if (id === 'payments' && overduePayments > 0) return overduePayments;
    if (id === 'ideas' && activeIdeas > 0) return activeIdeas;
    return null;
  };

  const isCollapsed = sidebarCollapsed;

  const handleAddModule = async (groupLabel: string) => {
    if (!newModName.trim()) return;
    const newId = await addItem('customModules', {
      name: newModName.trim(),
      icon: newModEmoji,
      description: '',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'url', label: 'URL', type: 'url' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
      data: [],
      createdAt: new Date().toISOString(),
      order: customModules.length,
      visible: true,
      color: '',
    });
    if (newId) toast.success(`"${newModName}" added!`);
    else toast.error(`"${newModName}" already exists`);
    setNewModName('');
    setNewModEmoji('📁');
    setAddingTo(null);
  };

  const emojiOptions = ['📁', '📊', '🎯', '🏷️', '📱', '🖥️', '🎨', '📐', '🔧', '⚙️', '🌟', '💎', '🏠', '📈', '🛒', '📡', '🔬', '🎮', '🎵', '📚'];

  return (
    <>
              {sidebarOpen && (
          <div
            } } }
            className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full flex flex-col bg-sidebar/95 text-sidebar-foreground backdrop-blur-2xl border-r border-sidebar-border/70 shadow-[18px_0_60px_-44px_hsl(var(--foreground)/0.7)]
          lg:relative lg:translate-x-0 transition-all duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: isCollapsed ? 72 : 260 }}
      >
        {/* Close (mobile) */}
        <button onClick={() => setSidebarOpen(false)} className="absolute top-5 right-5 lg:hidden text-muted-foreground hover:text-foreground transition-colors touch-manipulation">
          <X size={18} />
        </button>

        {/* Logo / Brand */}
        <div className={`h-[72px] flex items-center border-b border-sidebar-border/70 ${isCollapsed ? 'justify-center px-3' : 'px-5 gap-3'}`}>
          <div
            }
            }
             className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-extrabold text-base flex-shrink-0 ring-1 ring-sidebar-primary/30"
            style={{ boxShadow: 'var(--shadow-primary)' }}
          >
            N
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="font-bold text-[15px] text-sidebar-foreground tracking-tight">Nexus</div>
              <div className="text-[10px] text-sidebar-foreground/45 font-medium">Mission Control</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 w-7 h-7 items-center justify-center rounded-full bg-sidebar border border-sidebar-border shadow-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:scale-110 transition-all"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5">
          {navGroups.map(group => (
            <div key={group.label}>
              {!isCollapsed && (
                <div className="flex items-center justify-between px-3 mb-1.5">
                    <span className="text-[9px] font-bold tracking-[0.15em] text-sidebar-foreground/35 uppercase">
                    {group.label}
                  </span>
                  {group.label !== 'GENERAL' && group.label !== 'SYSTEM' && (
                    <button
                      onClick={() => setAddingTo(addingTo === group.label ? null : group.label)}
                      className="p-0.5 rounded text-sidebar-foreground/25 hover:text-sidebar-primary transition-all hover:scale-110"
                      title={`Add to ${group.label}`}
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = activeSection === item.id;
                  const badge = getBadge(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                      }
                      className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all duration-200 group relative
                        ${isCollapsed ? 'justify-center px-0 rounded-xl' : 'rounded-xl'}
                        ${(item as any).indent && !isCollapsed ? 'ml-5 border-l border-sidebar-border/40 pl-4' : ''}
                        ${active
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg ring-1 ring-sidebar-primary/35'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground'
                        }`}
                      style={active ? { boxShadow: '0 12px 30px -18px hsl(var(--sidebar-primary) / 0.9)' } : undefined}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <item.icon size={16} strokeWidth={active ? 2.2 : 1.5} className="flex-shrink-0" />
                      {!isCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                      {badge !== null && !isCollapsed && (
                        <span className={`text-[10px] font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full ${active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                          {badge}
                        </span>
                      )}
                      {badge !== null && isCollapsed && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">{badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Inline Add Form */}
                              {addingTo === group.label && !isCollapsed && (
                  <div } } } className="overflow-hidden">
                    <div className="mt-2 mx-1 p-3 rounded-xl bg-secondary/30 border border-border/20 space-y-2">
                      <div className="flex gap-1.5">
                        <select value={newModEmoji} onChange={e => setNewModEmoji(e.target.value)}
                          className="w-9 h-9 rounded-lg bg-secondary text-center text-sm appearance-none cursor-pointer outline-none border border-transparent focus:border-primary/30">
                          {emojiOptions.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <input value={newModName} onChange={e => setNewModName(e.target.value)} placeholder="Module name..." autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleAddModule(group.label); if (e.key === 'Escape') setAddingTo(null); }}
                          className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs outline-none border border-transparent focus:border-primary/30 placeholder:text-muted-foreground/40" />
                        <button onClick={() => handleAddModule(group.label)} disabled={!newModName.trim()}
                          className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30">
                          <Check size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          ))}

          {/* Custom Modules */}
          {customModules.filter(m => m.visible).length > 0 && (
            <div>
              {!isCollapsed && (
                <div className="flex items-center justify-between px-3 mb-1.5">
                  <span className="text-[9px] font-bold tracking-[0.15em] text-sidebar-foreground/35 uppercase">CUSTOM</span>
                </div>
              )}
              <div className="space-y-0.5">
                {customModules.filter(m => m.visible).sort((a, b) => a.order - b.order).map(mod => (
                  <button key={mod.id}
                    onClick={() => { setActiveSection(`custom-${mod.id}`); setSidebarOpen(false); }}
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all duration-200
                      ${isCollapsed ? 'justify-center px-0 rounded-xl' : 'rounded-xl'}
                      ${activeSection === `custom-${mod.id}` ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg ring-1 ring-sidebar-primary/35' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground'}`}
                    style={activeSection === `custom-${mod.id}` ? { boxShadow: '0 12px 30px -18px hsl(var(--sidebar-primary) / 0.9)' } : undefined}
                    title={isCollapsed ? mod.name : undefined}>
                    <span className="text-sm">{mod.icon}</span>
                    {!isCollapsed && <span className="flex-1 text-left truncate">{mod.name}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add custom module */}
          {customModules.filter(m => m.visible).length === 0 && !isCollapsed && (
            <div>
              {addingTo !== 'NEW_CUSTOM' ? (
                <button onClick={() => setAddingTo('NEW_CUSTOM')}
                  }
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-sidebar-foreground/35 hover:text-sidebar-primary hover:bg-sidebar-accent/60 transition-all border border-dashed border-sidebar-border/70 hover:border-sidebar-primary/30">
                  <Plus size={15} />
                  <span>Add Custom Module</span>
                </button>
              ) : (
                <div } } } className="overflow-hidden">
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/20 space-y-2">
                    <div className="flex gap-1.5">
                      <select value={newModEmoji} onChange={e => setNewModEmoji(e.target.value)}
                        className="w-9 h-9 rounded-lg bg-secondary text-center text-sm appearance-none cursor-pointer outline-none">
                        {emojiOptions.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <input value={newModName} onChange={e => setNewModName(e.target.value)} placeholder="Module name..." autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleAddModule('NEW_CUSTOM'); if (e.key === 'Escape') setAddingTo(null); }}
                        className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs outline-none placeholder:text-muted-foreground/40" />
                      <button onClick={() => handleAddModule('NEW_CUSTOM')} disabled={!newModName.trim()}
                        className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30">
                        <Check size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom — user area */}
        <div className="border-t border-sidebar-border/70 p-3 space-y-2">
          {/* User + Theme */}
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-sidebar-accent/45 hover:bg-sidebar-accent/70 transition-colors ring-1 ring-sidebar-border/50">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 shadow-sm">
                {userName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-sidebar-foreground truncate">{userName}</div>
                <div className="text-[10px] text-sidebar-foreground/45 truncate">{userRole}</div>
              </div>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          )}
          {isCollapsed && (
            <button
              onClick={toggleTheme}
              }
              className="w-full flex items-center justify-center py-2.5 rounded-xl text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
