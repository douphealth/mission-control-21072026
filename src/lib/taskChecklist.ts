export const MAX_CHECKLIST_ITEMS = 250;
const MAX_CHECKLIST_TEXT_LENGTH = 50_000;
const MAX_CHECKLIST_ITEM_LENGTH = 240;

/** Parse pasted checklist text locally, preserving first-seen order and removing duplicates. */
export function parseChecklistItems(input: string): string[] {
  if (input.length > MAX_CHECKLIST_TEXT_LENGTH) {
    throw new Error("Checklist text must be 50 KB or smaller.");
  }

  const seen = new Set<string>();
  const items: string[] = [];

  for (const raw of input.split(/\r?\n|[;,]/)) {
    const title = raw.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/u, "").trim();
    if (!title) continue;
    if (title.length > MAX_CHECKLIST_ITEM_LENGTH) {
      throw new Error(`Each checklist item must be ${MAX_CHECKLIST_ITEM_LENGTH} characters or fewer.`);
    }

    const key = title.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(title);

    if (items.length > MAX_CHECKLIST_ITEMS) {
      throw new Error(`Add at most ${MAX_CHECKLIST_ITEMS} checklist items at a time.`);
    }
  }

  return items;
}
