import { describe, expect, it } from "vitest";
import { dueState, financeCsv, moneySummary } from "@/lib/financeLedger";
import { identityKey } from "@/lib/dedup";
import type { Payment } from "@/lib/db";
const payment = (patch: Partial<Payment> = {}): Payment => ({
  id: "one",
  title: "Hosting",
  amount: 5,
  currency: "USD",
  type: "expense",
  status: "paid",
  category: "Hosting",
  from: "",
  to: "Cloudflare",
  dueDate: "2026-09-08",
  paidDate: "2026-09-08",
  recurring: true,
  recurringInterval: "monthly",
  linkedProject: "",
  notes: "",
  createdAt: "2026-09-08",
  ...patch,
});
describe("Finance integrity", () => {
  it("does not merge repeated monthly charges or different currencies", () => {
    const first = payment(),
      second = payment({
        id: "two",
        dueDate: "2026-10-08",
        paidDate: "2026-10-08",
        createdAt: "2026-10-08",
      });
    expect(identityKey("payments", first)).not.toBe(identityKey("payments", second));
    expect(identityKey("payments", first)).not.toBe(
      identityKey("payments", payment({ currency: "EUR" })),
    );
  });
  it("deduplicates by exact provider reference", () => {
    expect(
      identityKey("payments", payment({ source: "email-receipt", sourceRef: "receipt-123" })),
    ).toBe(
      identityKey(
        "payments",
        payment({ source: "email-receipt", sourceRef: "receipt-123", createdAt: "2026-12-01" }),
      ),
    );
  });
  it("separates paid flows, receivables and payables", () => {
    expect(
      moneySummary([
        payment(),
        payment({ type: "income", amount: 22 }),
        payment({ type: "invoice", status: "pending", amount: 80 }),
        payment({ type: "subscription", status: "pending", amount: 12 }),
        payment({ type: "expense", status: "cancelled", amount: 999 }),
      ]),
    ).toEqual({ USD: { income: 22, expenses: 5, receivable: 80, payable: 12 } });
  });
  it("finds overdue without stale manually recorded status", () => {
    expect(dueState(payment({ status: "pending", dueDate: "2026-10-01" }), "2026-10-26")).toBe(
      "overdue",
    );
    expect(dueState(payment({ status: "paid" }), "2026-10-26")).toBe("paid");
  });
  it("neutralizes spreadsheet formula injection", () => {
    const csv = financeCsv([payment({ title: "=HYPERLINK(1)" })]);
    expect(csv).toContain('"\'=HYPERLINK(1)"');
  });
});
import { paymentStatus, paymentStatusPatch, validatePayment } from "../financeLedger";

describe("Recorded finance evidence and status", () => {
  it("does not relabel missing currency as dollars", () => {
    expect(moneySummary([payment({ currency: "" }), payment({ currency: "EURO" })])).toEqual({});
  });
  it("shows the same overdue state in filters and record badges", () => {
    expect(paymentStatus(payment({ status: "pending", dueDate: "2026-10-01" }), "2026-11-03")).toBe(
      "overdue",
    );
    expect(paymentStatus(payment({ status: "overdue", dueDate: "2026-12-01" }), "2026-11-03")).toBe(
      "pending",
    );
  });
  it("bulk paid records receive a date and reopening removes the paid date", () => {
    expect(paymentStatusPatch("paid", "2026-11-03")).toEqual({
      status: "paid",
      paidDate: "2026-11-03",
    });
    expect(paymentStatusPatch("pending", "2026-11-03")).toEqual({
      status: "pending",
      paidDate: "",
    });
  });
  it("requires actual payment date and supporting evidence for confirmed records", () => {
    expect(validatePayment(payment({ paidDate: "" }), "2026-11-03")).toMatch(/actual payment date/);
    expect(validatePayment(payment({ paidDate: "2026-12-01" }), "2026-11-03")).toMatch(
      /actual payment date/,
    );
    expect(
      validatePayment(payment({ evidenceStatus: "confirmed", sourceRef: "" }), "2026-11-03"),
    ).toMatch(/reference/);
    expect(
      validatePayment(
        payment({ evidenceStatus: "confirmed", sourceRef: "receipt-123" }),
        "2026-11-03",
      ),
    ).toBeNull();
  });
  it("rejects impossible dates and unsafe evidence links", () => {
    expect(validatePayment(payment({ dueDate: "2026-02-31" }), "2026-11-03")).toMatch(/due date/);
    expect(validatePayment(payment({ sourceUrl: "javascript:alert(1)" }), "2026-11-03")).toMatch(
      /https/,
    );
  });
});

import { amountInMinorUnits, paymentMatchesPeriod, ledgerEvidenceUrl } from "../financeLedger";

describe("Filtered ledger arithmetic and provenance", () => {
  it("adds exact currency minor units and respects currencies without cents", () => {
    expect(moneySummary([payment({ amount: 0.1 }), payment({ amount: 0.2 })]).USD.expenses).toBe(
      0.3,
    );
    expect(amountInMinorUnits(1200, "JPY")).toBe(1200);
    expect(amountInMinorUnits(12.5, "JPY")).toBeNull();
    expect(amountInMinorUnits(2.125, "KWD")).toBe(2125);
    expect(amountInMinorUnits(2.125, "EUR")).toBeNull();
    expect(
      moneySummary([payment({ amount: NaN }), payment({ amount: -2 }), payment({ amount: 1.005 })]),
    ).toEqual({});
  });
  it("uses actual paid dates for cash flow and due dates for obligations", () => {
    const paid = payment({ paidDate: "2026-11-02", dueDate: "2026-10-30" });
    expect(paymentMatchesPeriod(paid, "2026-11-01", "2026-11-30")).toBe(true);
    expect(paymentMatchesPeriod(paid, "2026-10-01", "2026-10-31")).toBe(false);
    expect(paymentMatchesPeriod({ ...paid, status: "pending" }, "2026-10-01", "2026-10-31")).toBe(
      true,
    );
    expect(paymentMatchesPeriod({ ...paid, paidDate: "" }, "2026-11-01", "2026-11-30")).toBe(false);
    expect(paymentMatchesPeriod({ ...paid, paidDate: "" }, "", "")).toBe(true);
  });
  it("does not expose embedded credentials or executable evidence links", () => {
    expect(ledgerEvidenceUrl("https://user:secret@example.com/receipt")).toBeNull();
    expect(ledgerEvidenceUrl("javascript:alert(1)")).toBeNull();
    expect(ledgerEvidenceUrl("https://example.com/receipt/42")).toBe(
      "https://example.com/receipt/42",
    );
    expect(financeCsv([payment({ sourceUrl: "https://example.com/receipt/42" })])).toContain(
      "https://example.com/receipt/42",
    );
  });
  it("validates currency precision before accepting a ledger amount", () => {
    expect(validatePayment(payment({ currency: "EUR", amount: 2.125 }))).toMatch(
      /2 decimal places/,
    );
    expect(validatePayment(payment({ currency: "JPY", amount: 12.5 }))).toMatch(/0 decimal places/);
  });
});
