export type IdentityVerification =
  | "exact-domain"
  | "exact-handle"
  | "anchored-name"
  | "exact-brand";

export type IdentityMatch = {
  verification: IdentityVerification;
  confidence: "high" | "medium";
  matchedAnchors: string[];
  reason: string;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "over",
  "about",
  "after",
  "before",
  "στη",
  "στην",
  "στο",
  "στον",
  "στις",
  "στους",
  "και",
  "για",
  "από",
  "των",
  "της",
  "του",
  "ένα",
  "μια",
]);

export function normalizeIntelText(value: string): string {
  return (value || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function intelTokens(value: string): string[] {
  return normalizeIntelText(value).match(/[\p{L}\p{N}_]+/gu) ?? [];
}

function meaningfulTokens(value: string): string[] {
  return intelTokens(value).filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export function containsExactPhrase(text: string, phrase: string): boolean {
  const haystack = intelTokens(text);
  const needle = intelTokens(phrase.replace(/^@/, ""));
  if (!haystack.length || !needle.length || needle.length > haystack.length) return false;

  outer: for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[index + offset] !== needle[offset]) continue outer;
    }
    return true;
  }
  return false;
}

function normalizeDomain(value: string): string {
  const clean = normalizeIntelText(value).replace(/^https?:\/\//, "").replace(/^www\./, "");
  return clean.split(/[/?#]/)[0].replace(/\.$/, "");
}

function hostOf(value?: string): string {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLocaleLowerCase();
  } catch {
    return "";
  }
}

function containsExactDomain(text: string, domain: string): boolean {
  const haystack = normalizeIntelText(text);
  if (!domain) return false;
  let start = 0;
  while (start < haystack.length) {
    const index = haystack.indexOf(domain, start);
    if (index < 0) return false;
    const before = index > 0 ? haystack[index - 1] : "";
    const after = haystack[index + domain.length] ?? "";
    const domainChar = /[\p{L}\p{N}_.-]/u;
    if ((!before || !domainChar.test(before)) && (!after || !domainChar.test(after))) return true;
    start = index + domain.length;
  }
  return false;
}

function containsExactHandle(text: string, rawHandle: string): boolean {
  const clean = normalizeIntelText(rawHandle).replace(/^@/, "");
  if (!clean) return false;
  const handles = normalizeIntelText(text).match(/@[\p{L}\p{N}_]+/gu) ?? [];
  return handles.some((handle) => handle.slice(1) === clean);
}

export function matchIdentity(input: {
  term: string;
  type: string;
  anchors?: string[];
  negatives?: string[];
  text: string;
  sourceUrl?: string;
}): IdentityMatch | null {
  const term = input.term.trim();
  const anchors = (input.anchors ?? []).map((value) => value.trim()).filter(Boolean);
  const negatives = (input.negatives ?? []).map((value) => value.trim()).filter(Boolean);

  if (!term || negatives.some((negative) => containsExactPhrase(input.text, negative))) return null;

  const matchedAnchors = anchors.filter((anchor) => containsExactPhrase(input.text, anchor));

  if (input.type === "domain") {
    const domain = normalizeDomain(term);
    const sourceHost = hostOf(input.sourceUrl);
    const exactSource =
      sourceHost === domain || (domain.length > 0 && sourceHost.endsWith("." + domain));
    if (!exactSource && !containsExactDomain(input.text, domain)) return null;
    return {
      verification: "exact-domain",
      confidence: "high",
      matchedAnchors,
      reason: exactSource
        ? "The publisher/source host exactly matches the watched domain."
        : "The watched domain appears as a bounded domain identity in the coverage.",
    };
  }

  if (input.type === "handle") {
    if (!containsExactHandle(input.text, term)) return null;
    return {
      verification: "exact-handle",
      confidence: "high",
      matchedAnchors,
      reason: "The exact @handle appears in the coverage.",
    };
  }

  if (!containsExactPhrase(input.text, term)) return null;

  if (input.type === "name") {
    if (!matchedAnchors.length) return null;
    return {
      verification: "anchored-name",
      confidence: "high",
      matchedAnchors,
      reason: "The exact name and at least one configured identity anchor co-occur.",
    };
  }

  return {
    verification: "exact-brand",
    confidence: matchedAnchors.length ? "high" : "medium",
    matchedAnchors,
    reason: matchedAnchors.length
      ? "The exact brand phrase and at least one configured identity anchor co-occur."
      : "The exact brand phrase appears, but no identity anchor corroborates it.",
  };
}

export function queryRelevance(query: string, title: string, summary = ""): number {
  const queryTokens = [...new Set(meaningfulTokens(query))];
  if (!queryTokens.length) return 0;

  const titleTokens = new Set(meaningfulTokens(title));
  const bodyTokens = new Set(meaningfulTokens(title + " " + summary));
  const titleHits = queryTokens.filter((token) => titleTokens.has(token)).length;
  const bodyHits = queryTokens.filter((token) => bodyTokens.has(token)).length;
  const titleCoverage = titleHits / queryTokens.length;
  const bodyCoverage = bodyHits / queryTokens.length;
  const exactTitle = containsExactPhrase(title, query);
  const exactBody = exactTitle || containsExactPhrase(title + " " + summary, query);

  let score = bodyCoverage * 55 + titleCoverage * 25;
  if (exactTitle) score += 20;
  else if (exactBody) score += 12;

  // Multi-token searches should not score highly on a single coincidental token.
  if (queryTokens.length >= 3 && bodyCoverage < 0.5) score = Math.min(score, 39);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function titleSimilarity(left: string, right: string): number {
  const a = new Set(meaningfulTokens(left).filter((token) => token.length >= 3));
  const b = new Set(meaningfulTokens(right).filter((token) => token.length >= 3));
  if (!a.size || !b.size) return 0;

  let overlap = 0;
  a.forEach((token) => {
    if (b.has(token)) overlap += 1;
  });

  const containment = overlap / Math.min(a.size, b.size);
  const jaccard = overlap / (a.size + b.size - overlap);
  return Math.max(containment * 0.7 + jaccard * 0.3, 0);
}


export function publisherHost(item: { sourceUrl?: string; url?: string }): string {
  const preferred = item.sourceUrl || item.url || "";
  try {
    return new URL(preferred).hostname.replace(/^www\./, "").toLocaleLowerCase();
  } catch {
    return "";
  }
}

export function independentPublisherCorroboration(
  target: { title: string; sourceUrl?: string; url?: string },
  items: Array<{ title: string; sourceUrl?: string; url?: string }>,
  similarityThreshold = 0.56,
): { independentPublishers: number; publisherHosts: string[] } {
  const targetHost = publisherHost(target);
  const hosts = new Set<string>();
  if (targetHost) hosts.add(targetHost);

  for (const item of items) {
    if (item === target) continue;
    if (titleSimilarity(target.title, item.title) < similarityThreshold) continue;
    const host = publisherHost(item);
    if (host) hosts.add(host);
  }

  return {
    independentPublishers: hosts.size,
    publisherHosts: [...hosts].sort(),
  };
}

export function canonicalWebUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    [...url.searchParams.keys()].forEach((key) => {
      if (/^(utm_|fbclid|gclid|msclkid|ref|source)/i.test(key)) url.searchParams.delete(key);
    });
    url.hostname = url.hostname.toLocaleLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
    url.searchParams.sort();
    return url.toString().replace(/\?$/, "");
  } catch {
    return raw.trim();
  }
}

export function isRecentIso(value: string | undefined, days: number, now = Date.now()): boolean {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return timestamp <= now + 5 * 60_000 && timestamp >= now - days * 86_400_000;
}

export function isTrustedAudienceReading(reading: {
  status: string;
  followers: number | null;
  method?: string;
  identityVerified?: boolean;
}): boolean {
  return (
    reading.status === "ok" &&
    typeof reading.followers === "number" &&
    Number.isSafeInteger(reading.followers) &&
    reading.followers >= 0 &&
    (reading.method === "official-api" ||
      (reading.method === "public-page" && reading.identityVerified === true))
  );
}
