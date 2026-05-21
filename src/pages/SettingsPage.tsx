import { useUpdateData, useExportAllData, useImportAllData } from '@/hooks/useTableData';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState, useRef, useEffect, forwardRef } from "react";
import {
  Moon, Sun, Download, Upload, Trash2, AlertTriangle, Database, Palette,
  User, Shield, Info, Cloud, Copy, CheckCircle2, XCircle, RefreshCw,
  Loader2, Key, ExternalLink, ChevronRight, Terminal, ArrowUpDown, Sliders,
  Plug, ArrowDown, ArrowUp, Monitor, Calendar, CloudOff, Check, X
} from "lucide-react";
import {
  getSupabaseConfig, setSupabaseConfig, clearSupabaseConfig,
  testSupabaseConnection, pullFromSupabase, fullSync,
  isSupabaseConnected, SUPABASE_SCHEMA_SQL, getLastSyncTime, refreshSupabaseSchemaState
} from "@/lib/supabase";
import { generateStrongKey, setEncryptionKey, hasCustomEncryptionKey } from "@/lib/encryption";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { setGCalConfig } from "@/lib/googleCalendar";
import SupabaseSyncConsole from "@/components/SupabaseSyncConsole";

import { toast } from "sonner";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "google-calendar", label: "Google Calendar", icon: Calendar },
  { id: "supabase", label: "Cloud Sync", icon: Cloud },
  { id: "security", label: "Security", icon: Shield },
  { id: "data", label: "Data", icon: Database },
  { id: "about", label: "About", icon: Info },
];

const themes = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const CopyButton = forwardRef<HTMLButtonElement, { text: string }>(function CopyButton({ text }, ref) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button ref={ref} onClick={copy} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
});

