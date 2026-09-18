// Turns ANY file the user picks, drops or pastes into a payload the AI
// extraction engine can understand: images and PDFs travel as data URLs,
// text-like files are decoded to plain text.

export interface PreparedFile {
  name: string;
  mimeType: string;
  dataUrl?: string;
  text?: string;
}

const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|ya?ml|log|ics|vcf|html?|srt|vtt|sql|env|ini|conf|toml|rtf)$/i;

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

export function isSupportedFile(file: File): boolean {
  return isImageFile(file) || isPdfFile(file) || isTextFile(file);
}

export function describeUnsupported(file: File): string {
  const ext = file.name.split(".").pop()?.toUpperCase() || "this";
  return `${ext} files can't be read directly. Export it as PDF, CSV or text — or take a photo of it and drop that in.`;
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
  throw new Error(describeUnsupported(file));
}
