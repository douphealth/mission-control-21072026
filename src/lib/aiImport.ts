import { aiParseImport } from '@/lib/aiImport.functions';
import {
  TARGET_META,
  normalizeItems,
  autoMapFields,
  type ImportTarget,
  type AutonomousImportResult,
} from '@/lib/importEngine';
import { parseCredentialsDump } from '@/lib/parseCredentialsDump';
import { redactSecretText } from '@/lib/secrets';


function stringifyRow(item: Record<string, any>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(item)) {
    if (v == null) continue;
    if (Array.isArray(v)) out[k] = v.join(', ');
    else if (typeof v === 'object') out[k] = JSON.stringify(v);
    else out[k] = String(v);
  }
  return out;
}

/**
 * AI-first autonomous import: sends raw text to Lovable AI Gateway,
 * receives structured multi-category items, normalizes them through the
 * existing importEngine so downstream dedup/import stays identical.
 */
export async function aiAutonomousImport(text: string, fileName?: string): Promise<AutonomousImportResult> {
  // Fast, deterministic path for tabular credential/hosting dumps.
  // The AI struggles to align ragged tab-separated columns; the specialised
  // parser is 100% accurate for that shape and emits per-site credentials.
  const dump = parseCredentialsDump(text);
  if (dump && dump.length > 0) {
    const normalizedCats = dump.map((c) => {
      const rows = c.items.map(stringifyRow);
      const sourceFields = Array.from(
        new Set(rows.flatMap((r: Record<string, string>) => Object.keys(r))),
      ) as string[];
      const fieldMap = autoMapFields(sourceFields, c.target);
      const items = normalizeItems(rows, c.target, fieldMap);
      return { target: c.target, meta: TARGET_META[c.target], confidence: 'high' as const, items, fieldMap, score: 100 };
    }).filter(c => c.items.length > 0);
    const totalItems = normalizedCats.reduce((s, c) => s + c.items.length, 0);
    if (totalItems > 0) {
      return {
        categories: normalizedCats,
        parsedData: { rows: [], sourceFields: [], format: 'text' } as any,
        totalItems,
        expressReady: true,
      };
    }
  }

  // Anything that reaches an AI provider is redacted first. Real credential
  // dumps are handled above by the deterministic local parser, so nothing of
  // value is lost by stripping secret material from the prompt.
  const safeText = redactSecretText(text);
  const result = (await aiParseImport({ data: { text: safeText, fileName } })) as {
    categories: Array<{ target: ImportTarget; items: Record<string, any>[] }>;
  };
  const cats = result?.categories ?? [];



  const categories = cats
    .map((c) => {
      const target = c.target;
      const rows = c.items.map(stringifyRow);
      const sourceFields = Array.from(
        new Set(rows.flatMap((r: Record<string, string>) => Object.keys(r))),
      ) as string[];
      const fieldMap = autoMapFields(sourceFields, target);
      const items = normalizeItems(rows, target, fieldMap);
      return {
        target,
        meta: TARGET_META[target],
        confidence: 'high' as const,
        items,
        fieldMap,
        score: 100,
      };
    })
    .filter((c) => c.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);

  const totalItems = categories.reduce((s: number, c) => s + c.items.length, 0);

  return {
    categories,
    parsedData: { rows: [], sourceFields: [], format: 'text' } as any,
    totalItems,
    expressReady: totalItems > 0,
  };
}

function buildCategories(cats: Array<{ target: ImportTarget; items: Record<string, any>[] }>) {
  return cats
    .map((c) => {
      const rows = c.items.map(stringifyRow);
      const sourceFields = Array.from(
        new Set(rows.flatMap((r: Record<string, string>) => Object.keys(r))),
      ) as string[];
      const fieldMap = autoMapFields(sourceFields, c.target);
      const items = normalizeItems(rows, c.target, fieldMap);
      return {
        target: c.target,
        meta: TARGET_META[c.target],
        confidence: 'high' as const,
        items,
        fieldMap,
        score: 100,
      };
    })
    .filter((c) => c.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);
}

/**
 * Vision import: send photos of handwritten notes / whiteboards / screenshots
 * to the AI, which OCRs the handwriting and classifies every item.
 */
export async function aiImageImport(
  images: string[],
  fileName?: string,
  note?: string,
): Promise<AutonomousImportResult> {
  const result = (await aiParseImport({ data: { images, fileName, text: note ? redactSecretText(note) : note } })) as {
    categories: Array<{ target: ImportTarget; items: Record<string, any>[] }>;
  };
  const categories = buildCategories(result?.categories ?? []);
  const totalItems = categories.reduce((s: number, c) => s + c.items.length, 0);
  return {
    categories,
    parsedData: { rows: [], sourceFields: [], format: 'text' } as any,
    totalItems,
    expressReady: totalItems > 0,
  };
}

