import { describe, it, expect } from "vitest";
import { previewBulkIntake } from "../bulkIntake";
const pw = (s: string) => previewBulkIntake("credentials", s, {}).rows.map(r => r.password);
describe("bulk credentials keep every password", () => {
  it("Login column is the account, not a URL", () => expect(pw("Name\tURL\tLogin\tPassword\nNetflix\thttps://netflix.com\tme@x.com\tSecr3t#")).toEqual(["Secr3t#"]));
  it("label: user / pass lines", () => expect(pw("Gmail: me@x.com / Abc!123\nBank - john - Pw99!")).toEqual(["Abc!123", "Pw99!"]));
  it("blank-line blocks", () => expect(pw("Gmail\nme@x.com\nAbc!123\n\nBank\njohn\nPw-99")).toEqual(["Abc!123", "Pw-99"]));
  it("Greek headers", () => expect(pw("Τίτλος;Χρήστης;Κωδικός\nΤράπεζα;alexis;Κ0d1k0s!")).toEqual(["Κ0d1k0s!"]));
});
