import { useWebsites } from '@/hooks/useTableData';
import { useEffect, useMemo, useState } from 'react';
import {
  Globe, Activity, Shield, Puzzle, Palette, Search, Users, FileText,
  CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw, Key, ExternalLink,
  Lock, Unlock, Eye, EyeOff, Zap, ArrowLeft, Server, Clock, Gauge, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigationStore } from '@/stores/navigationStore';
import {
  loadCreds, setCred, clearCred, normalizeUrl,
  checkHealth, checkSeo,
  fetchPlugins, fetchThemes, fetchUsers, fetchPostsCount, fetchPagesCount, fetchCommentsCount,
  setPluginStatus,
  type HealthResult, type SeoResult, type WpPlugin, type WpTheme,
} from '@/lib/wpClient';

// ─── Types ──────────────────────────────────────────────────────────────────

type SiteStatus = {
  health?: HealthResult;
  seo?: SeoResult;
  plugins?: WpPlugin[];
  themes?: WpTheme[];
  users?: any[];
  counts?: { posts: number; pages: number; comments: number };
  loading?: boolean;
  authError?: string;
  lastChecked?: string;
};

type Tab = 'overview' | 'health' | 'plugins' | 'themes' | 'security' | 'seo' | 'content';

// ─── Helpers ────────────────────────────────────────────────────────────────

