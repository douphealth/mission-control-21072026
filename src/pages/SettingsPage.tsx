import { useUpdateData, useExportAllData, useImportAllData } from "@/hooks/useTableData";
import { useSettingsStore } from "@/stores/settingsStore";
import { useState, useRef, useEffect, forwardRef } from "react";
import {
  Moon,
  Sun,
  Leaf,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Database,
  Palette,
  User,
  Shield,
  Info,
  Cloud,
  Copy,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Key,
  ExternalLink,
  ChevronRight,
  Terminal,
  ArrowUpDown,
  Sliders,
  Accessibility,
  Plug,
  ArrowDown,
  ArrowUp,
  Monitor,
  Calendar,
  CloudOff,
  Check,
  X,
  KeyRound,
} from "lucide-react";
import { useGoogleReady } from "@/hooks/useGoogleReady";
import { GoogleSetupModal } from "@/components/dashboard/GoogleSetupModal";
import { generateStrongKey, setEncryptionKey, hasCustomEncryptionKey } from "@/lib/encryption";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { setGCalConfig } from "@/lib/googleCalendar";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import PlanningSettings from "@/components/PlanningSettings";
import ConnectionsPanel from "@/components/ConnectionsPanel";

import { toast } from "sonner";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
  { id: "connections", label: "Connections", icon: Plug },
  { id: "google-calendar", label: "Google Calendar", icon: Calendar },
  { id: "security", label: "Security", icon: Shield },
  { id: "data", label: "Data", icon: Database },
  { id: "about", label: "About", icon: Info },
];

