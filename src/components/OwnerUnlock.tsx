import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { readOwnerPasscode, saveOwnerPasscode } from "@/lib/ownerPasscode";

/** Lets the owner unlock live account data on this device. */
export default function OwnerUnlock({ onUnlocked }: { onUnlocked?: () => void }) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(Boolean(readOwnerPasscode())), []);

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Unlock size={13} className="text-primary" /> Live data unlocked on this device
        <button className="btn-secondary text-xs" onClick={() => { saveOwnerPasscode(""); setSaved(false); onUnlocked?.(); }}>
          Lock
        </button>
      </div>
    );
  }
  return (
    <form
      className="card-glass flex flex-wrap items-center gap-2 border border-primary/30 p-3"
      onSubmit={e => { e.preventDefault(); if (!value.trim()) return; saveOwnerPasscode(value.trim()); setSaved(true); setValue(""); onUnlocked?.(); }}
    >
      <Lock size={14} className="text-primary" />
      <span className="text-sm font-semibold">Unlock live account data</span>
      <input
        type="password"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Owner passcode"
        aria-label="Owner passcode"
        className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      />
      <button type="submit" className="btn-primary text-xs">Unlock</button>
    </form>
  );
}
