import { useMemo, useState } from "react";
import { CalendarClock, Check, ChevronLeft, ChevronRight, Copy, Edit2, Plus, Repeat, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { db, type Payment } from "@/lib/db";
import {
  FREQUENCIES,
  annualCost,
  daysUntil,
  extractIbans,
  formatIban,
  isRecurringBill,
  nextDueAfterPayment,
  starterBillsToAdd,
  knownAmountUpdates,
  chargeInMonth,
  monthlyShare,
  activeInMonth,
  nextMonths,
  addMonths,
} from "@/lib/recurringBills";

const monthName = (ym: string) =>
  new Intl.DateTimeFormat("el-GR", { month: "long", year: "numeric" }).format(new Date(`${ym}-15T12:00:00Z`));
const shortMonth = (ym: string) =>
  new Intl.DateTimeFormat("el-GR", { month: "short" }).format(new Date(`${ym}-15T12:00:00Z`));

function AmountEditor({ b }: { b: Payment }) {
  const [v, setV] = useState<string | null>(null);
  if (v === null)
    return (
      <button onClick={() => setV(String(b.amount || ""))} title="Αλλαγή ποσού" className={`text-sm font-semibold tabular-nums underline decoration-dotted underline-offset-4 ${b.amount ? "" : "text-destructive"}`}>
        {b.amount ? eur(b.amount, b.currency) : "Ποσό;"}
      </button>
    );
  const save = async () => {
    const n = Number(v.replace(",", "."));
    if (Number.isFinite(n) && n >= 0 && n !== b.amount) {
      await db.payments.update(b.id, { amount: n });
      toast.success("Ποσό ενημερώθηκε");
    }
    setV(null);
  };
  return (
    <input autoFocus inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => void save()}
      onKeyDown={(e) => { if (e.key === "Enter") void save(); if (e.key === "Escape") setV(null); }}
      className="w-24 rounded-md border border-primary/50 bg-background px-2 py-0.5 text-right text-sm tabular-nums" aria-label="Ποσό" />
  );
}

const eur = (n: number, c = "EUR") => {
  try {
    return new Intl.NumberFormat("el-GR", { style: "currency", currency: c || "EUR" }).format(n);
  } catch {
    return `${n.toFixed(2)} ${c}`;
  }
};
const freqLabel = (v: string) =>
  FREQUENCIES.find((f) => f.value === v)?.label ?? (v === "weekly" ? "Weekly" : v);