export default function SettingsPage() {
  const { userName, userRole, theme, setTheme, toggleTheme } = useSettingsStore();
  const updateData = useUpdateData();
  const exportAllData = useExportAllData();
  const importAllData = useImportAllData();
  const [activeTab, setActiveTab] = useState("profile");
  const [name, setName] = useState(userName);
  const [role, setRole] = useState(userRole);
  const [confirmDelete, setConfirmDelete] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  // Google Calendar — auth is handled server-side via the Lovable connector.
  const gcal = useGoogleCalendar({ autoFetch: false });

  // Supabase state
  const [sbUrl, setSbUrl] = useState(getSupabaseConfig()?.url || "");
  const [sbKey, setSbKey] = useState(getSupabaseConfig()?.anonKey || "");
  const [sbConnected, setSbConnected] = useState(isSupabaseConnected());
  const [sbTesting, setSbTesting] = useState(false);
  const [sbTestResult, setSbTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sbSyncing, setSbSyncing] = useState<null | 'sync' | 'refresh'>(null);
  const [sbLastSync, setSbLastSync] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const [sbSchemaReady, setSbSchemaReady] = useState(false);
  const [sbConnectionOk, setSbConnectionOk] = useState(false);

  // Security state
  const [encKey, setEncKey] = useState("");
  const [showEncKey, setShowEncKey] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(hasCustomEncryptionKey());

  const refreshSchemaStatus = async () => {
    refreshSupabaseSchemaState();
    const result = await testSupabaseConnection(sbUrl, sbKey);
    setSbConnectionOk(result.connectionOk);
    setSbSchemaReady(result.schemaReady);
    return result;
  };

  useEffect(() => {
    if (sbConnected) {
      getLastSyncTime().then(setSbLastSync);
      refreshSchemaStatus().catch(() => setSbSchemaReady(false));
    }
  }, [sbConnected]);

  useEffect(() => { setName(userName); }, [userName]);
  useEffect(() => { setRole(userRole); }, [userRole]);

  const saveName = () => updateData({ userName: name, userRole: role });

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const parsed = JSON.parse(data);
      const totalItems = parsed._meta?.totalItems || 'all';
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `mission-control-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Backup downloaded — ${totalItems} items across all tables`);
    } catch (e) {
      toast.error("Export failed. Please try again.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = ev.target?.result as string;
        const parsed = JSON.parse(json);
        // Validate it's a Mission Control backup
        const hasKnownKeys = ['websites', 'tasks', 'repos', 'links', 'notes'].some(k => Array.isArray(parsed[k]));
        if (!hasKnownKeys) {
          toast.error("This doesn't look like a Mission Control backup file.");
          return;
        }
        await importAllData(json);
        if (isSupabaseConnected()) {
          toast.info("Syncing imported data to cloud…");
          const result = await fullSync();
          if (result.success) {
            toast.success(`Import complete — pushed ${result.pushed} items to cloud`);
          } else {
            toast.warning("Imported locally but cloud sync failed. Will retry automatically.");
          }
        } else {
          toast.success("Backup imported successfully");
        }
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        toast.error("Invalid file or import failed. Make sure it's a valid JSON backup.");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  };

  const handleClearAll = async () => {
    if (confirmDelete !== "DELETE") return;
    localStorage.clear();
    const req = indexedDB.deleteDatabase("MissionControlDB");
    req.onsuccess = () => { window.location.reload(); };
    toast.success("All data cleared");
  };

  // Supabase handlers
  const handleTestConnection = async () => {
    if (!sbUrl || !sbKey) { toast.error("Enter URL and anon key first"); return; }
    setSbTesting(true);
    setSbTestResult(null);
    const result = await refreshSchemaStatus();
    setSbTestResult({ ok: result.ok, msg: result.ok ? "Supabase connected and schema is ready." : result.error || "Connection failed" });
    setSbTesting(false);
  };

  const handleSaveSupabase = () => {
    if (!sbUrl || !sbKey) { toast.error("Both URL and anon key are required"); return; }
    setSupabaseConfig(sbUrl, sbKey);
    setSbConnected(true);
    setSbConnectionOk(false);
    setSbSchemaReady(false);
    toast.success("Supabase connection saved — testing schema now");
    refreshSchemaStatus().catch(() => setSbSchemaReady(false));
  };

  const handleDisconnectSupabase = () => {
    clearSupabaseConfig();
    setSbConnected(false);
    setSbConnectionOk(false);
    setSbSchemaReady(false);
    setSbLastSync(null);
    setSbTestResult(null);
    toast.info("Supabase disconnected");
  };

  const handleSyncNow = async () => {
    setSbSyncing('sync');
    refreshSupabaseSchemaState();
    const result = await fullSync();
    setSbSyncing(null);

    if (result.success) {
      toast.success(`✅ Synced ${result.pushed} pushed + ${result.pulled} pulled`);
      setSbLastSync(new Date().toISOString());
      return;
    }

    toast.error(`Sync failed: ${result.error}`);
  };

  const handleRefreshFromCloud = async () => {
    setSbSyncing('refresh');
    refreshSupabaseSchemaState();
    const result = await pullFromSupabase();
    setSbSyncing(null);

    if (result.success) {
      toast.success(`✅ Refreshed ${result.added} new + ${result.updated} updated items from cloud`);
      setSbLastSync(new Date().toISOString());
      return;
    }

    toast.error(`Refresh failed: ${result.error}`);
  };

  const handleGenerateEncKey = () => {
    const key = generateStrongKey();
    setEncKey(key);
  };

  const handleSaveEncKey = () => {
    if (!encKey.trim()) { toast.error("Enter an encryption key"); return; }
    setEncryptionKey(encKey.trim());
    setHasCustomKey(true);
    toast.success("Encryption key saved");
  };

  const fadeIn = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage your Mission Control preferences, sync, and security</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar nav — horizontal scroll on mobile */}
        <div className="lg:w-52 flex lg:flex-col gap-1 overflow-x-auto hide-scrollbar pb-1 lg:pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap lg:w-full text-left flex-shrink-0
                ${activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              <tab.icon size={15} />
              {tab.label}
              {activeTab === tab.id && <ChevronRight size={13} className="ml-auto opacity-60" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          <>
            {/* ─── Profile ─── */}
            {activeTab === "profile" && (
              <div key="profile" {...fadeIn} className="space-y-4">
                <div className="card-elevated p-6 space-y-5">
                  <h2 className="font-semibold text-lg">Profile</h2>
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-lg shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Display Name</label>
                        <input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          onBlur={saveName}
                          className="input-base"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Role / Title</label>
                        <input
                          value={role}
                          onChange={e => setRole(e.target.value)}
                          onBlur={saveName}
                          className="input-base"
                          placeholder="Digital Creator & Developer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Appearance ─── */}
            {activeTab === "appearance" && (
              <div key="appearance" {...fadeIn} className="space-y-4">
                <div className="card-elevated p-6 space-y-5">
                  <h2 className="font-semibold text-lg">Appearance</h2>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-3 block">Theme</label>
                    <div className="flex gap-2">
                      {themes.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id as any)}
                          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${theme === t.id
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                        >
                          <t.icon size={17} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Google Calendar ─── */}
            {activeTab === "google-calendar" && (
              <div key="google-calendar" {...fadeIn} className="space-y-4">
                {/* Status Banner */}
                <div className={`rounded-2xl border p-4 flex items-center gap-3 ${gcal.connected
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-blue-500/5 border-blue-500/20"
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${gcal.connected ? "bg-emerald-500/15" : "bg-blue-500/15"
                    }`}>
                    <img src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png" alt="" className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${gcal.connected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-blue-600 dark:text-blue-400"
                      }`}>
                      {gcal.connected ? "🟢 Google Calendar Connected" : "⚡ Google Calendar Not Connected"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {gcal.connected
                        ? gcal.email
                          ? `Signed in as ${gcal.email}`
                          : "Connected — events are syncing"
                        : "Connect your Google Calendar to see all your events in Mission Control"
                      }
                    </div>
                    {gcal.lastSync && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Last sync: {new Date(gcal.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {gcal.connected && (
                    <button onClick={() => gcal.syncEvents(true)} disabled={gcal.syncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors shrink-0">
                      {gcal.syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Sync Now
                    </button>
                  )}
                </div>

                {/* Connection Settings — connector-backed, zero config */}
                <div className="card-elevated p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Connection</h2>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    {gcal.connected ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" /> : <XCircle size={18} className="text-destructive shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-sm font-semibold text-foreground">{gcal.connected ? 'Connected via Lovable' : 'Google Calendar backend offline'}</div>
                      <div className="text-xs text-muted-foreground">
                        {gcal.connected
                          ? 'Google Calendar is authenticated server-side through the Lovable connector. No OAuth Client ID, popup, or Google Cloud Console setup is required.'
                          : 'The connector itself is valid, but this app cannot reach the Google Calendar backend endpoint yet. The missing piece is the deployed Supabase function, not your Google account.'}
                      </div>
                      {gcal.email && (
                        <div className="text-xs text-muted-foreground">Account: <span className="font-mono">{gcal.email}</span></div>
                      )}
                    </div>
                  </div>

                  {gcal.error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-destructive/10 text-destructive">
                      <XCircle size={15} />
                      {gcal.error}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={async () => {
                        const result = await gcal.connect();
                        if (result.success) {
                          toast.success(result.email ? `✅ Synced as ${result.email}` : '✅ Google Calendar synced');
                        } else {
                          toast.error(result.error || 'Sync failed');
                        }
                      }}
                      disabled={gcal.connecting || gcal.syncing}
                      className="btn-primary text-sm gap-2"
                    >
                      {gcal.connecting || gcal.syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Refresh & Sync Now
                    </button>
                  </div>
                </div>

                {/* Calendar Picker */}
                {gcal.calendars.length > 0 && (
                  <div className="card-elevated p-6 space-y-4">
                    <h2 className="font-semibold text-lg">Calendars</h2>
                    <p className="text-xs text-muted-foreground">Choose which calendars to show in Mission Control</p>
                    <div className="space-y-2">
                      {gcal.calendars.map(cal => {
                        const enabled = gcal.enabledCalendarIds.includes(cal.id);
                        return (
                          <button
                            key={cal.id}
                            onClick={() => gcal.toggleCalendar(cal.id)}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-left ${enabled
                              ? "border-primary/30 bg-primary/5"
                              : "border-border/30 hover:border-border/60 hover:bg-secondary/30"
                              }`}
                          >
                            <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
                              style={{ background: enabled ? (cal.backgroundColor || '#039BE5') : 'transparent', border: `2px solid ${cal.backgroundColor || '#039BE5'}` }}
                            >
                              {enabled && <Check size={10} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">{cal.summary}</div>
                              {cal.primary && <span className="text-[10px] text-primary font-medium">Primary</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Auto-sync */}
                <div className="card-elevated p-6 space-y-4">
                  <h2 className="font-semibold text-lg">Sync Settings</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">Auto-sync</div>
                      <div className="text-xs text-muted-foreground">Automatically refresh events every 5 minutes</div>
                    </div>
                    <button
                      onClick={() => {
                        gcal.setAutoSync(!gcal.autoSync);
                        toast.success(gcal.autoSync ? "Auto-sync disabled" : "Auto-sync enabled");
                      }}
                      className={`relative w-12 h-6 rounded-full transition-colors ${gcal.autoSync ? "bg-primary" : "bg-secondary"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${gcal.autoSync ? "translate-x-6" : ""}`} />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* ─── Supabase Sync ─── */}
            {activeTab === "supabase" && (
              <div key="supabase" {...fadeIn} className="space-y-4">
                {/* Status Banner */}
                <div className={`rounded-2xl border p-4 flex items-center gap-3 ${sbConnected ? (sbConnectionOk ? (sbSchemaReady ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20") : "bg-destructive/5 border-destructive/20") : "bg-amber-500/5 border-amber-500/20"
                  }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sbConnected ? (sbConnectionOk ? (sbSchemaReady ? "bg-emerald-500/15" : "bg-destructive/15") : "bg-destructive/15") : "bg-amber-500/15"
                    }`}>
                    <Cloud size={17} className={sbConnected ? (sbConnectionOk ? (sbSchemaReady ? "text-emerald-500" : "text-destructive") : "text-destructive") : "text-amber-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${sbConnected ? (sbConnectionOk ? (sbSchemaReady ? "text-emerald-600 dark:text-emerald-400" : "text-destructive") : "text-destructive") : "text-amber-600 dark:text-amber-400"}`}>
                      {sbConnected ? (sbConnectionOk ? (sbSchemaReady ? "🟢 Supabase Sync Ready" : "🛑 Supabase Schema Missing") : "🛑 Supabase Connection Error") : "⚡ Supabase Not Connected"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {sbConnected
                        ? sbConnectionOk
                          ? sbSchemaReady
                            ? sbLastSync
                              ? `Last sync: ${new Date(sbLastSync).toLocaleString()}`
                              : "Schema is ready — no sync has run yet"
                            : "Your Supabase project is reachable, but the Mission Control tables have not been created yet"
                          : "The project cannot be reached from this browser right now. Verify the URL/key or disconnect cloud sync."
                        : "Connect your Supabase project for multi-device sync & backup"
                      }
                    </div>
                  </div>
                  {sbConnected && (
                    <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-1 shrink-0">
                      Dashboard <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* Config */}
                <div className="card-elevated p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Connection Settings</h2>
                    {sbConnected && (
                      <button onClick={handleDisconnectSupabase} className="text-xs text-destructive hover:underline font-medium">
                        Disconnect
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Project URL</label>
                      <input
                        value={sbUrl}
                        onChange={e => setSbUrl(e.target.value)}
                        className="input-base font-mono text-xs"
                        placeholder="https://your-project.supabase.co"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Anon Key</label>
                      <input
                        value={sbKey}
                        onChange={e => setSbKey(e.target.value)}
                        type="password"
                        className="input-base font-mono text-xs"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      />
                    </div>
                  </div>

                  {sbTestResult && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${sbTestResult.ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                      }`}>
                      {sbTestResult.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      {sbTestResult.msg}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <button onClick={handleTestConnection} disabled={sbTesting} className="btn-secondary text-sm gap-2.5">
                      {sbTesting ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
                      Test Connection
                    </button>
                    <button onClick={handleSaveSupabase} className="btn-primary text-sm">
                      Save & Connect
                    </button>
                  </div>
                </div>

                {/* Cloud Sync Actions */}
                {sbConnected && (
                  <>
                  <SupabaseSyncConsole />
                  <div className="card-elevated p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-lg">Live Cloud Sync</h2>
                      <span className={`text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1 ${sbConnectionOk && sbSchemaReady ? "text-emerald-600 bg-emerald-500/10" : "text-destructive bg-destructive/10"}`}>
                        {sbConnectionOk && sbSchemaReady ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />} {sbConnectionOk && sbSchemaReady ? 'Auto-Save Active' : 'Blocked'}
                      </span>
                    </div>

                    <div className={`flex items-start gap-2 p-3 rounded-xl border ${sbConnectionOk && sbSchemaReady ? "bg-emerald-500/8 border-emerald-500/15" : "bg-destructive/5 border-destructive/20"}`}>
                      {sbConnectionOk && sbSchemaReady ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />}
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {sbConnectionOk && sbSchemaReady ? (
                          <><strong className="text-foreground">Always-on live sync.</strong> Changes are auto-saved to cloud and auto-refreshed on every device. Use Export/Import below only for version snapshots.</>
                        ) : !sbConnectionOk ? (
                          <><strong className="text-foreground">Sync is currently blocked.</strong> The saved cloud connection is failing at the network/auth level, so the schema checks are not reliable. Test the connection again, update the URL/key, or disconnect cloud sync to keep this device local-only.</>
                        ) : (
                          <><strong className="text-foreground">Sync is currently blocked.</strong> The console above is showing real Supabase errors because the required tables do not exist yet. Run the SQL schema below, then test again.</>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={handleSyncNow} disabled={!!sbSyncing || !sbConnectionOk || !sbSchemaReady}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all text-left group">
                        <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 transition-transform group-hover:scale-105">
                          {sbSyncing === 'sync' ? <Loader2 size={18} className="text-primary-foreground animate-spin" /> : <ArrowUpDown size={18} className="text-primary-foreground" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-foreground">Sync Now</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">Run immediate two-way sync (push + pull)</div>
                        </div>
                      </button>

                      <button onClick={handleRefreshFromCloud} disabled={!!sbSyncing || !sbConnectionOk || !sbSchemaReady}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/30 border-2 border-border/30 hover:border-border/60 hover:bg-secondary/50 transition-all text-left group">
                        <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                          {sbSyncing === 'refresh' ? <Loader2 size={18} className="text-foreground animate-spin" /> : <ArrowDown size={18} className="text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-foreground">Refresh From Cloud</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">Pull latest cloud changes to this device</div>
                        </div>
                      </button>
                    </div>

                    {sbLastSync && (
                      <div className="text-[11px] text-muted-foreground text-center">
                        Last cloud sync: {new Date(sbLastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                  </>
                )}

                {/* Schema */}
                <div className="card-elevated p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <Terminal size={16} className="text-muted-foreground" /> Database Schema
                    </h2>
                    <button onClick={() => setShowSchema(!showSchema)} className="text-xs font-medium text-primary hover:underline">
                      {showSchema ? "Hide" : "Show SQL"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    First time setup: Run this SQL in your Supabase SQL Editor to create all required tables.
                  </p>
                  {showSchema && (
                    <div className="relative">
                      <pre className="bg-secondary/50 rounded-xl p-4 text-[10px] font-mono text-muted-foreground overflow-auto max-h-60 leading-relaxed">
                        {SUPABASE_SCHEMA_SQL.trim()}
                      </pre>
                      <div className="absolute top-2 right-2">
                        <CopyButton text={SUPABASE_SCHEMA_SQL.trim()} />
                      </div>
                    </div>
                  )}
                  <a
                    href="https://supabase.com/dashboard/project/_/editor"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    Open SQL Editor <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            )}

            {/* ─── Security ─── */}
            {activeTab === "security" && (
              <div key="security" {...fadeIn} className="space-y-4">
                <div className="card-elevated p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <Key size={18} className="text-primary" />
                    <h2 className="font-semibold text-lg">Encryption Key</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your credential vault passwords and API keys are encrypted using AES-256.
                    Set a custom master key below for enhanced security. Keep it safe — you'll need it to decrypt your data.
                  </p>
                  <div className={`rounded-xl p-3 ${hasCustomKey ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"} text-sm font-medium flex items-center gap-2`}>
                    {hasCustomKey ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    {hasCustomKey ? "Custom encryption key is set" : "A strong device key was generated automatically. Save a custom key if you need portable vault recovery."}
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground block">Encryption Key</label>
                    <div className="flex gap-2">
                      <input
                        value={encKey}
                        onChange={e => setEncKey(e.target.value)}
                        type={showEncKey ? "text" : "password"}
                        className="input-base font-mono text-xs flex-1"
                        placeholder="Enter or generate a strong key..."
                      />
                      <button
                        onClick={() => setShowEncKey(!showEncKey)}
                        className="btn-secondary px-3 text-xs shrink-0"
                      >
                        {showEncKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleGenerateEncKey} className="btn-secondary text-sm gap-2">
                        <RefreshCw size={13} /> Generate Key
                      </button>
                      <button onClick={handleSaveEncKey} disabled={!encKey} className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                        Save Key
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Data ─── */}
            {activeTab === "data" && (
              <div key="data" {...fadeIn} className="space-y-4">
                <div className="card-elevated p-6 space-y-4">
                  <h2 className="font-semibold text-lg">Backup & Restore</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={handleExport} className="flex items-center gap-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left">
                      <Download size={19} className="text-primary shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">Export All Data</div>
                        <div className="text-xs text-muted-foreground">Download full JSON backup</div>
                      </div>
                    </button>
                    <button onClick={() => importRef.current?.click()} className="flex items-center gap-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left">
                      <Upload size={19} className="text-primary shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">Import Data</div>
                        <div className="text-xs text-muted-foreground">Restore from JSON backup</div>
                      </div>
                    </button>
                    <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </div>
                </div>

                <div className="card-elevated p-6 space-y-4 border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={17} className="text-destructive" />
                    <h2 className="font-semibold text-destructive">Danger Zone</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permanently deletes ALL data — websites, tasks, notes, credentials, settings. This cannot be undone.
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground block">Type "DELETE" to confirm:</label>
                    <input
                      value={confirmDelete}
                      onChange={e => setConfirmDelete(e.target.value)}
                      placeholder='DELETE'
                      className="input-base max-w-xs"
                    />
                    <button
                      onClick={handleClearAll}
                      disabled={confirmDelete !== "DELETE"}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      <Trash2 size={14} /> Delete All Data
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── About ─── */}
            {activeTab === "about" && (
              <div key="about" {...fadeIn} className="space-y-4">
                <div className="card-elevated p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg">M</div>
                    <div>
                      <h2 className="font-bold text-xl">Mission Control</h2>
                      <div className="badge-primary mt-1">v8.0 Enterprise</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Framework", value: "React 18 + TypeScript + Vite" },
                      { label: "Styling", value: "Tailwind CSS + Framer Motion" },
                      { label: "Storage", value: "IndexedDB (Dexie.js) — Offline-first" },
                      { label: "Cloud Sync", value: "Supabase (optional)" },
                      { label: "Encryption", value: "AES-256-GCM via Web Crypto" },
                      { label: "Layout", value: "react-grid-layout — Drag & Drop" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <span className="text-muted-foreground font-medium">{label}</span>
                        <span className="text-foreground font-semibold text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Built with ❤️ for infinite flexibility</span>
                    <span className="badge-muted">Open Source</span>
                  </div>
                </div>
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
}
