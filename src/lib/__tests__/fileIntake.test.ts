import { describe, expect, it } from "vitest";
import { describeUnsupported, isOfficeFile, isSupportedFile } from "@/lib/fileIntake";

function file(name: string, type = "", size = 100): File {
  return { name, type, size } as File;
}

describe("file intake support", () => {
  it("recognizes modern Office documents by extension when browsers omit a MIME type", () => {
    expect(isOfficeFile(file("client-brief.DOCX"))).toBe(true);
    expect(isOfficeFile(file("pipeline.xlsx"))).toBe(true);
    expect(isOfficeFile(file("legacy-budget.xls"))).toBe(false);
    expect(isOfficeFile(file("roadmap.pptx"))).toBe(true);
  });

  it("accepts only formats the capture pipeline can actually parse", () => {
    expect(isSupportedFile(file("client-brief.docx"))).toBe(true);
    expect(isSupportedFile(file("pipeline.xlsx"))).toBe(true);
    expect(isSupportedFile(file("roadmap.pptx"))).toBe(true);
    expect(isSupportedFile(file("invoice.pdf", "application/pdf"))).toBe(true);
    expect(isSupportedFile(file("notes.md", "text/markdown"))).toBe(true);
    expect(isSupportedFile(file("photo.jpg", "image/jpeg"))).toBe(true);

    expect(isSupportedFile(file("legacy-budget.xls"))).toBe(false);
    expect(isSupportedFile(file("unknown.bin", "application/octet-stream"))).toBe(false);
  });

  it("rejects empty and oversized uploads with useful reasons", () => {
    expect(isSupportedFile(file("empty.txt", "text/plain", 0))).toBe(false);
    expect(describeUnsupported(file("empty.txt", "text/plain", 0))).toContain("empty");

    const oversized = file("huge.pdf", "application/pdf", 18_000_001);
    expect(isSupportedFile(oversized)).toBe(false);
    expect(describeUnsupported(oversized)).toContain("under 18 MB");
  });
});
