/**
 * Specialized parser for messy, concatenated credential dumps like:
 *
 *   site1.com site2.com site3.com
 *   WordPress Access: WordPress Access: WordPress Access:
 *   https://site1.com/wp-admin site2.com/wp-admin site3.com/wp-admin
 *   user1 user2 user3
 *   password1 password2 password3
 *   email1@x.com email2@x.com email3@x.com
 *   CyberPanel: CyberPanel: CyberPanel:
 *   ip1:8090 ip2:8090 ip3:8090
 *   admin admin admin
 *   ...
 *
 * Returns split categories that plug into the autonomousImport result.
 */
import { TARGET_META, type ImportTarget } from './importEngine';

interface SplitCategory {
  target: ImportTarget;
  meta: typeof TARGET_META[ImportTarget];
  confidence: 'high' | 'medium' | 'low';
  items: Record<string, any>[];
  fieldMap: Record<string, string>;
  score: number;
}

const DOMAIN_RE = /\b([a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+)\b/gi;
const TLDS = new Set(['com', 'net', 'org', 'io', 'co', 'dev', 'app', 'info', 'biz', 'me', 'shop', 'store', 'ai', 'tech', 'blog', 'site', 'online', 'xyz']);

function isSiteDomain(d: string): boolean {
  const tld = d.split('.').pop()!.toLowerCase();
  return TLDS.has(tld);
}

function normalizeUrl(u: string): string {
  const s = u.trim().replace(/[,;]$/, '');
  if (/^https?:\/\//i.test(s)) return s;
  return 'https://' + s;
}

function domainToName(d: string): string {
  const host = d.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  const base = host.split('.').slice(0, -1).join('.');
  return base
    .split(/[-_.]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || host;
}

export function detectCredentialsDump(text: string): boolean {
  // Trigger when the text looks like a bulk credentials export
  const wpCount = (text.match(/WordPress\s+Access/gi) || []).length;
  const cpCount = (text.match(/CyberPanel/gi) || []).length;
  const ftpCount = (text.match(/\bFTP:/gi) || []).length;
  const cfCount = (text.match(/\bCloudflare:/gi) || []).length;
  const adminUrls = (text.match(/\/wp-admin/gi) || []).length;

  return wpCount >= 2 || cpCount >= 2 || ftpCount >= 2 || cfCount >= 2 || adminUrls >= 2;
}

/**
 * Extract distinct site domains in order of first appearance,
 * ignoring provider domains (gmail.com, virusdie.com, racknerd.com, etc.).
 */
function extractSiteDomains(text: string): string[] {
  const ignore = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'virusdie.com', 'new.virusdie.com', 'racknerd.com', 'nerdvm.racknerd.com',
    'cloudflare.com', 'wordpress.com', 'wordpress.org', 'google.com',
  ]);
  const seen = new Set<string>();
  const out: string[] = [];
  const matches = text.matchAll(DOMAIN_RE);
  for (const m of matches) {
    const d = m[1].toLowerCase();
    if (!isSiteDomain(d)) continue;
    if (ignore.has(d)) continue;
    // skip email domains (preceded by @)
    const idx = m.index ?? 0;
    if (idx > 0 && text[idx - 1] === '@') continue;
    if (seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  return out;
}

/** Find an admin URL that matches a given site domain */
function findAdminUrl(text: string, domain: string): string {
  // look for `[https://]domain[/wp-admin|/login|/wp-login.php]`
  const re = new RegExp(`(https?://)?(www\\.)?${domain.replace(/\./g, '\\.')}(/[\\w\\-./]*)?`, 'gi');
  const matches = Array.from(text.matchAll(re));
  // Prefer one containing wp-admin or login
  const admin = matches.find(m => /wp-admin|wp-login|login/i.test(m[0]));
  if (admin) return normalizeUrl(admin[0].trim());
  if (matches[0]) return normalizeUrl(matches[0][0].trim());
  return normalizeUrl(domain);
}

/** Extract IPv4:port occurrences for CyberPanel/FTP sections */
function extractIps(text: string): string[] {
  const re = /\b(\d{1,3}(?:\.\d{1,3}){3})(?::\d{2,5})?\b/g;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(re)) {
    if (seen.has(m[0])) continue;
    seen.add(m[0]);
    out.push(m[0]);
  }
  return out;
}

function extractEmails(text: string): string[] {
  const re = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  return Array.from(new Set(Array.from(text.matchAll(re)).map(m => m[0].toLowerCase())));
}

/**
 * Try to parse the dump into website + credential entries.
 * Returns null when the dump doesn't match this shape.
 */
export function parseCredentialsDump(text: string): SplitCategory[] | null {
  if (!detectCredentialsDump(text)) return null;

  const domains = extractSiteDomains(text);
  if (domains.length === 0) return null;

  const nowIso = new Date().toISOString();
  const today = nowIso.split('T')[0];

  // Build websites — one per detected domain
  const websites: Record<string, any>[] = domains.map(d => {
    const url = normalizeUrl(d);
    const adminUrl = findAdminUrl(text, d);
    return {
      id: crypto.randomUUID(),
      name: domainToName(d),
      url,
      wpAdminUrl: adminUrl,
      wpUsername: '',
      wpPassword: '',
      hostingProvider: '',
      hostingLoginUrl: '',
      hostingUsername: '',
      hostingPassword: '',
      category: 'WordPress',
      status: 'active',
      notes: 'Imported from credentials dump',
      plugins: [],
      dateAdded: today,
      lastUpdated: today,
    };
  });

  const categories: SplitCategory[] = [
    {
      target: 'websites',
      meta: TARGET_META.websites,
      confidence: 'high',
      items: websites,
      fieldMap: {},
      score: 100,
    },
  ];

  // Build credential entries for infrastructure hosts (CyberPanel / FTP / Cloudflare / RackNerd)
  const creds: Record<string, any>[] = [];
  const emails = extractEmails(text);
  const primaryEmail = emails[0] || '';

  if (/CyberPanel/i.test(text)) {
    const ips = extractIps(text).filter(ip => /:80|:8090|:8443/.test(ip) || /^107\.|^104\./.test(ip));
    for (const ip of ips.slice(0, 20)) {
      creds.push({
        id: crypto.randomUUID(),
        label: `CyberPanel ${ip}`,
        service: 'CyberPanel',
        url: `https://${ip}`,
        username: 'admin',
        password: '',
        apiKey: '',
        notes: 'Detected from credentials dump. Fill in password manually.',
        category: 'Infrastructure',
        createdAt: today,
      });
    }
  }

  if (/\bFTP:/i.test(text)) {
    const ftpIps = extractIps(text);
    for (const ip of ftpIps.slice(0, 20)) {
      // Only include IPs without port that appear in FTP-ish context (heuristic: keep unique base IPs)
      const bare = ip.replace(/:.*$/, '');
      creds.push({
        id: crypto.randomUUID(),
        label: `FTP ${bare}`,
        service: 'FTP',
        url: bare,
        username: 'root',
        password: '',
        apiKey: '',
        notes: 'Detected from credentials dump. Fill in password manually.',
        category: 'Infrastructure',
        createdAt: today,
      });
    }
  }

  if (/Cloudflare/i.test(text) && primaryEmail) {
    creds.push({
      id: crypto.randomUUID(),
      label: 'Cloudflare Account',
      service: 'Cloudflare',
      url: 'https://dash.cloudflare.com',
      username: primaryEmail,
      password: '',
      apiKey: '',
      notes: 'Detected from credentials dump.',
      category: 'Infrastructure',
      createdAt: today,
    });
  }

  if (/RackNerd/i.test(text) && primaryEmail) {
    creds.push({
      id: crypto.randomUUID(),
      label: 'RackNerd Control Panel',
      service: 'RackNerd',
      url: 'https://nerdvm.racknerd.com/',
      username: primaryEmail,
      password: '',
      apiKey: '',
      notes: 'Detected from credentials dump.',
      category: 'Infrastructure',
      createdAt: today,
    });
  }

  if (/virusdie/i.test(text) && primaryEmail) {
    creds.push({
      id: crypto.randomUUID(),
      label: 'Virusdie',
      service: 'Virusdie',
      url: 'https://new.virusdie.com/websites',
      username: primaryEmail,
      password: '',
      apiKey: '',
      notes: 'Detected from credentials dump.',
      category: 'Security',
      createdAt: today,
    });
  }

  if (creds.length > 0) {
    categories.push({
      target: 'credentials',
      meta: TARGET_META.credentials,
      confidence: 'high',
      items: creds,
      fieldMap: {},
      score: 90,
    });
  }

  return categories;
}
