import type { Payment } from "@/lib/db";

export type MoneyTotals = { income: number; expenses: number; receivable: number; payable: number };
const open = (p: Payment) => p.status !== "paid" && p.status !== "cancelled";
export function direction(p: Payment): "in" | "out" {
  return p.type === "income" || p.type === "invoice" ? "in" : "out";
}
export function moneySummary(rows: readonly Payment[]): Record<string, MoneyTotals> {
  const result: Record<string, MoneyTotals> = {};
  for (const p of rows) {
    if (!Number.isFinite(p.amount) || p.amount < 0) continue;
    const currency = (p.currency || "USD").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) continue;
    const totals = result[currency] ?? { income: 0, expenses: 0, receivable: 0, payable: 0 };
    if (p.status === "paid") {
      if (direction(p) === "in") totals.income += p.amount;
      else totals.expenses += p.amount;
    } else if (open(p)) {
      if (direction(p) === "in") totals.receivable += p.amount;
      else totals.payable += p.amount;
    }
    result[currency] = totals;
  }
  return result;
}
export function localToday(now = new Date()): string {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")].join("-");
}
export function dueState(p: Payment, today: string): "paid" | "cancelled" | "overdue" | "upcoming" | "open" {
  if (p.status === "paid" || p.status === "cancelled") return p.status;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.dueDate || "")) return "open";
  if (p.dueDate < today) return "overdue";
  return "upcoming";
}
export function financeCsv(rows: readonly Payment[]): string {
  const columns = ["id","title","amount","currency","type","status","category","from","to",
    "dueDate","paidDate","recurring","recurringInterval","linkedProject","source",
    "sourceRef","evidenceStatus","notes"] as const;
  const safe = (value: unknown): string => {
    const raw = String(value ?? "");
    // Avoid formula execution in Excel/Sheets when an imported vendor/title starts with =,+,-,@.
    const neutral = /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) ? "'" + raw : raw;
    return '"' + neutral.replace(/"/g, '""') + '"';
  };
  return [columns.join(","), ...rows.map(row => columns.map(key => safe(row[key])).join(","))].join("\r\n");
}
