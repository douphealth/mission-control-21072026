import type { StreamItem, Task } from "./db";

/** One durable capture identity per saved story; never invent a deadline or a factual conclusion. */
export function buildIntelligenceCapture(item: StreamItem, capturedAt = new Date().toISOString()): Task {
  return {
    id: `intel-capture-${item.id}`,
    title: `Review: ${item.title}`.slice(0, 240),
    priority: "medium",
    status: "todo",
    dueDate: "",
    category: item.kind === "mention" ? "Brand mentions" : "Research",
    description: [
      `Source: ${item.url}`,
      `Publisher: ${item.source || "Not supplied"}`,
      `${item.dateBasis === "published" ? "Published" : "Discovered"}: ${item.publishedAt}`,
      item.matchedTerm ? `Watched identity: ${item.matchedTerm}` : undefined,
      item.verificationReason ? `Match evidence: ${item.verificationReason}` : undefined,
      item.summary,
      "Captured from intelligence for review. Publisher claims have not been independently fact-checked.",
    ].filter(Boolean).join("\n\n"),
    linkedProject: "",
    subtasks: [],
    createdAt: capturedAt,
    inbox: true,
    area: "work",
    tags: ["intelligence", item.kind],
  };
}
