// Turns user-selected files into a payload the extraction engine can understand.
// Office content is extracted locally so the server never receives unsupported
// Office containers that it would silently ignore.

export interface PreparedFile {
  name: string;
  mimeType: string;
  dataUrl?: string;
  text?: string;
}

const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|ya?ml|log|ics|vcf|html?|srt|vtt|sql|env|ini|conf|toml|rtf)$/i;
const OFFICE_EXT = /\.(docx|xlsx|pptx)$/i;
const WORD_EXT = /\.docx$/i;
const SPREADSHEET_EXT = /\.xlsx$/i;
const PRESENTATION_EXT = /\.pptx$/i;
const MAX_FILE_BYTES = 18_000_000;
const MAX_UNCOMPRESSED_BYTES = 50_000_000;
const MAX_EXTRACTED_CHARS = 400_000;

type ZipEntryWithSize = { _data?: { uncompressedSize?: number } };

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
    /(?:officedocument|spreadsheetml|presentationml)/i.test(file.type)
  );
}

export function isSupportedFile(file: File): boolean {
  return isImageFile(file) || isPdfFile(file) || isTextFile(file) || isOfficeFile(file);
}

export function describeUnsupported(file: File): string {
  const ext = file.name.split(".").pop()?.toUpperCase() || "this";
  return `${ext} files can't be read directly. Upload a PDF, DOCX, XLSX, PPTX, CSV, text file or image instead.`;
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
  if (WORD_EXT.test(file.name)) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (SPREADSHEET_EXT.test(file.name)) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function xmlToText(xml: string): string {
  return decodeXml(
    xml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function textNodes(xml: string): string {
  return Array.from(xml.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/gi), (match) =>
    decodeXml(match[1]).trim(),
  )
    .filter(Boolean)
    .join(" ");
}

async function extractOfficeText(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files);
  const uncompressedBytes = entries.reduce(
    (total, entry) => total + ((entry as ZipEntryWithSize)._data?.uncompressedSize ?? 0),
    0,
  );
  if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
    throw new Error(`"${file.name}" expands to too much data to import safely.`);
  }

  const names = Object.keys(zip.files);
  const read = async (name: string) => zip.files[name]?.async("text") ?? "";

  if (WORD_EXT.test(file.name)) {
    const wordParts = names.filter((name) => /^word\/(document|header\d+|footer\d+)\.xml$/i.test(name));
    const parts = await Promise.all(wordParts.map(read));
    return parts.map(textNodes).filter(Boolean).join("\n\n");
  }

  if (SPREADSHEET_EXT.test(file.name)) {
    const sharedStrings = await read("xl/sharedStrings.xml");
    const sheets = names
      .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const sheetText = await Promise.all(sheets.map(async (name) => xmlToText(await read(name))));
    return [textNodes(sharedStrings), ...sheetText].filter(Boolean).join("\n\n");
  }

  if (PRESENTATION_EXT.test(file.name)) {
    const slides = names
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const contents = await Promise.all(slides.map(async (name) => textNodes(await read(name))));
    return contents
      .map((text, index) => (text ? `Slide ${index + 1}: ${text}` : ""))
      .filter(Boolean)
      .join("\n\n");
  }

  throw new Error(describeUnsupported(file));
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
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" is too large — split it or export fewer pages.`);
    }
    return { name: file.name, mimeType: "application/pdf", dataUrl: await readAsDataUrl(file) };
  }
  if (isTextFile(file)) {
    const text = await readAsText(file);
    if (!text.trim()) throw new Error(`"${file.name}" appears to be empty.`);
    return { name: file.name, mimeType: file.type || "text/plain", text: text.slice(0, MAX_EXTRACTED_CHARS) };
  }
  if (isOfficeFile(file)) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" is too large — split it or export fewer pages.`);
    }
    const text = await extractOfficeText(file);
    if (!text.trim()) {
      throw new Error(`"${file.name}" contains no readable text. Export it as a PDF and try again.`);
    }
    return { name: file.name, mimeType: officeMimeType(file), text: text.slice(0, MAX_EXTRACTED_CHARS) };
  }
  throw new Error(describeUnsupported(file));
}
