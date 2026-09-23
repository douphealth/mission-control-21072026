import { describe, expect, it } from "vitest";
import { isOfficeFile, isSupportedFile } from "@/lib/fileIntake";

function file(name: string, type = ""): File {
  return { name, type } as File;
}

describe("file intake support", () => {
  it("recognizes Office documents by extension when browsers omit a MIME type", () => {
    expect(isOfficeFile(file("client-brief.DOCX"))).toBe(true);
    expect(isOfficeFile(file("pipeline.xlsx"))).toBe(true);
    expect(isOfficeFile(file("legacy-budget.xls"))).toBe(false);
    expect(isOfficeFile(file("roadmap.pptx"))).toBe(true);
  });

  it("accepts Office documents alongside PDFs, images and text data", () => {
    expect(isSupportedFile(file("client-brief.docx"))).toBe(true);
    expect(isSupportedFile(file("pipeline.xlsx"))).toBe(true);
    expect(isSupportedFile(file("roadmap.pptx"))).toBe(true);
    expect(isSupportedFile(file("legacy-budget.xls"))).toBe(false);
    expect(isSupportedFile(file("invoice.pdf", "application/pdf"))).toBe(true);
    expect(isSupportedFile(file("unknown.bin", "application/octet-stream"))).toBe(false);
  });
});
