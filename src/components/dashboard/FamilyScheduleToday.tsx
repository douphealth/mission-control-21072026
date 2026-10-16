import { CalendarDays } from "lucide-react";
import { useFamilySchedule } from "@/hooks/useFamilySchedule";
import { dateKey, scheduleOccurs, timeMinutes } from "@/lib/familySchedule";
import { useMinuteClock } from "@/hooks/useMinuteClock";
import { useNavigationStore } from "@/stores/navigationStore";
export default function FamilyScheduleToday() {
  const { rows } = useFamilySchedule(), clock = useMinuteClock();
  const now = (zone: string) => new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const upcoming = rows.filter(row => !row.archived && scheduleOccurs(row.rule, dateKey(new Date(), row.rule.timezone)) && row.rule.endTime >= now(row.rule.timezone)).sort((a, b) => timeMinutes(a.rule.startTime) - timeMinutes(now(a.rule.timezone)) - timeMinutes(b.rule.startTime) + timeMinutes(now(b.rule.timezone))).slice(0, 3);
  if (!rows.length) return null;
  return <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-card p-4" aria-label="Family timetable today" data-minute={clock.nowHHMM}><CalendarDays size={19} className="text-primary" /><strong className="text-sm">Family today</strong><div className="flex min-w-0 flex-1 flex-wrap gap-2">{upcoming.length ? upcoming.map(row => <span key={row.id} className="rounded-xl bg-secondary px-3 py-2 text-xs"><strong>{row.rule.startTime}</strong> {row.rule.member}: {row.rule.title} {row.rule.conditional ? "(confirm)" : ""} <small>{row.rule.timezone}</small></span>) : <span className="text-xs text-muted-foreground">No remaining activities today.</span>}</div><button className="min-h-11 rounded-xl px-3 text-sm font-semibold text-primary" onClick={() => useNavigationStore.getState().setActiveSection("family-schedule")}>Open timetable</button></section>;
}