export default function RecurringBillsPanel({
  payments,
  today,
  onEdit,
}: {
  payments: Payment[];
  today: string;
  onEdit: (p: Payment) => void;
}) {
  const [freq, setFreq] = useState("all");
  const [member, setMember] = useState("all");
  const [groupBy, setGroupBy] = useState<"due" | "member" | "category">("category");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [view, setView] = useState<"month" | "all">("month");
  const bills = useMemo(() => payments.filter(isRecurringBill), [payments]);
  const members = useMemo(
    () => [...new Set(bills.map((b) => b.from?.trim()).filter(Boolean))].sort(),
    [bills],
  );
  const shown = bills
    .filter((b) => view === "all" || chargeInMonth(b, month) > 0)
    .filter((b) => freq === "all" || b.recurringInterval === freq)
    .filter((b) => member === "all" || (b.from || "").trim() === member)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const eurBills = bills.filter((b) => (b.currency || "EUR").toUpperCase() === "EUR");
  const yearly = eurBills.reduce((s, b) => s + annualCost(b.amount, b.recurringInterval), 0);
  const next30 = eurBills.filter((b) => daysUntil(b.dueDate, today) <= 30);
  const due30 = next30.reduce((s, b) => s + b.amount, 0);
  const missingAmount = bills.filter((b) => !b.amount).length;
  const overdue = bills.filter((b) => daysUntil(b.dueDate, today) < 0).length;
  const starters = starterBillsToAdd(payments, today);
  const fills = knownAmountUpdates(bills);
  const eurActive = eurBills.filter((b) => activeInMonth(b, month));
  const chargedThisMonth = eurActive.reduce((s, b) => s + chargeInMonth(b, month), 0);
  const setAside = eurActive.reduce((s, b) => s + monthlyShare(b, month), 0);
  const forecast = nextMonths(today.slice(0, 7), 12).map((m) => ({
    m,
    total: eurBills.reduce((s, b) => s + chargeInMonth(b, m), 0),
  }));
  const peak = Math.max(1, ...forecast.map((f) => f.total));
  const byCat = new Map<string, number>();
  for (const b of eurActive) byCat.set(b.category || "Other", (byCat.get(b.category || "Other") ?? 0) + monthlyShare(b, month));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

  const groups = new Map<string, Payment[]>();
  for (const b of shown) {
    const d = daysUntil(b.dueDate, today);
    const key =
      groupBy === "member"
        ? b.from?.trim() || "Χωρίς μέλος"
        : groupBy === "category"
          ? b.category || "General"
          : d < 0
            ? "Overdue"
            : d <= 7
              ? "This week"
              : d <= 31
                ? "Next 30 days"
                : "Later";
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }

  async function addStarters() {
    await db.payments.bulkAdd(starters.map((s) => ({ ...s, id: crypto.randomUUID() }) as Payment));
    toast.success(`${starters.length} recurring bills added`, {
      description: "Fill in each amount and real due date with Edit.",
    });
  }

  async function fillAmounts() {
    await db.transaction("rw", db.payments, async () => {
      for (const f of fills) await db.payments.update(f.id, f.changes);
    });
    toast.success(`${fills.length} λογαριασμοί πήραν τα ποσά τους`);
  }

  async function markPaid(b: Payment) {
    if (!b.amount) {
      toast.error("Add the amount first", { description: "Press Edit to enter how much you pay." });
      return;
    }
    const now = new Date().toISOString();
    await db.transaction("rw", db.payments, async () => {
      await db.payments.add({
        ...b,
        id: crypto.randomUUID(),
        recurring: false,
        recurringInterval: "",
        status: "paid",
        paidDate: today,
        createdAt: today,
        notes: `${b.notes ? `${b.notes}\n` : ""}Payment for due date ${b.dueDate}`,
        evidenceStatus: "unverified",
      });
      await db.payments.update(b.id, {
        dueDate: nextDueAfterPayment(b.dueDate, b.recurringInterval),
        status: "pending",
        paidDate: today,
        verifiedAt: undefined,
      });
    });
    toast.success("Marked as paid", {
      description: `Next due ${nextDueAfterPayment(b.dueDate, b.recurringInterval)}. Saved in history. ${now.slice(11, 16)}`,
    });
  }

  const copy = (v: string) =>
    navigator.clipboard.writeText(v).then(() => toast.success("IBAN copied"));

  return (
    <section className="mc-bills-panel border-y border-border py-5 space-y-4" aria-label="Recurring bills">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Repeat size={18} className="text-primary" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Recurring bills</h2>
            <p className="text-xs text-muted-foreground">
              Monthly, every 3 months, every 6 months and yearly payments in one schedule.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {fills.length > 0 && (
            <button onClick={() => void fillAmounts()} className="btn-primary text-xs flex items-center gap-1.5">
              <Wand2 size={14} /> Βάλε τα ποσά σε {fills.length} λογαριασμούς
            </button>
          )}
          {starters.length > 0 && (
            <button onClick={() => void addStarters()} className="btn-secondary text-xs flex items-center gap-1.5">
              <Plus size={14} /> Πρόσθεσε {starters.length} έξοδα
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/30 bg-secondary/20 p-2">
        <button onClick={() => setMonth(addMonths(`${month}-01`, -1).slice(0, 7))} className="rounded-lg p-2 hover:bg-secondary" aria-label="Προηγούμενος μήνας"><ChevronLeft size={16} /></button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize">{monthName(month)}</p>
          {month !== today.slice(0, 7) && <button onClick={() => setMonth(today.slice(0, 7))} className="text-[11px] text-primary">Σήμερα</button>}
        </div>
        <button onClick={() => setMonth(addMonths(`${month}-01`, 1).slice(0, 7))} className="rounded-lg p-2 hover:bg-secondary" aria-label="Επόμενος μήνας"><ChevronRight size={16} /></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          ["Πληρώνεις αυτόν τον μήνα", eur(chargedThisMonth)],
          ["Να αφήνεις στην άκρη / μήνα", eur(setAside)],
          ["Σύνολο έτους", eur(yearly)],
          ["Χωρίς ποσό / καθυστερούν", `${missingAmount} / ${overdue}`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-border/30 bg-secondary/30 p-3">
            <p className="text-[11px] text-muted-foreground">{l}</p>
            <p className="text-lg font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border/30 p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Επόμενοι 12 μήνες · πατήστε έναν μήνα</p>
          <div className="mc-bills-forecast flex h-32 items-end gap-1">
            {forecast.map((f) => (
              <button key={f.m} onClick={() => setMonth(f.m)} title={`${monthName(f.m)}: ${eur(f.total)}`} className="flex flex-1 flex-col items-center gap-1 min-w-0">
                <span className="text-[9px] tabular-nums text-muted-foreground truncate">{Math.round(f.total)}</span>
                <span className={`w-full rounded-t ${f.m === month ? "bg-primary" : "bg-primary/30"}`} style={{ height: `${Math.max(4, (f.total / peak) * 80)}px` }} />
                <span className="text-[10px] text-muted-foreground">{shortMonth(f.m)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/30 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Ανά κατηγορία (μηνιαίος μέσος όρος)</p>
          {cats.map(([c, v]) => (
            <div key={c} className="text-xs">
              <div className="flex justify-between"><span>{c}</span><span className="tabular-nums">{eur(v)}</span></div>
              <div className="h-1.5 rounded bg-secondary"><div className="h-1.5 rounded bg-primary" style={{ width: `${(v / Math.max(1, setAside)) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button onClick={() => setView(view === "month" ? "all" : "month")} className="px-3 py-1.5 rounded-full border border-primary/50 text-primary">
          {view === "month" ? "Μόνο αυτού του μήνα" : "Όλα τα έξοδα"}
        </button>
        {[{ value: "all", label: "All" }, ...FREQUENCIES].map((f) => {
          const n = f.value === "all" ? bills.length : bills.filter((b) => b.recurringInterval === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFreq(f.value)}
              className={`px-3 py-1.5 rounded-full border ${freq === f.value ? "bg-primary text-primary-foreground border-primary" : "border-border/40 text-muted-foreground"}`}
            >
              {f.label} · {n}
            </button>
          );
        })}
        <select value={member} onChange={(e) => setMember(e.target.value)} className="rounded-full border border-border/40 bg-background px-3 py-1.5" aria-label="Member">
          <option value="all">Everyone</option>
          {members.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)} className="rounded-full border border-border/40 bg-background px-3 py-1.5" aria-label="Group by">
          <option value="due">Group by due date</option>
          <option value="member">Group by person</option>
          <option value="category">Group by category</option>
        </select>
      </div>

      {!shown.length && (
        <p className="text-sm text-muted-foreground">
          No recurring bills yet. Create a record and choose a billing frequency, or add your household bills above.
        </p>
      )}

      {[...groups.entries()].map(([g, rows]) => (
        <div key={g} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {g} · {eur(rows.reduce((s, r) => s + (view === "month" ? chargeInMonth(r, month) : r.amount), 0))}
          </h3>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((b) => {
              const d = daysUntil(b.dueDate, today);
              const ibans = extractIbans(b.notes);
              return (
                <article key={b.id} className={`mc-bill-record min-w-0 rounded-lg border p-3 space-y-2 ${d < 0 ? "border-destructive/40 bg-destructive/5" : "border-border/30 bg-background/40"}`}>
                  <div className="mc-bill-heading grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <p className="font-medium text-sm break-words">{b.title}</p>
                      <p className="text-[11px] text-muted-foreground break-words">
                        {[b.to, b.from, b.category].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:block sm:text-right">
                      <AmountEditor b={b} />
                      <p className="text-[11px] text-muted-foreground">{freqLabel(b.recurringInterval)}{b.endMonth ? ` · έως ${b.endMonth}` : ""}</p>
                    </div>
                  </div>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs">
                    <CalendarClock size={13} />
                    {b.dueDate}{" "}
                    <span className={d < 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {d < 0 ? `${-d} days late` : d === 0 ? "today" : `in ${d} days`}
                    </span>
                    {b.amount > 0 && (
                      <span className="ml-auto text-muted-foreground">{eur(annualCost(b.amount, b.recurringInterval))}/yr</span>
                    )}
                  </p>
                  {b.notes && <p className="text-[11px] text-muted-foreground break-words whitespace-pre-line">{b.notes.split("\n").filter((l) => !/IBAN|λογ\./.test(l)).join(" · ")}</p>}
                  {ibans.map((i) => (
                    <button key={i} onClick={() => void copy(i)} className="flex w-full items-center gap-1.5 rounded-lg bg-secondary/40 px-2 py-1 text-[11px] font-mono text-left">
                      <Copy size={12} className="shrink-0" /> <span className="min-w-0 break-all">{formatIban(i)}</span>
                    </button>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => void markPaid(b)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary/10 text-primary py-1.5 text-xs font-medium">
                      <Check size={13} /> Paid
                    </button>
                    <button onClick={() => onEdit(b)} className="flex items-center gap-1 rounded-lg border border-border/40 px-3 py-1.5 text-xs">
                      <Edit2 size={13} /> Edit
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
