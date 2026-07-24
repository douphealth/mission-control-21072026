import { aiParseImport } from '@/lib/aiImport.functions';
import {
  TARGET_META,
  normalizeItems,
  autoMapFields,
  type ImportTarget,
  type AutonomousImportResult,
} from '@/lib/importEngine';
import { parseCredentialsDump } from '@/lib/parseCredentialsDump';


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
  const result = (await aiParseImport({ data: { text, fileName } })) as {
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
