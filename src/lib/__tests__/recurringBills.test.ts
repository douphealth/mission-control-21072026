import { describe, expect, it } from "vitest";
import type { Payment } from "@/lib/db";
import { addMonths, annualCost, chargeInMonth, extractIbans, knownAmountUpdates, monthlyShare, starterBillsToAdd } from "@/lib/recurringBills";
const bill = (o: Partial<Payment>) => ({ recurring: true, amount: 0, title: "x", dueDate: "2026-12-01", recurringInterval: "monthly", ...o }) as Payment;
describe("recurring bills", () => {
  it("every 6 months costs twice per year", () => expect(annualCost(300, "semiannual")).toBe(600));
  it("quarterly costs four times per year", () => expect(annualCost(100, "quarterly")).toBe(400));
  it("cosmote 76 every 2 months = 38 per month", () => expect(monthlyShare(bill({ amount: 76, recurringInterval: "bimonthly" }), "2026-12")).toBe(38));
  it("clamps month end", () => expect(addMonths("2026-01-31", 1)).toBe("2026-02-28"));
  it("reads spaced IBANs", () =>
    expect(extractIbans("IBAN: GR 4901401100110002320024252")).toEqual(["GR4901401100110002320024252"]));
  it("loan 3600 charged only every 6 months", () => {
    const b = bill({ amount: 3600, recurringInterval: "semiannual" });
    expect(chargeInMonth(b, "2026-12")).toBe(3600);
    expect(chargeInMonth(b, "2027-03")).toBe(0);
    expect(chargeInMonth(b, "2027-06")).toBe(3600);
  });
  it("tutoring stops after June", () => {
    const b = bill({ amount: 530, endMonth: "2027-06" });
    expect(chargeInMonth(b, "2027-06")).toBe(530);
    expect(chargeInMonth(b, "2027-07")).toBe(0);
  });
  it("fills amounts only where still 0", () => {
    const u = knownAmountUpdates([bill({ id: "a", title: "Στεγαστικό δάνειο" }), bill({ id: "b", title: "ΔΕΗ – Ρεύμα", amount: 190 })]);
    expect(u).toHaveLength(1);
    expect(u[0].changes.amount).toBe(3600);
  });
  it("does not re-add existing starter bills", () => {
    const first = starterBillsToAdd([], "2026-11-09");
    expect(first.length).toBe(22);
    expect(starterBillsToAdd(first.map((f, i) => ({ ...f, id: String(i) })), "2026-11-09")).toHaveLength(0);
  });
});
