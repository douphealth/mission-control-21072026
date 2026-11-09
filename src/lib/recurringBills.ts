import type { Payment } from "@/lib/db";

export type BillFrequency = "monthly" | "bimonthly" | "quarterly" | "semiannual" | "yearly";
export const FREQUENCIES: { value: BillFrequency; label: string; months: number }[] = [
  { value: "monthly", label: "Monthly", months: 1 },
  { value: "bimonthly", label: "Every 2 months", months: 2 },
  { value: "quarterly", label: "Every 3 months", months: 3 },
  { value: "semiannual", label: "Every 6 months", months: 6 },
  { value: "yearly", label: "Yearly", months: 12 },
];

export function frequencyMonths(interval: string): number | null {
  const v = (interval || "").toLowerCase();
  if (v === "weekly") return 12 / 52;
  return FREQUENCIES.find((f) => f.value === v)?.months ?? null;
}

/** Cost per year; weekly counts 52 times. */
export function annualCost(amount: number, interval: string): number {
  if ((interval || "").toLowerCase() === "weekly") return amount * 52;
  const m = frequencyMonths(interval);
  return m ? Math.round((amount * 12 * 100) / m) / 100 : 0;
}

/** Adds whole months to an ISO date, clamping to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export function nextDueAfterPayment(dueDate: string, interval: string): string {
  if ((interval || "").toLowerCase() === "weekly") {
    const t = new Date(`${dueDate}T12:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 7);
    return t.toISOString().slice(0, 10);
  }
  return addMonths(dueDate, frequencyMonths(interval) ?? 1);
}

export function daysUntil(dueDate: string, today: string): number {
  return Math.round(
    (Date.parse(`${dueDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000,
  );
}

const IBAN_RE = /\b([A-Z]{2}\s?\d{2}(?:\s?[0-9A-Z]{1,4}){4,8})\b/g;
export function extractIbans(text: string): string[] {
  const out = new Set<string>();
  for (const m of (text || "").toUpperCase().matchAll(IBAN_RE)) {
    const compact = m[1].replace(/\s/g, "");
    if (compact.length >= 15 && compact.length <= 34) out.add(compact);
  }
  return [...out];
}
export const formatIban = (iban: string) => iban.replace(/(.{4})/g, "$1 ").trim();

export function isRecurringBill(p: Payment) {
  return p.recurring && frequencyMonths(p.recurringInterval) !== null && p.status !== "cancelled";
}

type Starter = Pick<Payment, "title" | "to" | "from" | "category" | "recurringInterval" | "notes" | "amount" | "endMonth">;
/** Owner-supplied approximate household costs (Nov 2026); every value stays editable. */
export const STARTER_BILLS: Starter[] = [
  { title: "Φροντιστήριο Αλεξάνδρας – Αξία", to: "Όμιλος Φροντιστηρίων Αξία (ΜΙΧΑΛΙΑΝΟΣ-ΦΥΛΙΑ ΟΕ)", from: "Αλεξάνδρα", category: "Education", recurringInterval: "monthly", amount: 530, notes: "Δικαιούχος: ΜΙΧΑΛΙΑΝΟΣ-ΦΥΛΙΑ ΟΕ\nΤράπεζα Alpha\nIBAN: GR3801401210121002002032483\nΜέχρι τον Ιούνιο (Πανελλαδικές).", endMonth: "2027-06" },
  { title: "Κέντρο Τεχνών Πλάκα", to: "ΑΝΩΝΥΜΟΣ ΕΚΠΑΙΔΕΥΤΙΚΗ ΕΚΔΟΤΙΚΗ-ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΕΙΑ", from: "Αλεξάνδρα", category: "Education", recurringInterval: "monthly", amount: 200, notes: "Alpha Bank λογ. 110002320024252\nIBAN: GR4901401100110002320024252\nΕθνική λογ. 52500417507\nIBAN: GR7001105250000052500417507\nΜέχρι τον Ιούνιο (Πανελλαδικές).", endMonth: "2027-06" },
  { title: "Μπάσκετ Δημήτρη – Πανερυθραϊκός", to: "ΠΑΝΕΡΥΘΡΑΪΚΟΣ ΑΘΛΗΤΙΚΟΣ ΣΥΛΛΟΓΟΣ", from: "Δημήτρης", category: "Sports", recurringInterval: "yearly", amount: 800, notes: "800€ τον χρόνο, πληρώνεται σε δόσεις των 150€.\nAlpha Bank λογ. 153002001000026\nIBAN: GR7001401530153002001000026" },
  { title: "Μπάσκετ Δημήτρη – Personal training (Χατζής)", to: "Χατζής", from: "Δημήτρης", category: "Sports", recurringInterval: "monthly", amount: 105, notes: "3 φορές τον μήνα × 35€." },
  { title: "ΔΕΗ – Ρεύμα", to: "ΔΕΗ", from: "Σπίτι", category: "Utilities", recurringInterval: "monthly", amount: 175, notes: "Ανάλογα την κατανάλωση, περίπου 150–200€." },
  { title: "Cosmote – Σταθερό, Internet & Magenta TV", to: "COSMOTE", from: "Σπίτι", category: "Telecom", recurringInterval: "bimonthly", amount: 76, notes: "Νέο τιμολόγιο 38€/μήνα, λογαριασμός κάθε 2 μήνες." },
  { title: "Cosmote Mobile – Δικό μου", to: "COSMOTE", from: "Αλέξης", category: "Telecom", recurringInterval: "monthly", amount: 25, notes: "Περίπου." },
  { title: "Cosmote Mobile – Αλεξάνδρα", to: "COSMOTE", from: "Αλεξάνδρα", category: "Telecom", recurringInterval: "monthly", amount: 14, notes: "" },
  { title: "Cosmote Mobile – Δημήτρης", to: "COSMOTE", from: "Δημήτρης", category: "Telecom", recurringInterval: "monthly", amount: 14, notes: "" },
  { title: "Ασφάλεια υγείας – Generali Life On", to: "Generali", from: "Οικογένεια", category: "Insurance", recurringInterval: "semiannual", amount: 680, notes: "" },
  { title: "Στεγαστικό δάνειο", to: "Εθνική Τράπεζα", from: "Σπίτι", category: "Loan", recurringInterval: "semiannual", amount: 3600, notes: "" },
  { title: "Σχολείο Αλεξάνδρας – Ελληνογερμανική Αγωγή", to: "ΕΛΛΗΝΟΓΕΡΜΑΝΙΚΗ ΑΓΩΓΗ", from: "Αλεξάνδρα", category: "Education", recurringInterval: "quarterly", amount: 3000, notes: "12.000€ τον χρόνο σε 4 δόσεις." },
  { title: "Σχολείο Δημήτρη – Ελληνογερμανική Αγωγή", to: "ΕΛΛΗΝΟΓΕΡΜΑΝΙΚΗ ΑΓΩΓΗ", from: "Δημήτρης", category: "Education", recurringInterval: "quarterly", amount: 3000, notes: "12.000€ τον χρόνο σε 4 δόσεις." },
  { title: "Συναγερμός σπιτιού – Spartan", to: "SPARTAN", from: "Σπίτι", category: "Home", recurringInterval: "semiannual", amount: 75, notes: "" },
  { title: "Κοινόχρηστα πολυκατοικίας", to: "Διαχείριση πολυκατοικίας", from: "Σπίτι", category: "Home", recurringInterval: "monthly", amount: 200, notes: "Περίπου." },
  { title: "Super market – διατροφή", to: "Super market", from: "Οικογένεια", category: "Groceries", recurringInterval: "monthly", amount: 600, notes: "Περίπου." },
  { title: "Χαρτζιλίκι παιδιών – σχολείο/φροντιστήριο", to: "Μετρητά", from: "Παιδιά", category: "Daily", recurringInterval: "monthly", amount: 220, notes: "~10€ τη μέρα × ~22 σχολικές μέρες." },
  { title: "Καθημερινά – καφές/φαγητό έξω", to: "Μετρητά", from: "Αλέξης", category: "Daily", recurringInterval: "monthly", amount: 300, notes: "~10€ τη μέρα × 30." },
  { title: "Μετακίνηση – αυτοκίνητο", to: "Καύσιμα/διόδια", from: "Οικογένεια", category: "Transport", recurringInterval: "monthly", amount: 120, notes: "Σύνολο ~260€· τα 140€ καλύπτονται από την εργασία της Αναστασίας." },
  { title: "Ρούχα/παπούτσια παιδιών", to: "Διάφορα", from: "Παιδιά", category: "Shopping", recurringInterval: "monthly", amount: 100, notes: "Περίπου." },
  { title: "Διασκέδαση παιδιών", to: "Διάφορα", from: "Παιδιά", category: "Leisure", recurringInterval: "monthly", amount: 50, notes: "" },
  { title: "Έκτακτα έξοδα", to: "Διάφορα", from: "Οικογένεια", category: "Other", recurringInterval: "monthly", amount: 100, notes: "Αποθεματικό για απρόβλεπτα." },
];

