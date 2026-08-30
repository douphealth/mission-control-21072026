import { useWebsites, useBuildProjects, useTasks, useNotes, usePayments, useIdeas, useHabits, useSEOProfiles, useSEOSnapshots, useSEOIssues, useSEOActions } from '@/hooks/useTableData';
import { useNavigationStore } from '@/stores/navigationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { forwardRef, useState, useEffect, useMemo } from 'react';
import {
  CheckSquare, Clock, Calendar, FileText, Target, DollarSign,
  ArrowUpRight, ArrowDownRight, ExternalLink,
  Flame, ChevronRight, BarChart3, ArrowUp, Plus, TrendingUp,
  Cloud, Sparkles, Zap, MoreHorizontal, Play, Pause, Search,
  Github, Rocket, Bug, Lightbulb, Globe, Bell, ListChecks, Activity,
} from 'lucide-react';
import TaskQuickEditor from '@/components/TaskQuickEditor';

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

/* ─── Momentum chart: smooth curve, gradient glow, hover readout ─── */
const MomentumChart = ({ data }: { data: number[] }) => {
  const [hover, setHover] = useState<number | null>(null);
  const w = 720, h = 220, padX = 14, padTop = 22, padBottom = 26;
  const pts = data.length ? data : [0, 0];
  const max = Math.max(...pts, 1);
  const stepX = pts.length > 1 ? (w - padX * 2) / (pts.length - 1) : 0;
  const xy = pts.map((v, i) => [padX + i * stepX, h - padBottom - (v / max) * (h - padTop - padBottom)] as const);

  // Catmull-Rom → cubic bezier for a silky curve
  let line = `M${xy[0][0]},${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    line += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  const area = `${line} L${xy[xy.length - 1][0]},${h - padBottom} L${xy[0][0]},${h - padBottom} Z`;
  const active = hover != null ? xy[hover] : xy[xy.length - 1];
  const activeVal = pts[hover != null ? hover : pts.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[200px] w-full overflow-visible"
        onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="mcStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--info))" />
            <stop offset="55%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--violet))" />
          </linearGradient>
          <linearGradient id="mcFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.34} />
            <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <filter id="mcGlow" x="-20%" y="-40%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* grid */}
        {[0.25, 0.5, 0.75].map(g => (
          <line key={g} x1={padX} x2={w - padX} y1={padTop + g * (h - padTop - padBottom)} y2={padTop + g * (h - padTop - padBottom)}
            stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="2 8" opacity={0.7} />
        ))}

        <path d={area} fill="url(#mcFill)" style={{ animation: 'mcFade 0.9s ease-out both' }} />
        <path d={line} fill="none" stroke="url(#mcStroke)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
          filter="url(#mcGlow)" pathLength={1} style={{ strokeDasharray: 1, animation: 'mcDraw 1.4s cubic-bezier(0.22,1,0.36,1) both' }} />

        {/* hover crosshair */}
        {active && (
          <>
            <line x1={active[0]} x2={active[0]} y1={padTop - 8} y2={h - padBottom} stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
            <circle cx={active[0]} cy={active[1]} r={9} fill="hsl(var(--primary))" opacity={0.16} />
            <circle cx={active[0]} cy={active[1]} r={4.5} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={3} />
          </>
        )}

        {/* hit zones */}
        {xy.map((p, i) => (
          <rect key={i} x={p[0] - stepX / 2} y={0} width={stepX || w} height={h} fill="transparent"
            onMouseEnter={() => setHover(i)} />
        ))}
      </svg>

      {active && (
        <div className="pointer-events-none absolute -top-1 rounded-lg border border-border/60 bg-card/95 px-2 py-1 text-[10px] font-bold text-foreground shadow-[var(--shadow-md)] backdrop-blur"
          style={{ left: `calc(${(active[0] / w) * 100}% - 26px)` }}>
          {activeVal} done
        </div>
      )}
    </div>
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
  const seoProfiles = useSEOProfiles();
  const seoSnapshots = useSEOSnapshots();
  const seoIssues = useSEOIssues();
  const seoActions = useSEOActions();
  const { setActiveSection } = useNavigationStore();
  const { userName } = useSettingsStore();
  const [clock, setClock] = useState(new Date());
  const [timerRunning, setTimerRunning] = useState(false);
  const [chartRange, setChartRange] = useState<'1W' | '1M' | '3M' | '1Y'>('1W');
  const [timerSec, setTimerSec] = useState(25 * 60);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskSearch, setTaskSearch] = useState('');

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
  const seoEvidenceSiteIds = new Set(seoSnapshots.map(s => s.websiteId));
  const seoConnectedProfiles = seoProfiles.filter(p => p.syncStatus === 'connected').length;
  const seoOpenIssues = seoIssues.filter(i => i.status === 'open' || i.status === 'in-progress');
  const seoOpenActions = seoActions.filter(a => a.status !== 'done' && a.status !== 'cancelled');
  const seoNextActions = [...seoOpenActions].sort((a, b) => ({ critical: 4, high: 3, medium: 2, low: 1 }[b.priority] - ({ critical: 4, high: 3, medium: 2, low: 1 }[a.priority]))).slice(0, 3);
  // Real completion history for the selected range (no more placeholder wave).
  const RANGE_DAYS: Record<string, number> = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 };
  const rangeDays = RANGE_DAYS[chartRange] ?? 7;
  const buckets = rangeDays <= 30 ? rangeDays : 12;   // long ranges compress into 12 points
  const taskWave = useMemo(() => {
    const span = Math.max(1, Math.round(rangeDays / buckets));
    const now = new Date(`${today}T00:00:00`).getTime();
    return Array.from({ length: buckets }, (_, i) => {
      const end = now - (buckets - 1 - i) * span * 86_400_000;
      const start = end - (span - 1) * 86_400_000;
      return tasks.filter(t => {
        const stamp = (t.completedAt || '').slice(0, 10);
        if (!stamp) return false;
        const ts = new Date(`${stamp}T00:00:00`).getTime();
        return ts >= start && ts <= end;
      }).length;
    });
  }, [tasks, rangeDays, buckets, today]);
  const rangeCompleted = taskWave.reduce((s, n) => s + n, 0);
  const previousRangeCompleted = useMemo(() => {
    const end = new Date(`${today}T00:00:00`).getTime() - rangeDays * 86_400_000;
    const start = end - (rangeDays - 1) * 86_400_000;
    return tasks.filter(task => {
      const stamp = (task.completedAt || '').slice(0, 10);
      if (!stamp) return false;
      const completed = new Date(`${stamp}T00:00:00`).getTime();
      return completed >= start && completed <= end;
    }).length;
  }, [tasks, rangeDays, today]);
  const completionChange = previousRangeCompleted > 0
    ? Math.round(((rangeCompleted - previousRangeCompleted) / previousRangeCompleted) * 100)
    : rangeCompleted > 0 ? 100 : 0;
  const maxWave = Math.max(...taskWave, 0);
  const peakIndex = maxWave > 0 ? taskWave.indexOf(maxWave) : -1;
  const periodLabel = chartRange === '1W' ? '7 days' : chartRange === '1M' ? '30 days' : chartRange === '3M' ? '90 days' : '12 months';
  const hour = clock.getHours();
  const greet = hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timerText = `${String(Math.floor(timerSec / 60)).padStart(2,'0')}:${String(timerSec % 60).padStart(2,'0')}`;

  /* ─── kanban buckets from real tasks ─── */
  const matching = (items: typeof tasks) => items.filter(t => `${t.title} ${t.description ?? ''} ${t.category ?? ''}`.toLowerCase().includes(taskSearch.trim().toLowerCase()));
  const kanban = [
    { key: 'todo',        title: 'To do',       hue: 'sky' as const,     items: matching(todo).slice(0, 6) },
    { key: 'in-progress', title: 'In progress', hue: 'amber' as const,   items: matching(inProgress).slice(0, 6) },
    { key: 'review',      title: 'High priority', hue: 'violet' as const, items: matching(open.filter(t => t.priority === 'high' || t.priority === 'critical')).slice(0, 6) },
    { key: 'done',        title: 'Completed',   hue: 'emerald' as const, items: matching(done).slice(0, 6) },
  ];
  const editingTask = tasks.find(t => t.id === editingTaskId) ?? null;

  return (
    <div ref={ref} className="flex flex-col gap-5 sm:gap-6 pb-8">

      {/* Anim keyframes */}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>

      {/* ═══ HERO ═══ */}
      <div {...fu(0)} className="relative overflow-hidden rounded-[26px] p-5 sm:rounded-[32px] sm:p-10"
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

        <div className="relative flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-end justify-between">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 text-[10px] sm:text-[11px] font-semibold text-white/85 mb-4 sm:mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate">{dateLabel}</span>
            </div>
            <h1 className="font-display text-white font-extrabold tracking-tighter leading-[0.98] text-[30px] min-[380px]:text-[34px] sm:text-[56px] lg:text-[68px]">
              {greet},{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#6ee7b7,#38bdf8 55%,#a78bfa)' }}>
                {userName}
              </span>
            </h1>
            <p className="mt-3 sm:mt-4 text-white/60 text-[13px] sm:text-[15px] max-w-xl">
              <strong className="text-white">{open.length} open</strong> · {dueToday} due today
              {overdue > 0 && <> · <strong className="text-rose-300">{overdue} overdue</strong></>}
            </p>

            {/* mobile: swipeable action rail — desktop: wrapped buttons */}
            <div className="mobile-rail mt-5 sm:mt-6 sm:flex-wrap sm:items-center sm:gap-2.5 sm:overflow-visible sm:mx-0 sm:px-0">
              <button onClick={() => setActiveSection('tasks')}
                className="inline-flex items-center gap-2 px-4 py-3 sm:px-5 rounded-2xl bg-white text-slate-900 text-[13px] font-bold active:scale-[0.97] transition shadow-lg">
                <Plus size={15} /> New task
              </button>
              <button onClick={() => setActiveSection('focus')}
                className="inline-flex items-center gap-2 px-4 py-3 sm:px-5 rounded-2xl bg-white/10 border border-white/15 text-white text-[13px] font-semibold active:scale-[0.97] backdrop-blur transition">
                <Zap size={15} /> Start focus
              </button>
              <button onClick={() => setActiveSection('calendar')}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 sm:border-transparent sm:bg-transparent text-white/80 text-[13px] font-medium transition">
                <Calendar size={15} /> Schedule
              </button>
            </div>
          </div>

          {/* Hero side — floating summary card */}
          <div className="relative w-full lg:w-[320px] shrink-0">
            <div className="rounded-3xl p-4 sm:p-5 backdrop-blur-xl border border-white/15"
              style={{ background: 'linear-gradient(160deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] sm:text-[11px] text-white/60 font-semibold uppercase tracking-widest">Today's progress</div>
                <MoreHorizontal size={16} className="text-white/50" />
              </div>
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <Ring pct={pct} size={84} stroke={9} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white text-lg sm:text-xl font-extrabold tabular-nums">{Math.round(pct)}%</span>
                    <span className="text-[9px] text-white/50">done</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-[12px]"><span className="text-white/60">Completed</span><span className="text-white font-bold tabular-nums">{done.length}</span></div>
                  <div className="flex items-center justify-between text-[12px]"><span className="text-white/60">Active</span><span className="text-white font-bold tabular-nums">{inProgress.length}</span></div>
                  <div className="flex items-center justify-between text-[12px]"><span className="text-white/60">Overdue</span><span className={`font-bold tabular-nums ${overdue ? 'text-rose-300' : 'text-white'}`}>{overdue}</span></div>
                </div>
              </div>
              <button onClick={() => setActiveSection('tasks')}
                className="mt-4 w-full rounded-2xl bg-white/10 border border-white/15 py-2.5 text-[12px] font-semibold text-white/85 active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5">
                Open task list <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* ═══ STAT CARDS — 4 distinct colored tiles ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { hue: 'emerald' as const, label: 'Total projects', value: websites.length + buildProjects.length, delta: '+5.4%', Icon: BarChart3, nav: 'websites', sub: 'across all workspaces' },
          { hue: 'violet'  as const, label: 'Completed',      value: done.length,                            delta: '+3.2%', Icon: CheckSquare, nav: 'tasks', sub: 'tasks this month' },
          { hue: 'amber'   as const, label: 'Active tasks',   value: open.length,                            delta: overdue ? `${overdue} overdue` : '+8.1%', Icon: TrendingUp, nav: 'tasks', sub: 'currently running' },
          { hue: 'sky'     as const, label: 'Net revenue',    value: fmt(income - expense),                   delta: '+12.8%', Icon: DollarSign, nav: 'payments', sub: 'this period' },
        ].map((s, i) => {
          const h = HUES[s.hue];
          return (
            <button key={s.label} onClick={() => setActiveSection(s.nav)} {...fu(i + 1)}
              className="group relative text-left rounded-[22px] sm:rounded-[28px] p-4 sm:p-6 overflow-hidden text-white transition-transform hover:-translate-y-1 active:scale-[0.98]"
              style={{ background: h.grad, boxShadow: `0 20px 50px -20px ${h.soft.replace('0.12','0.55').replace('0.14','0.55')}` }}>
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent 65%)' }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <s.Icon size={18} className="text-white" />
                  </div>
                  <ArrowUpRight size={16} className="text-white/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="font-display text-[26px] sm:text-[36px] font-extrabold tracking-tighter leading-none tabular-nums">{s.value}</div>
                <div className="mt-1.5 sm:mt-2 text-[12px] sm:text-[13px] font-semibold text-white/90">{s.label}</div>
                <div className="mt-1 hidden sm:block text-[11px] text-white/65">{s.sub}</div>
                <div className="mt-3 sm:mt-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[10px] font-bold">
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
        <div {...fu(6)} className="lg:col-span-8 relative overflow-hidden rounded-[28px] border border-border/60 bg-card p-5 shadow-[var(--shadow-lg)] sm:p-7">
          {/* ambient light */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.18),transparent_65%)] blur-2xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,hsl(var(--info)/0.12),transparent_65%)] blur-2xl" />

          <div className="relative mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Productivity pulse
              </div>
              <h3 className="font-display text-[24px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[30px]">
                Momentum, <span className="bg-gradient-to-r from-primary via-info to-violet bg-clip-text text-transparent">visualised</span>
              </h3>
              <p className="mt-1 text-[12px] text-muted-foreground">Live output across the last {periodLabel}</p>
            </div>
            <div className="inline-flex shrink-0 rounded-2xl border border-border/60 bg-secondary/60 p-1 text-[11px] font-semibold backdrop-blur" role="group" aria-label="Performance range">
              {(['1W', '1M', '3M', '1Y'] as const).map(v => (
                <button key={v} type="button" onClick={() => setChartRange(v)} aria-pressed={chartRange === v}
                  className={`min-w-10 rounded-xl px-2.5 py-2 transition-all duration-300 ${chartRange === v ? 'bg-card text-foreground shadow-[0_6px_18px_-8px_hsl(var(--primary)/0.7)] ring-1 ring-primary/30' : 'text-muted-foreground hover:text-foreground'}`}>{v}</button>
              ))}
            </div>
          </div>

          {/* KPI trio */}
          <div className="relative mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { key: 'done', lbl: 'Completed', val: rangeCompleted, delta: `${completionChange >= 0 ? '+' : ''}${completionChange}% vs prior`, icon: CheckSquare, tone: 'primary', up: completionChange >= 0, bar: Math.min(100, rangeCompleted ? 100 : 0) },
              { key: 'motion', lbl: 'In motion', val: inProgress.length, delta: `${open.length} total open`, icon: Zap, tone: 'info', up: true, bar: open.length ? (inProgress.length / open.length) * 100 : 0 },
              { key: 'attn', lbl: 'Needs attention', val: overdue, delta: overdue ? 'Overdue now' : 'All clear', icon: Bell, tone: overdue ? 'destructive' : 'primary', up: !overdue, bar: open.length ? (overdue / open.length) * 100 : 0 },
            ].map((m, i) => (
              <div key={m.key}
                style={{ animation: `fadeUp 0.6s ${300 + i * 90}ms cubic-bezier(0.22,1,0.36,1) both` }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-secondary/50 to-secondary/20 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_40px_-24px_hsl(var(--primary)/0.55)]">
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: `radial-gradient(120% 80% at 50% 0%, hsl(var(--${m.tone})/0.14), transparent 70%)` }} />
                <div className="relative mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{m.lbl}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `hsl(var(--${m.tone})/0.12)`, color: `hsl(var(--${m.tone}))` }}><m.icon size={14} /></span>
                </div>
                <div className="relative flex items-end justify-between gap-2">
                  <span className="font-display text-[34px] font-extrabold leading-none tabular-nums text-foreground">{m.val}</span>
                  <span className="inline-flex items-center gap-1 text-right text-[10px] font-bold"
                    style={{ color: m.up ? 'hsl(var(--muted-foreground))' : 'hsl(var(--destructive))' }}>
                    {m.key === 'done' && (m.up ? <ArrowUpRight size={11} className="text-primary" /> : <ArrowDownRight size={11} className="text-destructive" />)}
                    {m.delta}
                  </span>
                </div>
                <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-border/60">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(6, Math.min(100, m.bar))}%`, background: `linear-gradient(90deg, hsl(var(--${m.tone})/0.5), hsl(var(--${m.tone})))` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="relative overflow-hidden rounded-[22px] border border-border/50 bg-gradient-to-b from-secondary/25 to-transparent p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                <TrendingUp size={11} /> {peakIndex >= 0 ? `Peak ${maxWave} task${maxWave === 1 ? '' : 's'}` : 'Complete a task to start your curve'}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">{rangeCompleted} completed · {periodLabel}</span>
            </div>
            <MomentumChart data={taskWave} />
            <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Earlier</span><span>Today</span>
            </div>
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
              <input value={taskSearch} onChange={e => setTaskSearch(e.target.value)} placeholder="Search tasks..." className="pl-9 pr-3 py-2 rounded-2xl bg-secondary text-[12px] text-foreground placeholder:text-muted-foreground/60 outline-none w-40 sm:w-52 focus:ring-2 focus:ring-primary/30" />
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
                    <button key={t.id} onClick={() => setEditingTaskId(t.id)}
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
                <button key={t.id} {...fu(i)} className="flex w-full items-center gap-3 p-3 text-left rounded-2xl hover:bg-secondary/50 transition" onClick={() => setEditingTaskId(t.id)}>
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
                </button>
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

      {/* ═══ PORTFOLIO SEO PULSE ═══ */}
      <div {...fu(15)} className="enterprise-card rounded-[28px] p-6 sm:p-7">
        <SectionTitle title="Portfolio SEO pulse" sub={`${seoEvidenceSiteIds.size}/${websites.length} sites have observations · ${seoOpenIssues.length} open issues · ${seoOpenActions.length} open actions`} onAction={() => setActiveSection('seo')} actionLabel="Open control center" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Evidence coverage', value: `${seoEvidenceSiteIds.size}/${websites.length}`, detail: 'Sites with imported snapshots', tone: 'sky' as const },
            { label: 'Connected profiles', value: `${seoConnectedProfiles}`, detail: 'Profiles marked connected', tone: 'emerald' as const },
            { label: 'Open issues', value: `${seoOpenIssues.length}`, detail: 'Needs triage or validation', tone: 'rose' as const },
            { label: 'Next actions', value: `${seoOpenActions.length}`, detail: 'Bounded work in queue', tone: 'amber' as const },
          ].map((metric) => {
            const h = HUES[metric.tone];
            return <button key={metric.label} onClick={() => setActiveSection('seo')} className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-left transition hover:border-primary/25 hover:bg-secondary/50"><div className="text-2xl font-extrabold tabular-nums" style={{ color: h.ink }}>{metric.value}</div><div className="mt-1 text-[11px] font-bold text-foreground">{metric.label}</div><div className="mt-1 text-[10px] text-muted-foreground">{metric.detail}</div></button>;
          })}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-bold text-foreground"><ListChecks size={14} className="text-primary" /> Highest-priority next actions</div>{seoNextActions.length === 0 ? <div className="text-[11px] leading-5 text-muted-foreground">No actions have been approved yet. Open the control center to import evidence or define the next bounded test.</div> : <div className="space-y-2">{seoNextActions.map((action) => <button key={action.id} onClick={() => setActiveSection('seo')} className="flex w-full items-center gap-2 rounded-xl bg-background/50 p-2.5 text-left transition hover:bg-background"><span className={`h-2 w-2 rounded-full ${action.priority === 'critical' ? 'bg-rose-500' : action.priority === 'high' ? 'bg-amber-500' : 'bg-sky-500'}`} /><span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">{action.title}</span><ChevronRight size={12} className="shrink-0 text-muted-foreground" /></button>)}</div>}</div>
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-bold text-foreground"><Activity size={14} className="text-emerald-500" /> Evidence discipline</div><p className="text-[11px] leading-5 text-muted-foreground">The pulse never invents clicks, rankings, traffic, or AI citations. It shows what is actually observed, what is stale, and what still needs a connector or verified import.</p><button onClick={() => setActiveSection('seo')} className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">Review data health <ArrowUpRight size={12} /></button></div>
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
      <TaskQuickEditor task={editingTask} onClose={() => setEditingTaskId(null)} />
    </div>
  );
});

export default DashboardHome;
