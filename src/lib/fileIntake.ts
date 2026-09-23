// Turns user-selected files into a payload the extraction engine can understand.
// Images and PDFs preserve their original binary form; text and Office files are
// extracted locally before reaching AI so classification works even when the
// provider cannot inspect an Office container directly.

export interface PreparedFile {
  name: string;
  mimeType: string;
  dataUrl?: string;
  text?: string;
}

const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|ya?ml|log|ics|vcf|html?|srt|vtt|sql|env|ini|conf|toml|rtf)$/i;
const OFFICE_EXT = /\.(docx?|xlsx?|pptx?)$/i;
const SPREADSHEET_EXT = /\.(xlsx?|ods|csv|tsv)$/i;
const WORD_EXT = /\.docx$/i;
const PRESENTATION_EXT = /\.pptx$/i;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isPdfFile(file: File): boolean {
  return file.type.includes("pdf") || /\.pdf$/i.test(file.name);
}

export function isTextFile(file: File): boolean {
  return (
    file.type.startsWith("text/") ||
    file.type.includes("json") ||
    file.type.includes("xml") ||
    file.type.includes("csv") ||
    file.type.includes("yaml") ||
    TEXT_EXT.test(file.name)
  );
}

export function isOfficeFile(file: File): boolean {
  return (
    OFFICE_EXT.test(file.name) ||
    /(?:officedocument|msword|ms-excel|ms-powerpoint|spreadsheetml|presentationml)/i.test(file.type)
  );
}

export function isSupportedFile(file: File): boolean {
  return isImageFile(file) || isPdfFile(file) || isTextFile(file) || isOfficeFile(file);
}

export function describeUnsupported(file: File): string {
  const ext = file.name.split(".").pop()?.toUpperCase() || "this";
  return `${ext} files can't be read directly. Upload a PDF, Word, Excel, PowerPoint, CSV, text file or image instead.`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read "${file.name}"`));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read "${file.name}"`));
    reader.onload = () => resolve((reader.result as string) ?? "");
    reader.readAsText(file);
  });
}

function officeMimeType(file: File): string {
  if (file.type) return file.type;
  if (/\.docx$/i.test(file.name)) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (/\.xlsx$/i.test(file.name)) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (/\.pptx$/i.test(file.name)) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  return "application/octet-stream";
}

async function extractOfficeText(file: File): Promise<string | null> {
  const buffer = await file.arrayBuffer();
  if (WORD_EXT.test(file.name)) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value.trim() || null;
  }
  if (SPREADSHEET_EXT.test(file.name)) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "array", cellFormula: false, cellHTML: false });
    const text = workbook.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name], { blankrows: false });
      return csv ? `Sheet: ${name}\n${csv}` : "";
    })
      .filter(Boolean)
      .join("\n\n");
    return text.trim() || null;
  }
  if (PRESENTATION_EXT.test(file.name)) {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const slideNames = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const slides = await Promise.all(
      slideNames.map(async (name, index) => {
        const xml = await zip.files[name].async("text");
        const text = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi), (match) =>
          match[1]
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .trim(),
        )
          .filter(Boolean)
          .join(" ");
        return text ? `Slide ${index + 1}: ${text}` : "";
      }),
    );
    return slides.filter(Boolean).join("\n\n").trim() || null;
  }
  return null;
}

/** Downscale a photo so large camera shots stay under the upload budget. */
export function compressImageFile(file: File, max = 1800, quality = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function prepareFile(file: File): Promise<PreparedFile> {
  if (isImageFile(file)) {
    return { name: file.name, mimeType: "image/jpeg", dataUrl: await compressImageFile(file) };
  }
  if (isPdfFile(file)) {
    if (file.size > 18_000_000) {
      throw new Error(`"${file.name}" is too large — split it or export fewer pages.`);
    }
    return { name: file.name, mimeType: "application/pdf", dataUrl: await readAsDataUrl(file) };
  }
  if (isTextFile(file)) {
    const text = await readAsText(file);
    if (!text.trim()) throw new Error(`"${file.name}" appears to be empty.`);
    return { name: file.name, mimeType: file.type || "text/plain", text: text.slice(0, 400_000) };
  }
  if (isOfficeFile(file)) {
    if (file.size > 18_000_000) {
      throw new Error(`"${file.name}" is too large — split it or export fewer pages.`);
    }
    try {
      const text = await extractOfficeText(file);
      if (text) return { name: file.name, mimeType: officeMimeType(file), text: text.slice(0, 400_000) };
    } catch {
      // Keep the original container for the multimodal provider to inspect.
    }
    return { name: file.name, mimeType: officeMimeType(file), dataUrl: await readAsDataUrl(file) };
  }
  throw new Error(describeUnsupported(file));
}
