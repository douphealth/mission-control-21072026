import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FileText } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

describe("PageHeader", () => {
  it("renders the title, eyebrow, subtitle, live numbers and actions", () => {
    const out = html(
      createElement(PageHeader, {
        icon: FileText,
        eyebrow: "Capture",
        title: "Notes",
        subtitle: "Quick thoughts",
        tone: "amber",
        stats: [
          { label: "Notes", value: 12 },
          { label: "Pinned", value: 3, tone: "amber" },
        ],
        actions: createElement("button", { type: "button" }, "New note"),
      }),
    );
    expect(out).toContain("<h1");
    expect(out).toContain("Notes");
    expect(out).toContain("Capture");
    expect(out).toContain("Quick thoughts");
    expect(out).toContain("mc-pagehead--amber");
    expect(out).toContain("<dt>Pinned</dt>");
    expect(out).toContain("<dd>3</dd>");
    expect(out).toContain("New note");
  });

  it("leaves out the stats list and actions when a page has none", () => {
    const out = html(createElement(PageHeader, { icon: FileText, title: "Settings" }));
    expect(out).not.toContain("mc-pagehead-stats");
    expect(out).not.toContain("mc-pagehead-actions");
    expect(out).toContain("mc-pagehead--accent");
  });
});

describe("EmptyState", () => {
  it("is announced politely and shows one sentence and one next step", () => {
    const out = html(
      createElement(EmptyState, {
        icon: FileText,
        title: "No notes found",
        description: "Start a new note.",
        action: createElement("button", { type: "button" }, "New note"),
        tone: "violet",
      }),
    );
    expect(out).toContain('role="status"');
    expect(out).toContain("No notes found");
    expect(out).toContain("Start a new note.");
    expect(out).toContain("New note");
    expect(out).toContain('data-tone="violet"');
  });

  it("supports compact and borderless variants", () => {
    const out = html(
      createElement(EmptyState, {
        icon: FileText,
        title: "Nothing due",
        compact: true,
        bare: true,
      }),
    );
    expect(out).toContain("mc-empty--compact");
    expect(out).toContain("mc-empty--bare");
  });
});

describe("design layer", () => {
  const css = readFileSync("src/mc-design-system.css", "utf8");

  it("escapes the slash in every opacity selector so the production minifier accepts it", () => {
    const bad = css
      .split("\n")
      .filter((line) => line.startsWith(":root .text-") && /[a-z]\/\d/.test(line));
    expect(bad).toEqual([]);
  });

  it("never sets text below the 10px floor", () => {
    const small = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)]
      .map((match) => Number(match[1]))
      .filter((size) => size < 10);
    expect(small).toEqual([]);
  });

  it("loads after every other theme sheet", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    const order = [...root.matchAll(/href: (\w+Css)/g)].map((match) => match[1]);
    expect(order[order.length - 1]).toBe("mcDesignSystemCss");
  });
});

describe("celebration", () => {
  it("plans a deterministic burst that radiates in every direction", async () => {
    const { burstPlan } = await import("@/lib/celebrate");
    const first = burstPlan(14);
    expect(first).toHaveLength(14);
    expect(burstPlan(14)).toEqual(first);
    expect(first.some((p) => p.dx > 0)).toBe(true);
    expect(first.some((p) => p.dx < 0)).toBe(true);
    expect(first.every((p) => p.delay >= 0 && p.delay <= 60)).toBe(true);
    expect(new Set(first.map((p) => p.color)).size).toBeGreaterThan(1);
  });

  it("tells you how much of today is left, and marks a finished day", async () => {
    const { completionMessage } = await import("@/lib/celebrate");
    expect(completionMessage(null)).toEqual({ title: "Done", big: false });
    expect(completionMessage(3)).toEqual({ title: "Done", description: "3 left for today", big: false });
    const finished = completionMessage(0);
    expect(finished.title).toBe("Today is done");
    expect(finished.big).toBe(true);
  });

  it("marks streak milestones, and starts a new streak gently", async () => {
    const { habitMessage } = await import("@/lib/celebrate");
    expect(habitMessage("Walk", 1).description).toMatch(/Day one/);
    expect(habitMessage("Walk", 5)).toMatchObject({ description: "5-day streak", big: false });
    expect(habitMessage("Walk", 7).big).toBe(true);
    expect(habitMessage("Walk", 100).big).toBe(true);
  });

  it("does nothing without a browser", async () => {
    const { celebrate } = await import("@/lib/celebrate");
    expect(() => celebrate()).not.toThrow();
  });
});
