import { useWebsites, useBuildProjects, useTasks, useNotes, usePayments, useIdeas, useHabits } from '@/hooks/useTableData';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { forwardRef, useState, useEffect, useMemo } from 'react';
import {
  CheckSquare, Clock, Calendar, FileText, Target, DollarSign,
  ArrowUpRight, ArrowDownRight, ExternalLink,
  Flame, ChevronRight, BarChart3, ArrowUp, Plus, TrendingUp,
  Cloud, Sparkles, Zap, MoreHorizontal, Play, Pause, Search,
  Github, Rocket, Bug, Lightbulb, Globe, Bell,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   Design tokens — Dribbble "task management" palette (works L + D)
   ═══════════════════════════════════════════════════════════════════ */
const HUES = {
  emerald: { grad: 'linear-gradient(140deg,#10b981,#059669 65%,#047857)', soft: 'rgba(16,185,129,0.12)', ink: '#065f46' },
  violet:  { grad: 'linear-gradient(140deg,#a78bfa,#8b5cf6 60%,#6d28d9)', soft: 'rgba(139,92,246,0.12)', ink: '#5b21b6' },
  rose:    { grad: 'linear-gradient(140deg,#fb7185,#f43f5e 60%,#e11d48)', soft: 'rgba(244,63,94,0.12)',  ink: '#9f1239' },
  amber:   { grad: 'linear-gradient(140deg,#fbbf24,#f59e0b 60%,#d97706)', soft: 'rgba(245,158,11,0.14)', ink: '#92400e' },
  sky:     { grad: 'linear-gradient(140deg,#38bdf8,#0ea5e9 60%,#0369a1)', soft: 'rgba(14,165,233,0.12)', ink: '#0c4a6e' },
  ink:     { grad: 'linear-gradient(160deg,#0f172a,#1e293b 60%,#0b1220)', soft: 'rgba(15,23,42,0.06)',   ink: '#0f172a' },
};

const fu = (i: number) => ({
  style: { animation: `fadeUp 0.55s ${i * 55}ms cubic-bezier(0.22,1,0.36,1) both` } as React.CSSProperties,
});

const PRI: Record<string, { hue: keyof typeof HUES; lbl: string }> = {
  critical: { hue: 'rose',    lbl: 'Critical' },
  high:     { hue: 'amber',   lbl: 'High' },
  medium:   { hue: 'sky',     lbl: 'Medium' },
  low:      { hue: 'emerald', lbl: 'Low' },
};

/* ─── tiny UI atoms ─── */
const SectionTitle = ({ title, sub, onAction, actionLabel = 'View all', invert }: any) => (
  <div className="flex items-start justify-between mb-5">
    <div>
      <h3 className={`text-[15px] font-bold tracking-tight ${invert ? 'text-white' : 'text-foreground'}`}>{title}</h3>
      {sub && <p className={`text-[11px] mt-0.5 ${invert ? 'text-white/50' : 'text-muted-foreground'}`}>{sub}</p>}
    </div>
    {onAction && (
      <button onClick={onAction}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition ${invert ? 'text-white/70 hover:text-white bg-white/10 hover:bg-white/15' : 'text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/70'}`}>
        {actionLabel} <ChevronRight size={11} />
      </button>
    )}
  </div>
);

const Ring = ({ pct, size = 96, stroke = 9, color = 'var(--gradient-primary)', track = 'hsl(var(--border))' }: any) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} opacity={0.35} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#ringG)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} />
    </svg>
  );
};

const AreaChart = ({ data, tone = 'emerald' }: { data: number[]; tone?: keyof typeof HUES }) => {
  const w = 520, h = 160, pad = 6;
  const max = Math.max(...data, 1);
  const stepX = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => [pad + i * stepX, h - pad - (v / max) * (h - pad * 2 - 20)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const area = `${line} L${pts[pts.length-1][0]},${h-pad} L${pts[0][0]},${h-pad} Z`;
  const gid = `ac-${tone}`;
  const stops: any = {
    emerald: ['#10b981', '#10b981'],
    violet:  ['#8b5cf6', '#8b5cf6'],
    sky:     ['#0ea5e9', '#0ea5e9'],
    amber:   ['#f59e0b', '#f59e0b'],
    rose:    ['#f43f5e', '#f43f5e'],
    ink:     ['#64748b', '#64748b'],
  };
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stops[tone][0]} stopOpacity={0.35} />
          <stop offset="100%" stopColor={stops[tone][1]} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stops[tone][0]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 0} fill="white" stroke={stops[tone][0]} strokeWidth={2.5} />
      ))}
    </svg>
  );
};

const AvatarStack = ({ names, size = 28 }: { names: string[]; size?: number }) => {
  const colors = ['#f59e0b', '#8b5cf6', '#10b981', '#0ea5e9', '#f43f5e'];
  return (
    <div className="flex -space-x-2">
      {names.slice(0, 4).map((n, i) => (
        <div key={i} style={{ width: size, height: size, background: colors[i % colors.length] }}
          className="rounded-full ring-2 ring-background flex items-center justify-center text-white text-[10px] font-bold uppercase">
          {n.charAt(0)}
        </div>
      ))}
      {names.length > 4 && (
        <div style={{ width: size, height: size }} className="rounded-full ring-2 ring-background bg-secondary text-foreground/70 flex items-center justify-center text-[10px] font-bold">
          +{names.length - 4}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════ */
const DashboardHome = forwardRef<HTMLDivElement>(function DashboardHome(_, ref) {
  const websites = useWebsites();
  const buildProjects = useBuildProjects();
  const tasks = useTasks();
  const notes = useNotes();
  const payments = usePayments();
  const ideas = useIdeas();
  const habits = useHabits();
  const { setActiveSection } = useNavigationStore();
  const { userName } = useSettingsStore();
  const [clock, setClock] = useState(new Date());
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSec, setTimerSec] = useState(25 * 60);

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!timerRunning) return;
    const t = setInterval(() => setTimerSec(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timerRunning]);

  /* ─── derived ─── */
  const today = new Date().toISOString().split('T')[0];
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const done = tasks.filter(t => t.status === 'done');
  const open = tasks.filter(t => t.status !== 'done');
  const inProgress = tasks.filter(t => t.status === 'in-progress');
  const todo = tasks.filter(t => t.status === 'todo');
  const dueToday = tasks.filter(t => t.dueDate === today && t.status !== 'done').length;
  const overdue = tasks.filter(t => t.dueDate < today && t.status !== 'done').length;
  const completedToday = tasks.filter(t => t.completedAt === today).length;
  const income = payments.filter(p => p.type === 'income' && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const expense = payments.filter(p => (p.type === 'expense' || p.type === 'subscription') && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const pct = tasks.length > 0 ? (done.length / tasks.length) * 100 : 0;
  const upcoming = tasks.filter(t => t.status !== 'done' && t.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const topIdeas = ideas.filter(i => i.status !== 'parked').sort((a, b) => b.votes - a.votes).slice(0, 4);
  const pinnedNotes = notes.filter(n => n.pinned).slice(0, 3);
  const taskWave = useMemo(() => [4, 6, 5, 8, 7, 9, done.length || 6, 11, 8, 12, open.length + 6, 14], [done.length, open.length]);
  const hour = clock.getHours();
  const greet = hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timerText = `${String(Math.floor(timerSec / 60)).padStart(2,'0')}:${String(timerSec % 60).padStart(2,'0')}`;

  /* ─── kanban buckets from real tasks ─── */
  const kanban = [
    { key: 'todo',        title: 'To do',       hue: 'sky' as const,     items: todo.slice(0, 4) },
    { key: 'in-progress', title: 'In progress', hue: 'amber' as const,   items: inProgress.slice(0, 4) },
    { key: 'review',      title: 'In review',   hue: 'violet' as const,  items: open.filter(t => t.priority === 'high').slice(0, 3) },
    { key: 'done',        title: 'Completed',   hue: 'emerald' as const, items: done.slice(0, 3) },
  ];

  return (
    <div ref={ref} className="flex flex-col gap-5 sm:gap-6 pb-8">

      {/* Anim keyframes */}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>

      {/* ═══ HERO ═══ */}
      <div {...fu(0)} className="relative overflow-hidden rounded-[32px] p-6 sm:p-10"
        style={{
          background: 'linear-gradient(135deg, #0b1220 0%, #0f172a 45%, #052e2b 100%)',
          boxShadow: '0 40px 90px -40px rgba(15,23,42,0.55)',
        }}>
        {/* aurora */}
        <div className="absolute inset-0 pointer-events-none opacity-90"
          style={{ background: 'radial-gradient(600px 300px at 8% -10%, rgba(16,185,129,0.35), transparent 60%), radial-gradient(700px 350px at 100% 0%, rgba(139,92,246,0.28), transparent 55%), radial-gradient(500px 300px at 60% 120%, rgba(14,165,233,0.22), transparent 55%)' }} />
        {/* grid dots */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

        <div className="relative flex flex-col lg:flex-row gap-8 lg:items-end justify-between">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 text-[11px] font-semibold text-white/85 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Mission Control · {dateLabel}
            </div>
            <h1 className="text-white font-extrabold tracking-tighter leading-[0.95] text-[40px] sm:text-[56px] lg:text-[68px]">
              {greet},<br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#6ee7b7,#38bdf8 55%,#a78bfa)' }}>
                {userName}.
              </span>
            </h1>
            <p className="mt-4 text-white/60 text-[14px] sm:text-[15px] max-w-xl">
              You have <strong className="text-white">{open.length} open tasks</strong>, {dueToday} due today
              {overdue > 0 && <> and <strong className="text-rose-300">{overdue} overdue</strong></>}. Let's crush the day.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <button onClick={() => setActiveSection('tasks')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-900 text-[13px] font-bold hover:scale-[1.02] active:scale-[0.98] transition shadow-lg">
                <Plus size={15} /> New task
              </button>
              <button onClick={() => setActiveSection('focus')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 border border-white/15 text-white text-[13px] font-semibold hover:bg-white/15 backdrop-blur transition">
                <Zap size={15} /> Start focus
              </button>
              <button onClick={() => setActiveSection('calendar')}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-white/75 hover:text-white text-[13px] font-medium transition">
                <Calendar size={15} /> Today's schedule
              </button>
            </div>
          </div>

          {/* Hero side — floating summary card */}
          <div className="relative w-full lg:w-[320px] shrink-0">
            <div className="rounded-3xl p-5 backdrop-blur-xl border border-white/15"
              style={{ background: 'linear-gradient(160deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] text-white/60 font-semibold uppercase tracking-widest">Today's progress</div>
                <MoreHorizontal size={16} className="text-white/50" />
              </div>
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Ring pct={pct} size={92} stroke={9} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white text-xl font-extrabold tabular-nums">{Math.round(pct)}%</span>
                    <span className="text-[9px] text-white/50">done</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-[12px]"><span className="text-white/60">Completed</span><span className="text-white font-bold tabular-nums">{done.length}</span></div>
                  <div className="flex items-center justify-between text-[12px]"><span className="text-white/60">Active</span><span className="text-white font-bold tabular-nums">{inProgress.length}</span></div>
                  <div className="flex items-center justify-between text-[12px]"><span className="text-white/60">Overdue</span><span className={`font-bold tabular-nums ${overdue ? 'text-rose-300' : 'text-white'}`}>{overdue}</span></div>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                <AvatarStack names={[userName, 'Alex', 'Jamie', 'Sam', 'Riley']} />
                <button onClick={() => setActiveSection('tasks')} className="text-[11px] text-white/70 hover:text-white font-semibold inline-flex items-center gap-1">
                  View team <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ STAT CARDS — 4 distinct colored tiles ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { hue: 'emerald' as const, label: 'Total projects', value: websites.length + buildProjects.length, delta: '+5.4%', Icon: BarChart3, nav: 'websites', sub: 'across all workspaces' },
          { hue: 'violet'  as const, label: 'Completed',      value: done.length,                            delta: '+3.2%', Icon: CheckSquare, nav: 'tasks', sub: 'tasks this month' },
          { hue: 'amber'   as const, label: 'Active tasks',   value: open.length,                            delta: overdue ? `${overdue} overdue` : '+8.1%', Icon: TrendingUp, nav: 'tasks', sub: 'currently running' },
          { hue: 'sky'     as const, label: 'Net revenue',    value: fmt(income - expense),                   delta: '+12.8%', Icon: DollarSign, nav: 'payments', sub: 'this period' },
        ].map((s, i) => {
          const h = HUES[s.hue];
          return (
            <button key={s.label} onClick={() => setActiveSection(s.nav)} {...fu(i + 1)}
              className="group relative text-left rounded-[28px] p-6 overflow-hidden text-white transition-transform hover:-translate-y-1"
              style={{ background: h.grad, boxShadow: `0 20px 50px -20px ${h.soft.replace('0.12','0.55').replace('0.14','0.55')}` }}>
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 65%)' }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <s.Icon size={18} className="text-white" />
                  </div>
                  <ArrowUpRight size={16} className="text-white/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="text-[36px] font-extrabold tracking-tighter leading-none tabular-nums">{s.value}</div>
                <div className="mt-2 text-[13px] font-semibold text-white/90">{s.label}</div>
                <div className="mt-1 text-[11px] text-white/65">{s.sub}</div>
                <div className="mt-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[10px] font-bold">
                  <ArrowUp size={10} /> {s.delta}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ ANALYTICS (7) + POMODORO (5) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Performance chart */}
        <div {...fu(6)} className="lg:col-span-8 enterprise-card rounded-[28px] p-6 sm:p-7">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Productivity</div>
              <h3 className="text-[22px] font-extrabold tracking-tight text-foreground">Weekly performance</h3>
              <p className="text-[12px] text-muted-foreground mt-1">Tasks completed vs. planned — last 12 days</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-2xl bg-secondary p-1 text-[11px] font-semibold">
                {['1W', '1M', '3M', '1Y'].map((v, idx) => (
                  <button key={v} className={`px-3 py-1.5 rounded-xl transition ${idx === 0 ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{v}</button>
                ))}
              </div>
              <button className="w-9 h-9 rounded-2xl bg-secondary hover:bg-secondary/70 flex items-center justify-center text-muted-foreground"><MoreHorizontal size={16} /></button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { hue: 'emerald' as const, lbl: 'Completed', val: done.length, delta: '+18%' },
              { hue: 'amber'   as const, lbl: 'Active',    val: inProgress.length, delta: '+4%' },
              { hue: 'rose'    as const, lbl: 'Overdue',   val: overdue, delta: overdue ? '⚠️' : 'clear' },
            ].map(m => (
              <div key={m.lbl} className="rounded-2xl p-4 border border-border/60 bg-secondary/40">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: HUES[m.hue].grad }} />
                  <span className="text-[11px] font-semibold text-muted-foreground">{m.lbl}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-extrabold tabular-nums text-foreground">{m.val}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">{m.delta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="h-[180px] -mx-2">
            <AreaChart data={taskWave} tone="emerald" />
          </div>
        </div>

        {/* Pomodoro / Focus */}
        <div {...fu(7)} className="lg:col-span-4 rounded-[28px] p-6 sm:p-7 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#0f172a,#111827 55%,#0b1220)' }}>
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle,#10b981,transparent 65%)' }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Focus session
              </div>
              <MoreHorizontal size={16} className="text-white/50" />
            </div>

            <div className="text-[64px] font-extrabold tracking-tighter tabular-nums leading-none">{timerText}</div>
            <div className="text-[12px] text-white/50 mt-1">Deep work · Pomodoro 25/5</div>

            <div className="mt-6 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${100 - (timerSec / (25 * 60)) * 100}%`, background: 'linear-gradient(90deg,#10b981,#38bdf8)' }} />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button onClick={() => setTimerRunning(r => !r)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-slate-900 font-bold text-[13px] hover:scale-[1.02] transition">
                {timerRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Start</>}
              </button>
              <button onClick={() => { setTimerRunning(false); setTimerSec(25 * 60); }}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 text-[13px] font-semibold transition">Reset</button>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-lg font-extrabold text-white">{completedToday}</div><div className="text-[10px] text-white/50 mt-0.5">Done today</div></div>
              <div><div className="text-lg font-extrabold text-white">{dueToday}</div><div className="text-[10px] text-white/50 mt-0.5">Due today</div></div>
              <div><div className={`text-lg font-extrabold ${overdue ? 'text-rose-300' : 'text-white'}`}>{overdue}</div><div className="text-[10px] text-white/50 mt-0.5">Overdue</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KANBAN — the centerpiece from the Dribbble reference ═══ */}
      <div {...fu(8)} className="enterprise-card rounded-[28px] p-6 sm:p-7">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Task board</div>
            <h3 className="text-[22px] font-extrabold tracking-tight text-foreground">What's on your plate</h3>
            <p className="text-[12px] text-muted-foreground mt-1">Live view · updates in real time</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Search tasks..." className="pl-9 pr-3 py-2 rounded-2xl bg-secondary text-[12px] text-foreground placeholder:text-muted-foreground/60 outline-none w-52 focus:ring-2 focus:ring-primary/30" />
            </div>
            <button onClick={() => setActiveSection('tasks')} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-foreground text-background text-[12px] font-bold hover:opacity-90 transition">
              <Plus size={13} /> New task
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {kanban.map((col, ci) => {
            const h = HUES[col.hue];
            return (
              <div key={col.key} {...fu(9 + ci)} className="rounded-3xl p-4 border border-border/60 flex flex-col gap-3"
                style={{ background: 'var(--surface-panel)' }}>
                <div className="flex items-center justify-between px-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: h.grad }} />
                    <span className="text-[12px] font-bold text-foreground">{col.title}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-muted-foreground bg-secondary">{col.items.length}</span>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground"><Plus size={13} /></button>
                </div>

                {col.items.length === 0 && (
                  <div className="text-center py-6 text-[11px] text-muted-foreground/60">Nothing here yet</div>
                )}

                {col.items.map((t, i) => {
                  const p = PRI[t.priority] || PRI.medium;
                  const ph = HUES[p.hue];
                  const isOverdue = t.dueDate && t.dueDate < today && col.key !== 'done';
                  return (
                    <button key={t.id} onClick={() => setActiveSection('tasks')}
                      className="text-left rounded-2xl p-3.5 border border-border/60 bg-background hover:shadow-md hover:border-primary/30 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ background: ph.soft, color: ph.ink }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ph.grad }} /> {p.lbl}
                        </span>
                        <MoreHorizontal size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug mb-3">{t.title}</div>
                      <div className="flex items-center justify-between">
                        <AvatarStack names={[userName, 'Alex', 'Jamie'].slice(0, (i % 3) + 1)} size={22} />
                        <div className={`flex items-center gap-1 text-[10px] font-semibold ${isOverdue ? 'text-rose-500' : 'text-muted-foreground'}`}>
                          <Clock size={10} />
                          {t.dueDate ? (t.dueDate === today ? 'Today' : t.dueDate.slice(5)) : '—'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ FINANCE + SCHEDULE + HABITS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Finance */}
        <div {...fu(13)} className="lg:col-span-5 enterprise-card rounded-[28px] p-6 sm:p-7">
          <SectionTitle title="Finance" sub="Income, expenses & profit" onAction={() => setActiveSection('payments')} actionLabel="Details" />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { hue: 'emerald' as const, lbl: 'Income',   val: income,  Icon: ArrowUpRight },
              { hue: 'rose'    as const, lbl: 'Expenses', val: expense, Icon: ArrowDownRight },
              { hue: 'amber'   as const, lbl: 'Pending',  val: pending, Icon: Clock },
            ].map(d => (
              <div key={d.lbl} className="rounded-2xl p-4 border border-border/60"
                style={{ background: HUES[d.hue].soft }}>
                <d.Icon size={14} style={{ color: HUES[d.hue].ink }} />
                <div className="mt-2 text-[15px] font-extrabold tabular-nums" style={{ color: HUES[d.hue].ink }}>{fmt(d.val)}</div>
                <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">{d.lbl}</div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl border border-border/60 bg-secondary/40 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Net profit</div>
              <div className={`text-[24px] font-extrabold tabular-nums leading-none mt-1 ${income - expense >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{fmt(income - expense)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">{payments.length} transactions</div>
              <div className={`text-[11px] font-bold mt-0.5 ${income - expense >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{income - expense >= 0 ? '▲ Profitable' : '▼ Loss'}</div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div {...fu(14)} className="lg:col-span-4 enterprise-card rounded-[28px] p-6 sm:p-7">
          <SectionTitle title="Upcoming" sub={`${upcoming.length} deadlines`} onAction={() => setActiveSection('calendar')} actionLabel="Calendar" />
          <div className="space-y-2">
            {upcoming.map((t, i) => {
              const d = Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86400000);
              const hue: keyof typeof HUES = d <= 0 ? 'rose' : d <= 2 ? 'amber' : 'sky';
              const h = HUES[hue];
              return (
                <div key={t.id} {...fu(i)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 transition cursor-pointer" onClick={() => setActiveSection('tasks')}>
                  <div className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: h.soft, color: h.ink }}>
                    <span className="text-[8px] font-bold uppercase leading-none">{new Date(t.dueDate).toLocaleDateString('en', { month: 'short' })}</span>
                    <span className="text-sm font-extrabold leading-tight">{new Date(t.dueDate).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">{t.title}</div>
                    <div className="text-[10px] text-muted-foreground">{d <= 0 ? 'Due today' : d === 1 ? 'Tomorrow' : `In ${d} days`}</div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <div className="text-center py-10">
                <div className="text-4xl mb-2">🌟</div>
                <p className="text-[12px] text-muted-foreground">Nothing scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Habits */}
        <div {...fu(15)} className="lg:col-span-3 rounded-[28px] p-6 sm:p-7 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#7c2d12,#c2410c 60%,#f97316)' }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle,#fbbf24,transparent 65%)' }} />
          <div className="relative">
            <SectionTitle invert title="Habits" sub={`${habits.filter(h => h.completions?.includes(today)).length}/${habits.length} today`} onAction={() => setActiveSection('habits')} actionLabel="Track" />
            <div className="space-y-2">
              {habits.slice(0, 5).map((h, i) => {
                const isDone = h.completions?.includes(today);
                return (
                  <div key={h.id} {...fu(i)} className={`flex items-center gap-2.5 p-2.5 rounded-2xl transition ${isDone ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15'}`}>
                    <span className="text-base">{h.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-white truncate">{h.name}</div>
                      <div className="text-[9px] text-white/70">{h.frequency}</div>
                    </div>
                    <div className="flex items-center gap-0.5 text-white"><Flame size={11} /><span className="text-[10px] font-extrabold tabular-nums">{h.streak}</span></div>
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] ${isDone ? 'bg-white text-orange-600' : 'bg-white/20 text-white/40'}`}>{isDone ? '✓' : ''}</div>
                  </div>
                );
              })}
              {habits.length === 0 && (
                <div className="text-center py-8">
                  <Flame size={28} className="mx-auto text-white/60 mb-2" />
                  <p className="text-[11px] text-white/80 mb-2">Build a streak</p>
                  <button onClick={() => setActiveSection('habits')} className="text-[11px] text-white font-bold hover:underline">Start →</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ IDEAS + NOTES + PLATFORMS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Ideas */}
        <div {...fu(16)} className="lg:col-span-4 enterprise-card rounded-[28px] p-6 sm:p-7">
          <SectionTitle title="Top ideas" sub="Voted by team" onAction={() => setActiveSection('ideas')} />
          <div className="space-y-2">
            {topIdeas.map((idea, i) => (
              <button key={idea.id} {...fu(i)} onClick={() => setActiveSection('ideas')}
                className="w-full text-left flex items-center gap-3 p-3 rounded-2xl border border-border/60 hover:border-primary/30 hover:bg-secondary/40 transition">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold tabular-nums text-[13px] flex-shrink-0"
                  style={{ background: HUES.violet.soft, color: HUES.violet.ink }}>
                  {idea.votes}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-foreground truncate">{idea.title}</div>
                  <div className="text-[10px] text-muted-foreground">{idea.category}</div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold capitalize"
                  style={{ background: idea.status === 'validated' ? HUES.emerald.soft : HUES.sky.soft, color: idea.status === 'validated' ? HUES.emerald.ink : HUES.sky.ink }}>
                  {idea.status}
                </span>
              </button>
            ))}
            {topIdeas.length === 0 && (
              <div className="text-center py-10">
                <Lightbulb size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-[12px] text-muted-foreground">No ideas yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div {...fu(17)} className="lg:col-span-4 enterprise-card rounded-[28px] p-6 sm:p-7">
          <SectionTitle title="Pinned notes" sub={`${pinnedNotes.length} pinned`} onAction={() => setActiveSection('notes')} />
          <div className="space-y-2.5">
            {pinnedNotes.map((n, i) => {
              const tones = ['violet', 'amber', 'sky', 'emerald'] as (keyof typeof HUES)[];
              const h = HUES[tones[i % 4]];
              return (
                <button key={n.id} onClick={() => setActiveSection('notes')} {...fu(i)}
                  className="w-full text-left p-4 rounded-2xl border transition hover:shadow-md"
                  style={{ background: h.soft, borderColor: h.soft }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: h.grad }} />
                    <div className="text-[13px] font-bold truncate" style={{ color: h.ink }}>{n.title}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{n.content.slice(0, 100)}</div>
                </button>
              );
            })}
            {pinnedNotes.length === 0 && (
              <div className="text-center py-10">
                <FileText size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-[12px] text-muted-foreground mb-2">No pinned notes</p>
                <button onClick={() => setActiveSection('notes')} className="text-[12px] text-primary font-bold hover:underline">Create one →</button>
              </div>
            )}
          </div>
        </div>

        {/* Platforms */}
        <div {...fu(18)} className="lg:col-span-4 enterprise-card rounded-[28px] p-6 sm:p-7">
          <SectionTitle title="Platforms" sub="System status" onAction={() => setActiveSection('cloudflare')} actionLabel="Manage" />
          <div className="space-y-2">
            {[
              { name: 'Cloudflare', Icon: Cloud,   hue: 'amber'   as const, s: 'cloudflare', up: '99.9%' },
              { name: 'Vercel',     Icon: Rocket,  hue: 'ink'     as const, s: 'vercel',     up: '99.8%' },
              { name: 'GitHub',     Icon: Github,  hue: 'violet'  as const, s: 'github',     up: '99.9%' },
              { name: 'OpenClaw',   Icon: Bug,     hue: 'emerald' as const, s: 'openclaw',   up: '100%'  },
              { name: 'Websites',   Icon: Globe,   hue: 'sky'     as const, s: 'websites',   up: `${websites.filter(w => w.status === 'active').length} live` },
            ].map(p => {
              const h = HUES[p.hue];
              return (
                <button key={p.name} onClick={() => setActiveSection(p.s)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 transition">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: h.soft, color: h.ink }}>
                    <p.Icon size={16} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-[13px] font-semibold text-foreground">{p.name}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational
                    </div>
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{p.up}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

export default DashboardHome;
