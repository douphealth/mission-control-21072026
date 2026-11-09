import type { ReactNode } from "react";

type Props = { value: string; className?: string };

/**
 * Deliberately small Markdown renderer. Text is always represented as React
 * nodes, never injected as HTML, so HTML/scripts in private notes stay inert.
 * Only explicit https/http links are clickable.
 */
function inline(source: string): ReactNode[] {
  const tokens = source.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g);
  return tokens.filter(Boolean).map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index} className="rounded bg-muted px-1 font-mono text-xs">{token.slice(1, -1)}</code>;
    const match = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token);
    if (match) {
      try {
        const url = new URL(match[2]);
        if (url.protocol === "https:" || url.protocol === "http:") return <a key={index} href={url.href} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-2">{match[1]}</a>;
      } catch { /* Render invalid Markdown links as inert text. */ }
    }
    return token;
  });
}

export default function SafeMarkdownPreview({ value, className = "" }: Props) {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  return <div className={`min-w-0 break-words text-sm leading-relaxed ${className}`}>
    {lines.map((line, index) => {
      const heading = /^(#{1,4})\s+(.+)$/.exec(line);
      if (heading) {
        const size = heading[1].length <= 2 ? "text-base font-bold" : "font-semibold";
        return <div key={index} className={`mb-1 mt-3 ${size}`}>{inline(heading[2])}</div>;
      }
      const bullet = /^\s*[-*+]\s+(.+)$/.exec(line);
      if (bullet) return <div key={index} className="flex gap-2 pl-2"><span aria-hidden="true">•</span><span>{inline(bullet[1])}</span></div>;
      const number = /^\s*(\d+)\.\s+(.+)$/.exec(line);
      if (number) return <div key={index} className="flex gap-2 pl-2"><span>{number[1]}.</span><span>{inline(number[2])}</span></div>;
      const quote = /^>\s?(.*)$/.exec(line);
      if (quote) return <blockquote key={index} className="my-1 border-l-2 border-primary/50 pl-3 text-muted-foreground">{inline(quote[1])}</blockquote>;
      if (!line.trim()) return <div key={index} className="h-3" aria-hidden="true" />;
      return <p key={index} className="whitespace-pre-wrap">{inline(line)}</p>;
    })}
  </div>;
}