const key = (t: string) => t.trim().toLowerCase();

/** Builds starter bills not already present (matched by title). */
export function starterBillsToAdd(existing: Payment[], today: string): Omit<Payment, "id">[] {
  const have = new Set(existing.map((p) => key(p.title)));
  const firstNext = addMonths(`${today.slice(0, 7)}-01`, 1);
  return STARTER_BILLS.filter((s) => !have.has(key(s.title))).map((s) => ({
    ...s,
    currency: "EUR",
    type: "expense",
    status: "pending",
    dueDate: firstNext,
    paidDate: "",
    recurring: true,
    linkedProject: "",
    createdAt: today,
    source: "manual",
    evidenceStatus: "unverified",
  }));
}

/** Fills known amounts into existing bills that still have 0 €; never overwrites a value the owner set. */
export function knownAmountUpdates(existing: Payment[]): { id: string; changes: Partial<Payment> }[] {
  const byTitle = new Map(STARTER_BILLS.map((s) => [key(s.title), s]));
  return existing
    .filter((p) => p.recurring && !p.amount && byTitle.has(key(p.title)))
    .map((p) => {
      const s = byTitle.get(key(p.title))!;
      return {
        id: p.id,
        changes: {
          amount: s.amount,
          recurringInterval: s.recurringInterval,
          from: p.from || s.from,
          to: s.to,
          endMonth: s.endMonth,
          notes: p.notes && p.notes !== "Συχνότητα δόσεων προς επιβεβαίωση." ? p.notes : s.notes,
        },
      };
    });
}

const monthIndex = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;

/** Whether a bill still applies in month YYYY-MM (respects its optional end month). */
export function activeInMonth(b: Pick<Payment, "endMonth">, month: string) {
  return !b.endMonth || month <= b.endMonth;
}

/** Amount actually charged in month YYYY-MM, projecting the schedule from the next due date. */
export function chargeInMonth(b: Payment, month: string): number {
  if (!activeInMonth(b, month)) return 0;
  const step = frequencyMonths(b.recurringInterval);
  if (!step || step < 1 || !b.dueDate) return step && step < 1 ? (b.amount * 52) / 12 : 0;
  const diff = monthIndex(month) - monthIndex(b.dueDate.slice(0, 7));
  return ((diff % step) + step) % step === 0 ? b.amount : 0;
}

/** Smoothed monthly cost (what to set aside every month). */
export function monthlyShare(b: Payment, month: string): number {
  return activeInMonth(b, month) ? annualCost(b.amount, b.recurringInterval) / 12 : 0;
}

export function nextMonths(fromMonth: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(`${fromMonth}-01`, i).slice(0, 7));
}
