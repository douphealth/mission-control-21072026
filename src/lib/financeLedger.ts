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
    const currency = (p.currency || "").trim().toUpperCase();
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
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}
export function dueState(
  p: Payment,
  today: string,
): "paid" | "cancelled" | "overdue" | "upcoming" | "open" {
  if (p.status === "paid" || p.status === "cancelled") return p.status;
  if (!validLedgerDate(p.dueDate || "")) return p.status === "overdue" ? "overdue" : "open";
  if (p.dueDate < today) return "overdue";
  return "upcoming";
}

export function validLedgerDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localToday(date) === value;
}

export function paymentStatus(p: Payment, today: string): Payment["status"] {
  const state = dueState(p, today);
  return state === "upcoming" || state === "open" ? "pending" : state;
}

export function paymentStatusPatch(
  status: Payment["status"],
  today: string,
): Pick<Payment, "status" | "paidDate"> {
  if (!["paid", "pending", "overdue", "cancelled"].includes(status))
    throw new Error("Choose a valid payment status.");
  if (!validLedgerDate(today)) throw new Error("Choose a valid payment date.");
  return { status, paidDate: status === "paid" ? today : "" };
}

export function validatePayment(record: Omit<Payment, "id">, today = localToday()): string | null {
  if (!record.title.trim()) return "Enter a payment description.";
  if (!Number.isFinite(record.amount) || record.amount <= 0)
    return "Enter an amount greater than zero.";
  if (!/^[A-Z]{3}$/.test(record.currency))
    return "Enter the record’s three-letter currency code. Currency is never guessed.";
  if (record.dueDate && !validLedgerDate(record.dueDate)) return "Choose a valid due date.";
  if (record.status === "paid" && (!validLedgerDate(record.paidDate) || record.paidDate > today))
    return "A paid record needs its actual payment date, no later than today.";
  if (
    record.evidenceStatus === "confirmed" &&
    !record.sourceRef?.trim() &&
    !record.sourceUrl?.trim()
  )
    return "Add a receipt or transaction reference before marking the evidence confirmed.";
  if (record.sourceUrl) {
    try {
      if (!["http:", "https:"].includes(new URL(record.sourceUrl).protocol))
        return "Evidence links must use https:// or http://.";
    } catch {
      return "Enter a valid evidence URL.";
    }
  }
  return null;
}
export function financeCsv(rows: readonly Payment[]): string {
  const columns = [
    "id",
    "title",
    "amount",
    "currency",
    "type",
    "status",
    "category",
    "from",
    "to",
    "dueDate",
    "paidDate",
    "recurring",
    "recurringInterval",
    "linkedProject",
    "source",
    "sourceRef",
    "evidenceStatus",
    "notes",
  ] as const;
  const safe = (value: unknown): string => {
    const raw = String(value ?? "");
    // Avoid formula execution in Excel/Sheets when an imported vendor/title starts with =,+,-,@.
    const neutral = /^[\p{Cc}\s]*[=+\-@]/u.test(raw) ? "'" + raw : raw;
    return '"' + neutral.replace(/"/g, '""') + '"';
  };
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((key) => safe(row[key])).join(",")),
  ].join("\r\n");
}