const Score = ({ value, label }: { value: number; label: string }) => {
  const color = value >= 80 ? 'text-emerald-500' : value >= 50 ? 'text-amber-500' : 'text-red-500';
  const bg = value >= 80 ? 'bg-emerald-500/10' : value >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10';
  return (
    <div className={`p-3 rounded-xl ${bg} border border-border/30`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</div>
      <div className={`text-2xl font-extrabold ${color} mt-1`}>{value}</div>
    </div>
  );
};

const StatusPill = ({ ok, label }: { ok: boolean | null | undefined; label: string }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border ${
    ok === true ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
    ok === false ? 'bg-red-500/10 text-red-600 border-red-500/20' :
    'bg-muted text-muted-foreground border-border'
  }`}>
    {ok === true ? <CheckCircle2 size={11} /> : ok === false ? <XCircle size={11} /> : <Clock size={11} />}
    {label}
  </span>
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function WordPressManagementPage() {
  const websites = useWebsites();
  const { setActiveSection } = useNavigationStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [statuses, setStatuses] = useState<Record<string, SiteStatus>>({});
  const [credsMap, setCredsMap] = useState(loadCreds());
  const [showAuth, setShowAuth] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', appPassword: '' });
  const [revealPwd, setRevealPwd] = useState(false);

  // Filter to WP-related websites (those with wpAdminUrl OR all websites)
  const wpSites = useMemo(
    () => websites.filter(w => w.status !== 'archived'),
    [websites]
  );

  const selected = wpSites.find(w => w.id === selectedId) || null;
  const selectedCred = selected ? credsMap[selected.id] : null;
  const selectedStatus = selected ? statuses[selected.id] || {} : {};

  useEffect(() => {
    if (!selectedId && wpSites.length) setSelectedId(wpSites[0].id);
  }, [wpSites, selectedId]);

  useEffect(() => {
    if (selected && !selectedStatus.health && !selectedStatus.loading) {
      runQuickCheck(selected.id, selected.url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ─── Auth handlers ────────────────────────────────────────────

  const openAuth = () => {
    if (!selected) return;
    setAuthForm({ username: selectedCred?.username || selected.wpUsername || '', appPassword: selectedCred?.appPassword || '' });
    setShowAuth(true);
  };

  const saveAuth = () => {
    if (!selected) return;
    if (!authForm.username || !authForm.appPassword) {
      toast.error('Username and Application Password required');
      return;
    }
    setCred(selected.id, authForm.username, authForm.appPassword);
    setCredsMap(loadCreds());
    setShowAuth(false);
    toast.success('Credentials saved locally');
    runFullCheck(selected.id, selected.url);
  };

  const removeAuth = () => {
    if (!selected) return;
    clearCred(selected.id);
    setCredsMap(loadCreds());
    setStatuses(s => ({ ...s, [selected.id]: { ...s[selected.id], plugins: undefined, themes: undefined, users: undefined, counts: undefined } }));
    toast.success('Credentials cleared');
  };

  // ─── Check runners ─────────────────────────────────────────────

  async function runQuickCheck(id: string, url: string) {
    setStatuses(s => ({ ...s, [id]: { ...s[id], loading: true } }));
    const [health, seo] = await Promise.all([checkHealth(url), checkSeo(url)]);
    setStatuses(s => ({ ...s, [id]: { ...s[id], health, seo, loading: false, lastChecked: new Date().toISOString() } }));
  }

  async function runFullCheck(id: string, url: string) {
    const cred = loadCreds()[id];
    setStatuses(s => ({ ...s, [id]: { ...s[id], loading: true, authError: undefined } }));

    const [health, seo] = await Promise.all([checkHealth(url), checkSeo(url)]);
    let next: SiteStatus = { ...statuses[id], health, seo, loading: true, lastChecked: new Date().toISOString() };
    setStatuses(s => ({ ...s, [id]: next }));

    if (cred?.username && cred?.appPassword) {
      try {
        const [plugins, themes, users, posts, pages, comments] = await Promise.all([
          fetchPlugins(url, cred).catch((e) => { throw new Error('Plugins: ' + e.message); }),
          fetchThemes(url, cred).catch(() => []),
          fetchUsers(url, cred).catch(() => []),
          fetchPostsCount(url, cred).catch(() => 0),
          fetchPagesCount(url, cred).catch(() => 0),
          fetchCommentsCount(url, cred).catch(() => 0),
        ]);
        next = { ...next, plugins, themes, users, counts: { posts, pages, comments }, loading: false };
        setStatuses(s => ({ ...s, [id]: next }));
        toast.success('All checks complete');
      } catch (e: any) {
        next = { ...next, loading: false, authError: e.message };
        setStatuses(s => ({ ...s, [id]: next }));
        toast.error('Auth check failed: ' + e.message);
      }
    } else {
      setStatuses(s => ({ ...s, [id]: { ...next, loading: false } }));
    }
  }

  async function checkAllSites() {
    toast.info(`Running checks on ${wpSites.length} sites...`);
    for (const site of wpSites) {
      // eslint-disable-next-line no-await-in-loop
      await runQuickCheck(site.id, site.url);
    }
    toast.success('Bulk health check complete');
  }

  async function togglePlugin(pl: WpPlugin) {
    if (!selected || !selectedCred) return;
    const newStatus = pl.status === 'active' ? 'inactive' : 'active';
    try {
      await setPluginStatus(selected.url, selectedCred, pl.plugin, newStatus);
      toast.success(`${pl.name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      runFullCheck(selected.id, selected.url);
    } catch (e: any) {
      toast.error('Failed: ' + e.message);
    }
  }

  // ─── Score calculations ────────────────────────────────────────

  const scores = useMemo(() => {
    const h = selectedStatus.health;
    const s = selectedStatus.seo;
    const p = selectedStatus.plugins;
    let health = 0, seo = 0, security = 0;
    if (h?.reachable) health += 50;
    if (h?.protocol === 'https') health += 25;
    if (h?.isWordPress) health += 15;
    if (h?.responseMs && h.responseMs < 1500) health += 10;

    if (s?.hasSitemap) seo += 30;
    if (s?.hasRobots) seo += 20;
    if (s?.title) seo += 20;
    if (s?.description) seo += 15;
    if (s?.ogTitle) seo += 8;
    if (s?.canonical) seo += 7;

    if (h?.protocol === 'https') security += 40;
    if (p) {
      const updates = p.filter(x => x.update && x.update !== 'none').length;
      security += updates === 0 ? 40 : Math.max(0, 40 - updates * 10);
      const inactive = p.filter(x => x.status === 'inactive').length;
      security += inactive < 5 ? 20 : 10;
    } else if (h?.isWordPress) {
      security += 20; // unknown plugin state
    }

    return { health: Math.min(100, health), seo: Math.min(100, seo), security: Math.min(100, security) };
  }, [selectedStatus]);

  const pluginUpdates = selectedStatus.plugins?.filter(p => p.update && p.update !== 'none') || [];

  // ─── Render ────────────────────────────────────────────────────

  if (!wpSites.length) {
    return (
      <div className="text-center py-20">
        <Globe size={48} className="mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No websites yet</h2>
        <p className="text-muted-foreground mt-2">Add a website in My Websites to manage it here.</p>
        <button onClick={() => setActiveSection('websites')} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold">
          Go to My Websites
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveSection('websites')} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Zap className="text-primary" size={22} />
              WordPress Management
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Health, plugins, security & SEO across all your WP sites — powered by REST API + Application Passwords.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const n = await deduplicateTable('websites');
              toast.success(n > 0 ? `Merged ${n} duplicate site${n === 1 ? '' : 's'}` : 'No duplicates found');
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold"
          >
            <Activity size={14} /> Merge duplicates
          </button>
          <button
            onClick={checkAllSites}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
          >
            <Activity size={14} /> Check All Sites
          </button>
        </div>

      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* ─── Site list ─── */}
        <aside className="col-span-12 lg:col-span-3 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">
            Websites ({wpSites.length})
          </div>
          {wpSites.map(site => {
            const st = statuses[site.id];
            const active = site.id === selectedId;
            return (
              <button
                key={site.id}
                onClick={() => setSelectedId(site.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                  active ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' : 'bg-card border-border/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm truncate">{site.name}</div>
                  {st?.loading ? <Loader2 size={12} className="animate-spin text-muted-foreground" /> :
                    st?.health?.reachable ? <span className="w-2 h-2 rounded-full bg-emerald-500" /> :
                    st?.health ? <span className="w-2 h-2 rounded-full bg-red-500" /> : null}
                </div>
                <div className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                  {site.url.replace(/^https?:\/\//, '')}
                </div>
              </button>
            );
          })}
        </aside>

        {/* ─── Main panel ─── */}
        <main className="col-span-12 lg:col-span-9 space-y-4">
          {selected && (
            <>
              {/* Site header */}
              <div className="bg-card border border-border/30 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{selected.name}</h2>
                      <a href={normalizeUrl(selected.url)} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{selected.url}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedCred ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold border border-emerald-500/20">
                          <Lock size={11} /> Authenticated
                        </span>
                        <button onClick={openAuth} className="px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-muted">
                          <Key size={12} className="inline mr-1" /> Update
                        </button>
                        <button onClick={removeAuth} className="px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          Clear
                        </button>
                      </>
                    ) : (
                      <button onClick={openAuth} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                        <Unlock size={12} /> Connect with App Password
                      </button>
                    )}
                    <button
                      onClick={() => runFullCheck(selected.id, selected.url)}
                      disabled={selectedStatus.loading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-muted disabled:opacity-50"
                    >
                      {selectedStatus.loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Run All Checks
                    </button>
                  </div>
                </div>

                {selectedStatus.authError && (
                  <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600">
                    <AlertTriangle size={12} className="inline mr-1" /> {selectedStatus.authError}
                  </div>
                )}

                {/* Score row */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <Score value={scores.health} label="Health" />
                  <Score value={scores.seo} label="SEO" />
                  <Score value={scores.security} label="Security" />
                </div>
              </div>

              {/* Auth modal */}
              {showAuth && (
                <div  className="fixed inset-0 z-50 bg-black/50 backdrop-blur flex items-center justify-center p-4" onClick={() => setShowAuth(false)}>
                  <div  className="bg-card rounded-2xl border border-border max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold mb-1 flex items-center gap-2"><Key size={16} /> WordPress Application Password</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Generate one in your WP admin → Users → Profile → Application Passwords. Stored locally in your browser only.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Username</label>
                        <input value={authForm.username} onChange={e => setAuthForm(f => ({ ...f, username: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border/30 text-sm outline-none focus:border-primary/50" placeholder="admin" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Application Password</label>
                        <div className="flex gap-1.5 mt-1">
                          <input type={revealPwd ? 'text' : 'password'} value={authForm.appPassword} onChange={e => setAuthForm(f => ({ ...f, appPassword: e.target.value }))}
                            className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border/30 text-sm font-mono outline-none focus:border-primary/50" placeholder="xxxx xxxx xxxx xxxx" />
                          <button onClick={() => setRevealPwd(r => !r)} className="px-2.5 rounded-lg bg-secondary border border-border/30">
                            {revealPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-5">
                      <button onClick={() => setShowAuth(false)} className="px-4 py-2 rounded-lg bg-secondary text-sm font-semibold">Cancel</button>
                      <button onClick={saveAuth} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2">
                        <Save size={14} /> Save & Test
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-border/30 overflow-x-auto">
                {([
                  ['overview', 'Overview', Activity],
                  ['health', 'Health', Gauge],
                  ['plugins', 'Plugins', Puzzle],
                  ['themes', 'Themes', Palette],
                  ['security', 'Security', Shield],
                  ['seo', 'SEO', Search],
                  ['content', 'Content', FileText],
                ] as const).map(([id, label, Icon]) => (
                  <button key={id} onClick={() => setTab(id as Tab)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                      tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}>
                    <Icon size={13} /> {label}
                    {id === 'plugins' && pluginUpdates.length > 0 && (
                      <span className="ml-1 text-[9px] font-bold bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full">{pluginUpdates.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* ─── Tab content ─── */}
              <div className="bg-card border border-border/30 rounded-2xl p-5">
                {tab === 'overview' && <OverviewTab status={selectedStatus} />}
                {tab === 'health' && <HealthTab status={selectedStatus} />}
                {tab === 'plugins' && <PluginsTab status={selectedStatus} hasAuth={!!selectedCred} onToggle={togglePlugin} />}
                {tab === 'themes' && <ThemesTab status={selectedStatus} hasAuth={!!selectedCred} />}
                {tab === 'security' && <SecurityTab status={selectedStatus} />}
                {tab === 'seo' && <SeoTab status={selectedStatus} />}
                {tab === 'content' && <ContentTab status={selectedStatus} hasAuth={!!selectedCred} />}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Tab components ──────────────────────────────────────────────────────────

function OverviewTab({ status }: { status: SiteStatus }) {
  const h = status.health;
  const s = status.seo;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Reachable" value={h?.reachable ? 'Yes' : 'No'} ok={!!h?.reachable} icon={Server} />
        <Stat label="Protocol" value={h?.protocol?.toUpperCase() || '-'} ok={h?.protocol === 'https'} icon={Lock} />
        <Stat label="Response" value={h?.responseMs ? `${h.responseMs} ms` : '-'} ok={h?.responseMs ? h.responseMs < 1500 : null} icon={Clock} />
        <Stat label="WordPress" value={h?.isWordPress ? `v${h?.wpVersion || '?'}` : 'Not detected'} ok={!!h?.isWordPress} icon={Globe} />
      </div>
      {status.counts && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Posts" value={status.counts.posts} icon={FileText} />
          <Stat label="Pages" value={status.counts.pages} icon={FileText} />
          <Stat label="Comments" value={status.counts.comments} icon={Users} />
        </div>
      )}
      <div className="text-[11px] text-muted-foreground">
        {status.lastChecked && <>Last checked: {new Date(status.lastChecked).toLocaleString()}</>}
      </div>
    </div>
  );
}

function HealthTab({ status }: { status: SiteStatus }) {
  const h = status.health;
  if (!h) return <Empty msg="Run health check to see results" />;
  return (
    <div className="space-y-3">
      <Row label="Site reachable" pill={<StatusPill ok={h.reachable} label={h.reachable ? 'Online' : 'Offline'} />} />
      <Row label="HTTP Status" value={h.status?.toString() || '—'} />
      <Row label="Response time" value={h.responseMs ? `${h.responseMs} ms` : '—'} />
      <Row label="HTTPS" pill={<StatusPill ok={h.protocol === 'https'} label={h.protocol.toUpperCase()} />} />
      <Row label="WordPress detected" pill={<StatusPill ok={h.isWordPress} label={h.isWordPress ? 'Yes' : 'No'} />} />
      {h.siteName && <Row label="Site name" value={h.siteName} />}
      {h.siteDescription && <Row label="Tagline" value={h.siteDescription} />}
      {h.error && <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700">⚠️ {h.error}</div>}
    </div>
  );
}

function PluginsTab({ status, hasAuth, onToggle }: { status: SiteStatus; hasAuth: boolean; onToggle: (p: WpPlugin) => void }) {
  if (!hasAuth) return <AuthRequired msg="Connect with an Application Password to manage plugins" />;
  if (!status.plugins) return <Empty msg="Run all checks to load plugins" />;
  const updates = status.plugins.filter(p => p.update && p.update !== 'none');
  return (
    <div className="space-y-4">
      {updates.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
            <AlertTriangle size={14} /> {updates.length} plugin update{updates.length > 1 ? 's' : ''} available
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        {status.plugins.map(p => (
          <div key={p.plugin} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20 hover:border-border/40 transition">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{p.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">v{p.version}</span>
                {p.update && p.update !== 'none' && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">Update available</span>
                )}
              </div>
              {p.author && <div className="text-[11px] text-muted-foreground mt-0.5">by {p.author}</div>}
            </div>
            <button onClick={() => onToggle(p)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                p.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-secondary text-muted-foreground hover:bg-muted'
              }`}>
              {p.status === 'active' ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemesTab({ status, hasAuth }: { status: SiteStatus; hasAuth: boolean }) {
  if (!hasAuth) return <AuthRequired msg="Connect with an Application Password to view themes" />;
  if (!status.themes) return <Empty msg="Run all checks to load themes" />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {status.themes.map(t => (
        <div key={t.stylesheet} className="p-3 rounded-xl bg-secondary/30 border border-border/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-sm">{t.name?.rendered || t.stylesheet}</div>
              <div className="text-[11px] text-muted-foreground font-mono">v{t.version || '?'}</div>
            </div>
            {t.status === 'active' && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">ACTIVE</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SecurityTab({ status }: { status: SiteStatus }) {
  const h = status.health;
  const updates = status.plugins?.filter(p => p.update && p.update !== 'none').length || 0;
  return (
    <div className="space-y-3">
      <Row label="HTTPS enabled" pill={<StatusPill ok={h?.protocol === 'https'} label={h?.protocol === 'https' ? 'Secure' : 'Insecure'} />} />
      <Row label="WordPress reachable via REST" pill={<StatusPill ok={h?.isWordPress} label={h?.isWordPress ? 'Detected' : 'Hidden / Unknown'} />} />
      <Row label="Plugins needing update" pill={<StatusPill ok={updates === 0} label={String(updates)} />} />
      <Row label="Inactive plugins (attack surface)"
        pill={<StatusPill ok={(status.plugins?.filter(p => p.status === 'inactive').length || 0) < 3} label={String(status.plugins?.filter(p => p.status === 'inactive').length || 0)} />} />
      <div className="p-3 rounded-xl bg-secondary/30 border border-border/20 text-xs text-muted-foreground space-y-1">
        <div className="font-bold text-foreground mb-1">Recommendations</div>
        {h?.protocol !== 'https' && <div>• Force HTTPS via your host or a plugin like Really Simple SSL</div>}
        {updates > 0 && <div>• Update {updates} outdated plugin{updates > 1 ? 's' : ''} immediately</div>}
        {(status.plugins?.filter(p => p.status === 'inactive').length || 0) >= 3 && <div>• Remove unused inactive plugins</div>}
        <div>• Use strong Application Passwords and rotate them regularly</div>
      </div>
    </div>
  );
}

function SeoTab({ status }: { status: SiteStatus }) {
  const s = status.seo;
  if (!s) return <Empty msg="Run all checks to see SEO data" />;
  return (
    <div className="space-y-3">
      <Row label="Sitemap" pill={<StatusPill ok={s.hasSitemap} label={s.hasSitemap ? 'Found' : 'Missing'} />}
        value={s.sitemapUrl} />
      <Row label="robots.txt" pill={<StatusPill ok={s.hasRobots} label={s.hasRobots ? 'Found' : 'Missing'} />} />
      <Row label="robots allows indexing" pill={<StatusPill ok={s.robotsAllowsAll} label={s.robotsAllowsAll === null ? '—' : s.robotsAllowsAll ? 'Yes' : 'Blocked'} />} />
      <Row label="Title" value={s.title || '—'} />
      <Row label="Meta description" value={s.description || '—'} />
      <Row label="Open Graph title" value={s.ogTitle || '—'} />
      <Row label="OG image" value={s.ogImage || '—'} />
      <Row label="Canonical URL" value={s.canonical || '—'} />
      {s.errors.length > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 space-y-1">
          {s.errors.map((e, i) => <div key={i}>⚠️ {e}</div>)}
        </div>
      )}
    </div>
  );
}

function ContentTab({ status, hasAuth }: { status: SiteStatus; hasAuth: boolean }) {
  if (!hasAuth) return <AuthRequired msg="Connect with an Application Password to load content stats" />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Posts" value={status.counts?.posts ?? '—'} icon={FileText} />
        <Stat label="Pages" value={status.counts?.pages ?? '—'} icon={FileText} />
        <Stat label="Comments" value={status.counts?.comments ?? '—'} icon={Users} />
      </div>
      {status.users && (
        <div>
          <div className="text-xs font-bold mb-2">Users ({status.users.length})</div>
          <div className="space-y-1.5">
            {status.users.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/20">
                <div>
                  <div className="text-sm font-semibold">{u.name}</div>
                  <div className="text-[10px] text-muted-foreground">{u.slug}</div>
                </div>
                <div className="flex gap-1">
                  {(u.roles || []).map((r: string) => (
                    <span key={r} className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{r}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small UI primitives ────────────────────────────────────────────────────

function Stat({ label, value, ok, icon: Icon }: { label: string; value: any; ok?: boolean | null; icon?: any }) {
  return (
    <div className="p-3 rounded-xl bg-secondary/30 border border-border/20">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        {Icon && <Icon size={11} />} {label}
      </div>
      <div className={`text-lg font-bold mt-1 ${ok === true ? 'text-emerald-500' : ok === false ? 'text-red-500' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, pill }: { label: string; value?: string; pill?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/20 last:border-0">
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="text-xs text-foreground text-right truncate max-w-[60%]">
        {pill || value}
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-center py-10 text-sm text-muted-foreground">{msg}</div>;
}

function AuthRequired({ msg }: { msg: string }) {
  return (
    <div className="text-center py-10">
      <Lock size={32} className="mx-auto text-muted-foreground mb-3" />
      <div className="text-sm font-semibold">{msg}</div>
      <div className="text-xs text-muted-foreground mt-1">Click "Connect with App Password" above</div>
    </div>
  );
}
