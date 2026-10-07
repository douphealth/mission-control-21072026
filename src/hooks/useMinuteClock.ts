import { useEffect, useState } from "react";
import { fmtLocal } from "@/lib/overdue";

/** Refresh day boundaries and capacity without polling while the tab is hidden. */
export function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => { if (!document.hidden) setNow(new Date()); };
    const timer = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return {
    today: fmtLocal(now),
    nowHHMM: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  };
}
