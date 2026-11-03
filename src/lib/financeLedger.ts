import type { Payment } from "@/lib/db";

export type MoneyTotals = { income: number; expenses: number; receivable: number; payable: number };
export function direction(p: Payment): "in" | "out" {
  return p.type === "income" || p.type === "invoice" ? "in" : "out";
}
/** Use each currency's minor unit precision; accumulate integers rather than binary fractions. */
export function currencyPrecision(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}
export function amountInMinorUnits(amount: number, currency: string): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  const scale = 10 ** currencyPrecision(currency);
  const scaled = amount * scale;
  const units = Math.round(scaled);
  if (!Number.isSafeInteger(units) || Math.abs(scaled - units) > 0.000001) return null;
  return units;
}
export function moneySummary(rows: readonly Payment[]): Record<string, MoneyTotals> {
  const result: Record<string, MoneyTotals> = {};
  for (const p of rows) {
    const currency = (p.currency || "").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) continue;
    const amount = amountInMinorUnits(p.amount, currency);
    if (amount === null || p.status === "cancelled") continue;
    const totals = result[currency] ?? { income: 0, expenses: 0, receivable: 0, payable: 0 };
    const bucket =
      p.status === "paid"
        ? direction(p) === "in"
          ? "income"
          : "expenses"
        : direction(p) === "in"
          ? "receivable"
          : "payable";
    totals[bucket] += amount;
    result[currency] = totals;
  }
  for (const [currency, totals] of Object.entries(result)) {
    const scale = 10 ** currencyPrecision(currency);
    for (const key of ["income", "expenses", "receivable", "payable"] as const)
      totals[key] /= scale;
  }
  return result;
}

/** Paid cash flow belongs to its payment date; obligations belong to their due date. */
export function paymentMatchesPeriod(p: Payment, from: string, to: string): boolean {
  if (!from && !to) return true;
  const date = p.status === "paid" ? p.paidDate : p.dueDate;
  if (!validLedgerDate(date || "")) return false;
  return (!from || date >= from) && (!to || date <= to);
}

export function ledgerEvidenceUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
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
  if (amountInMinorUnits(record.amount, record.currency) === null)
    return `Use no more than ${currencyPrecision(record.currency)} decimal places for ${record.currency}, within a safe numeric range.`;
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
      if (!ledgerEvidenceUrl(record.sourceUrl))
        return "Evidence links must use https:// or http://.";
    } catch {
      return "Enter a valid evidence URL.";
    }
  }
  return null;
}
export function financeCsv(rows: readonly Payment[], today = localToday()): string {
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
    "sourceUrl",
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
    ...rows.map((row) =>
      columns.map((key) => safe(key === "status" ? paymentStatus(row, today) : row[key])).join(","),
    ),
  ].join("\r\n");
}
