import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireCloudflareViewer } from "@/lib/cloudflareAccess.server";

const ItemSchema = z.object({ id: z.string().max(200), kind: z.enum(["note", "task"]), title: z.string().max(300), text: z.string().max(600) });
const InputSchema = z.object({ query: z.string().trim().min(2).max(500), items: z.array(ItemSchema).max(1500) });

export type SmartFindMatch = { id: string; reason: string };

/** Ranks the owner's non-sensitive notes/tasks against a natural-language description. */
export const smartFind = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ matches: SmartFindMatch[]; error?: string }> => {
    await requireCloudflareViewer(getRequest());
    if (!data.items.length) return { matches: [] };
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const catalog = data.items.map(i => `${i.id}\t${i.kind}\t${i.title}\t${i.text.replace(/\s+/g, " ")}`).join("\n");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        reasoning: { effort: "low" },
        instructions: "You find saved notes and tasks matching what the user describes. Match by meaning, synonyms and any language (English/Greek). Return only ids from the catalog, best first, at most 12. Return an empty list if nothing fits. Each reason is one short sentence.",
        input: [{ role: "user", content: `Looking for: ${data.query}\n\nCatalog (id\tkind\ttitle\ttext):\n${catalog}` }],
        text: { format: { type: "json_schema", name: "matches", strict: true, schema: { type: "object", additionalProperties: false, required: ["matches"], properties: { matches: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "reason"], properties: { id: { type: "string" }, reason: { type: "string" } } } } } } } },
      });
      const out = (res as { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }> }).output ?? [];
      const text = out.flatMap(o => o.type === "message" ? o.content ?? [] : []).find(c => c.type === "output_text")?.text ?? "{}";
      const ids = new Set(data.items.map(i => i.id));
      const parsed = JSON.parse(text) as { matches?: SmartFindMatch[] };
      return { matches: (parsed.matches ?? []).filter(m => ids.has(m.id)).slice(0, 12) };
    } catch (e) {
      if (e instanceof GatewayError) {
        const msg = e.code === "payment_required" ? "AI credits are used up." : e.code === "rate_limited" ? "Too many searches right now, try again in a minute." : "AI search is unavailable right now.";
        return { matches: [], error: msg };
      }
      return { matches: [], error: "AI search failed." };
    }
  });
