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

  for (const raw of input.split(/\r\n|\r|\n|;|,(?=\s+[^\d])/u)) {
    const title = raw.replace(/^\s*(?:(?:[-*•]\s+)?\[[ xX]\]\s*|[-*•]\s+|\d+[.)]\s+)/u, "").trim();
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

/** Preserve identity and checked state; never drop pending pasted items on Save. */
export function appendChecklistItems<T extends { id: string; title: string; done: boolean }>(existing: T[], text: string): Array<T | { id: string; title: string; done: boolean }> {
  if (existing.some(item => !item.title.trim())) throw new Error("Give each checklist item a name or remove the empty item.");
  const seen = new Set(existing.map(item => item.title.trim().normalize("NFC").toLocaleLowerCase()));
  const additions = parseChecklistItems(text).filter(title => { const key = title.normalize("NFC").toLocaleLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }).map(title => ({ id: crypto.randomUUID(), title, done: false }));
  if (existing.length + additions.length > MAX_CHECKLIST_ITEMS) throw new Error(`A task can contain at most ${MAX_CHECKLIST_ITEMS} checklist items.`);
  return [...existing, ...additions];
}
