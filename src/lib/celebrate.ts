// A small, kind celebration for finishing things.
// Pure planning lives here so it can be tested. The DOM part never blocks input
// and stays silent for anyone who asked for reduced motion.

export interface BurstParticle {
  dx: number;
  dy: number;
  delay: number;
  /** Index into PALETTE. */
  color: number;
}

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--violet))",
  "hsl(var(--warning))",
  "hsl(var(--rose))",
];

/** A deterministic spread: organic to the eye, identical on every run. */
export function burstPlan(count: number): BurstParticle[] {
  return Array.from({ length: count }, (_, index) => {
    const jitter = Math.abs((Math.sin((index + 1) * 12.9898) * 43758.5453) % 1);
    const angle = (Math.PI * 2 * index) / count + (jitter - 0.5) * 0.5;
    const distance = 34 + jitter * 52;
    return {
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance - 18),
      delay: Math.round(jitter * 60),
      color: index % PALETTE.length,
    };
  });
}

export interface CompletionMessage {
  title: string;
  description?: string;
  /** The whole day is finished: celebrate a little more. */
  big: boolean;
}

/**
 * What to say when a task is finished.
 * `plannedLeft` is how many other open tasks are planned for today, or null when the
 * finished task was not part of today's plan.
 */
export function completionMessage(plannedLeft: number | null): CompletionMessage {
  if (plannedLeft === null) return { title: "Done", big: false };
  if (plannedLeft === 0) {
    return {
      title: "Today is done",
      description: "Everything you planned is finished. Enjoy the rest of it.",
      big: true,
    };
  }
  return { title: "Done", description: `${plannedLeft} left for today`, big: false };
}

const MILESTONES = new Set([7, 14, 21, 30, 50, 100, 200, 365]);

/** What to say when a habit is checked off. */
export function habitMessage(name: string, streak: number): CompletionMessage {
  if (streak <= 1)
    return { title: `${name} done`, description: "Day one. The streak starts here.", big: false };
  return {
    title: `${name} done`,
    description: `${streak}-day streak`,
    big: MILESTONES.has(streak),
  };
}

let lastPointer: { x: number; y: number } | null = null;

if (typeof window !== "undefined") {
  // Remember where the last tap landed, so the burst comes from the checkbox you just pressed.
  window.addEventListener(
    "pointerdown",
    (event) => {
      lastPointer = { x: event.clientX, y: event.clientY };
    },
    { capture: true, passive: true },
  );
}

/** Pops a short burst of colour. Safe to call anywhere: it does nothing without a browser. */
export function celebrate(options: { count?: number; x?: number; y?: number } = {}): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  if (document.documentElement.classList.contains("a11y-reduce-motion")) return;

  const x = options.x ?? lastPointer?.x ?? window.innerWidth / 2;
  const y = options.y ?? lastPointer?.y ?? window.innerHeight * 0.6;
  const layer = document.createElement("div");
  layer.className = "mc-celebrate";
  layer.setAttribute("aria-hidden", "true");

  for (const particle of burstPlan(options.count ?? 14)) {
    const dot = document.createElement("span");
    dot.className = "mc-celebrate-dot";
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    dot.style.setProperty("--dx", `${particle.dx}px`);
    dot.style.setProperty("--dy", `${particle.dy}px`);
    dot.style.setProperty("--c", PALETTE[particle.color]);
    dot.style.animationDelay = `${particle.delay}ms`;
    layer.appendChild(dot);
  }

  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1100);
}
