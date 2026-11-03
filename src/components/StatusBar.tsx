import { useState, useEffect } from "react";
import { WifiOff, Database, Check, Loader2, AlertCircle, Cloud, CloudOff } from "lucide-react";
import { onSaveStatus } from "@/stores/dataStore";
import { onCloudStatus, type CloudStatus } from "@/lib/cloudSync";
import { readBuildInfo, type BuildInfo } from "@/lib/buildInfo";

export default function StatusBar() {
  const [online, setOnline] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("signed-out");
  const [build, setBuild] = useState<BuildInfo | null>(null);
  const [buildChecked, setBuildChecked] = useState(false);
  const [shortcut, setShortcut] = useState("Ctrl K");

  useEffect(() => {
    setOnline(navigator.onLine);
    setShortcut(/Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘K" : "Ctrl K");
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => onCloudStatus((next) => setCloudStatus(next)), []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    let mounted = true;
    void readBuildInfo(controller.signal).then((info) => {
      if (mounted) {
        setBuild(info);
        setBuildChecked(true);
      }
      window.clearTimeout(timeout);
    });
    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onSaveStatus((status) => {
      if (timer) clearTimeout(timer);
      setSaveStatus(status);
      if (status === "saved") {
        timer = setTimeout(() => setSaveStatus("idle"), 3000);
      }
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <footer className="mc-statusbar enterprise-panel hidden lg:flex shrink-0 border-x-0 border-b-0 rounded-none shadow-none px-5 h-9 items-center justify-between text-[11px] text-muted-foreground/70">
      <div className="flex items-center gap-4">
        {online ? (
          <span className="flex items-center gap-1.5 text-success font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            Online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-destructive font-medium animate-pulse">
            <WifiOff size={11} /> Offline
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground/40">
          <Database size={10} /> Device storage
        </span>
        <span className="flex items-center gap-1 text-muted-foreground/50">
          {cloudStatus === "signed-out" ? <CloudOff size={10} /> : <Cloud size={10} />}
          {cloudStatus === "synced"
            ? "Google synced"
            : cloudStatus === "syncing"
              ? "Google syncing"
              : cloudStatus === "error"
                ? "Sync needs attention"
                : "Local only"}
        </span>
        {saveStatus === "saving" && (
          <span className="flex items-center gap-1 text-amber-500/70 animate-pulse">
            <Loader2 size={10} className="animate-spin" /> Saving…
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="flex items-center gap-1 text-success/70">
            <Check size={10} /> Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="flex items-center gap-1 text-destructive/70">
            <AlertCircle size={10} /> Save error
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <kbd className="text-[10px] text-muted-foreground/30 bg-secondary/40 px-1.5 py-0.5 rounded font-mono border border-border/20">
          {shortcut}
        </kbd>
        <span
          className="font-medium text-muted-foreground/65"
          title={
            build
              ? `Deployment manifest · ${build.commit} · Built ${new Date(build.builtAt).toLocaleString()}`
              : "A deployment version is shown only when its generated manifest is available."
          }
        >
          {build
            ? `Deployment ${build.commit.slice(0, 7)}`
            : buildChecked
              ? "Build unavailable"
              : "Checking build…"}
        </span>
      </div>
    </footer>
  );
}