const themes = [
  { id: "sage", label: "Sage", icon: Leaf },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const CopyButton = forwardRef<HTMLButtonElement, { text: string }>(function CopyButton(
  { text },
  ref,
) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      ref={ref}
      onClick={copy}
      className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
    >
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

  // Google Calendar — direct OAuth via user's Client ID (Settings → Google Connection)
  const gcal = useGoogleCalendar({ autoFetch: false });
  const [googleSetupOpen, setGoogleSetupOpen] = useState(false);

  const connectGoogle = async () => {
    const result = await gcal.connect();
    if (!result.success) throw new Error(result.error || "Google connection failed");
    toast.success(result.email ? `Connected as ${result.email}` : "Google connected and synced");
  };

  // Security state
  const [encKey, setEncKey] = useState("");
  const [showEncKey, setShowEncKey] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(hasCustomEncryptionKey());

  useEffect(() => {
    setName(userName);
  }, [userName]);
  useEffect(() => {
    setRole(userRole);
  }, [userRole]);

  const saveName = () => updateData({ userName: name, userRole: role });

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const parsed = JSON.parse(data);
      const totalItems = parsed._meta?.totalItems || "all";
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
        const hasKnownKeys = ["websites", "tasks", "repos", "links", "notes"].some((k) =>
          Array.isArray(parsed[k]),
        );
        if (!hasKnownKeys) {
          toast.error("This doesn't look like a Mission Control backup file.");
          return;
        }
        await importAllData(json);
        toast.success("Backup imported successfully");
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        toast.error("Invalid file or import failed. Make sure it's a valid JSON backup.");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = "";
  };

  const handleClearAll = async () => {
    if (confirmDelete !== "DELETE") return;
    localStorage.clear();
    const req = indexedDB.deleteDatabase("MissionControlDB");
    req.onsuccess = () => {
      window.location.reload();
    };
    toast.success("All data cleared");
  };

  const handleGenerateEncKey = () => {
    const key = generateStrongKey();
    setEncKey(key);
  };

  const handleSaveEncKey = () => {
    if (!encKey.trim()) {
      toast.error("Enter an encryption key");
      return;
    }
    setEncryptionKey(encKey.trim());
    setHasCustomKey(true);
    toast.success("Encryption key saved");
  };

  const fadeIn = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25 },
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Manage your Mission Control preferences, data, and security
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar nav — horizontal scroll on mobile */}
        <div className="lg:w-52 flex lg:flex-col gap-1 overflow-x-auto hide-scrollbar pb-1 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap lg:w-full text-left flex-shrink-0
                ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
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
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                          Display Name
                        </label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onBlur={saveName}
                          className="input-base"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                          Role / Title
                        </label>
                        <input
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
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
                    <label className="text-xs font-semibold text-muted-foreground mb-3 block">
                      Theme
                    </label>
                    <div className="flex gap-2">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id as any)}
                          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                            theme === t.id
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

            {activeTab === "accessibility" && (
              <div key="accessibility" {...fadeIn}>
                <AccessibilityPanel />
                <div className="mt-4">
                  <PlanningSettings />
                </div>
              </div>
            )}

            {activeTab === "connections" && (
              <div key="connections" {...fadeIn}>
                <ConnectionsPanel />
              </div>
            )}

            {/* ─── Google Calendar ─── */}
            {activeTab === "google-calendar" && (
              <div key="google-calendar" {...fadeIn} className="space-y-4">
                {/* Status Banner */}
                <div
                  className={`rounded-2xl border p-4 flex items-center gap-3 ${
                    gcal.connected
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-blue-500/5 border-blue-500/20"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      gcal.connected ? "bg-emerald-500/15" : "bg-blue-500/15"
                    }`}
                  >
                    <img
                      src="https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png"
                      alt=""
                      className="w-6 h-6"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-semibold ${
                        gcal.connected
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {gcal.connected
                        ? "🟢 Google Calendar Connected"
                        : "⚡ Google Calendar Not Connected"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {gcal.connected
                        ? gcal.email
                          ? `Signed in as ${gcal.email}`
                          : "Connected — calendar, tasks, and app data are syncing"
                        : "Connect your Google Calendar to see all your events in Mission Control"}
                    </div>
                    {gcal.connected && gcal.lastSync && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Last sync: {new Date(gcal.lastSync).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {gcal.connected && (
                    <button
                      onClick={() => gcal.syncEvents(true)}
                      disabled={gcal.syncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors shrink-0"
                    >
                      {gcal.syncing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Sync Now
                    </button>
                  )}
                </div>

                {/* Connection Settings — direct OAuth, user's Client ID */}
                <div className="card-elevated p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-lg">Connection</h2>
                    <button
                      onClick={() => setGoogleSetupOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      <KeyRound size={12} /> Google setup
                    </button>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    {gcal.connected ? (
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={18} className="text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-sm font-semibold text-foreground">
                        {gcal.connected
                          ? "Connected to your Google account"
                          : "Google Calendar not connected"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {gcal.connected
                          ? "Your calendar, Google Tasks, and private Mission Control backup use this Google account across devices."
                          : "Sign in once to synchronize Calendar, Google Tasks, and a private Mission Control backup across your devices."}
                      </div>
                      {gcal.email && (
                        <div className="text-xs text-muted-foreground">
                          Account: <span className="font-mono">{gcal.email}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        OAuth Client ID:{" "}
                        {googleReady ? (
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            configured
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">not set</span>
                        )}
                      </div>
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
                      onClick={() => {
                        if (!googleReady) {
                          setGoogleSetupOpen(true);
                          return;
                        }
                        void connectGoogle().catch((error) => toast.error(error.message));
                      }}
                      disabled={gcal.connecting || gcal.syncing}
                      className="btn-primary text-sm gap-2"
                    >
                      {gcal.connecting || gcal.syncing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      {gcal.connected ? "Sync Now" : "Connect Google"}
                    </button>
                  </div>
                </div>

                {/* Calendar Picker */}
                {gcal.calendars.length > 0 && (
                  <div className="card-elevated p-6 space-y-4">
                    <h2 className="font-semibold text-lg">Calendars</h2>
                    <p className="text-xs text-muted-foreground">
                      Choose which calendars to show in Mission Control
                    </p>
                    <div className="space-y-2">
                      {gcal.calendars.map((cal) => {
                        const enabled = gcal.enabledCalendarIds.includes(cal.id);
                        return (
                          <button
                            key={cal.id}
                            onClick={() => gcal.toggleCalendar(cal.id)}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-left ${
                              enabled
                                ? "border-primary/30 bg-primary/5"
                                : "border-border/30 hover:border-border/60 hover:bg-secondary/30"
                            }`}
                          >
                            <div
                              className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
                              style={{
                                background: enabled
                                  ? cal.backgroundColor || "#039BE5"
                                  : "transparent",
                                border: `2px solid ${cal.backgroundColor || "#039BE5"}`,
                              }}
                            >
                              {enabled && <Check size={10} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">
                                {cal.summary}
                              </div>
                              {cal.primary && (
                                <span className="text-[10px] text-primary font-medium">
                                  Primary
                                </span>
                              )}
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
                      <div className="text-xs text-muted-foreground">
                        Automatically refresh events every 5 minutes
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        gcal.setAutoSync(!gcal.autoSync);
                        toast.success(gcal.autoSync ? "Auto-sync disabled" : "Auto-sync enabled");
                      }}
                      className={`relative w-12 h-6 rounded-full transition-colors ${gcal.autoSync ? "bg-primary" : "bg-secondary"}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${gcal.autoSync ? "translate-x-6" : ""}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Google OAuth setup (reachable from the Google Calendar tab) */}
            {activeTab === "google-calendar" && (
              <GoogleSetupModal
                open={googleSetupOpen}
                onClose={() => setGoogleSetupOpen(false)}
                onConnect={connectGoogle}
              />
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
                    Your credential vault passwords and API keys are encrypted using AES-256. Set a
                    custom master key below for enhanced security. Keep it safe — you'll need it to
                    decrypt your data.
                  </p>
                  <div
                    className={`rounded-xl p-3 ${hasCustomKey ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"} text-sm font-medium flex items-center gap-2`}
                  >
                    {hasCustomKey ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    {hasCustomKey
                      ? "Custom encryption key is set"
                      : "A strong device key was generated automatically. Save a custom key if you need portable vault recovery."}
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground block">
                      Encryption Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={encKey}
                        onChange={(e) => setEncKey(e.target.value)}
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
                      <button
                        onClick={handleGenerateEncKey}
                        className="btn-secondary text-sm gap-2"
                      >
                        <RefreshCw size={13} /> Generate Key
                      </button>
                      <button
                        onClick={handleSaveEncKey}
                        disabled={!encKey}
                        className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
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
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                    >
                      <Download size={19} className="text-primary shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">Export All Data</div>
                        <div className="text-xs text-muted-foreground">
                          Download full JSON backup
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => importRef.current?.click()}
                      className="flex items-center gap-3 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                    >
                      <Upload size={19} className="text-primary shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">Import Data</div>
                        <div className="text-xs text-muted-foreground">
                          Restore from JSON backup
                        </div>
                      </div>
                    </button>
                    <input
                      ref={importRef}
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="card-elevated p-6 space-y-4 border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={17} className="text-destructive" />
                    <h2 className="font-semibold text-destructive">Danger Zone</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permanently deletes ALL data — websites, tasks, notes, credentials, settings.
                    This cannot be undone.
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground block">
                      Type "DELETE" to confirm:
                    </label>
                    <input
                      value={confirmDelete}
                      onChange={(e) => setConfirmDelete(e.target.value)}
                      placeholder="DELETE"
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
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg">
                      M
                    </div>
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
                      { label: "Storage", value: "Private local database — no account required" },
                      { label: "Encryption", value: "AES-256-GCM via Web Crypto" },
                      { label: "Layout", value: "react-grid-layout — Drag & Drop" },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                      >
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
