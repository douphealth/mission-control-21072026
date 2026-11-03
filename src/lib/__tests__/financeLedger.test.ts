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
