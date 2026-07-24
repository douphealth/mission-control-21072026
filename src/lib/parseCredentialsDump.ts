/**
 * Robust parser for messy, tab/column-separated credential dumps like the
 * user's WordPress hosting export (one column per website, multiple labelled
 * sections stacked vertically: WordPress Access / CyberPanel / FTP /
 * Cloudflare / RackNerd / Backup Email / Cloudflare API token / Virusdie).
 *
 * Returns categorised, per-site credential entries plus the website records
 * themselves. Emits high fidelity even when cells are empty and rows are
 * ragged.
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

const TLDS = new Set(['com','net','org','io','co','dev','app','info','biz','me','shop','store','ai','tech','blog','site','online','xyz','us','uk','eu']);
const IGNORED_HOSTS = new Set([
  'gmail.com','googlemail.com','yahoo.com','hotmail.com','outlook.com',
  'virusdie.com','new.virusdie.com','racknerd.com','nerdvm.racknerd.com',
  'cloudflare.com','wordpress.com','wordpress.org','google.com',
]);

function isSiteDomain(d: string): boolean {
  const parts = d.split('.');
  if (parts.length < 2) return false;
  const tld = parts[parts.length - 1].toLowerCase();
  return TLDS.has(tld);
}
function normalizeUrl(u: string): string {
  const s = u.trim().replace(/[,;]$/, '');
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return 'https://' + s;
}
function domainToName(d: string): string {
  const host = d.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  const base = host.split('.').slice(0, -1).join('.') || host;
  return base.split(/[-_.]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function isEmail(s: string): boolean {
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(s.trim());
}
function isUrlLike(s: string): boolean {
  return /^https?:\/\//i.test(s) || /\/wp-admin|\/wp-login|\/login/i.test(s) || /\.[a-z]{2,}\//i.test(s);
}
function isIpMaybePort(s: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}(?::\d{2,5})?$/.test(s.trim());
}
function stripLabel(s: string): string {
  // "username: foo" -> "foo", "password: bar" -> "bar", "Port: 5076" -> "5076"
  return s.replace(/^\s*(username|user|login|email|password|pass|pwd|port|host|ip|url|note|notes|2fa)\s*[:=]\s*/i, '').trim();
}

export function detectCredentialsDump(text: string): boolean {
  const wpCount = (text.match(/WordPress\s+Access/gi) || []).length;
  const cpCount = (text.match(/CyberPanel/gi) || []).length;
  const ftpCount = (text.match(/\bFTP:/gi) || []).length;
  const cfCount = (text.match(/\bCloudflare:/gi) || []).length;
  const adminUrls = (text.match(/\/wp-admin/gi) || []).length;
  return wpCount >= 2 || cpCount >= 2 || ftpCount >= 2 || cfCount >= 2 || adminUrls >= 2;
}

/** Split a line into columns. Tabs are strongest; fall back to 2+ spaces. */
function splitCols(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map(s => s.trim());
  return line.split(/ {2,}/).map(s => s.trim());
}

type SectionKind = 'wp' | 'cyberpanel' | 'ftp' | 'cloudflare' | 'racknerd' | 'backup-email' | 'cf-api' | 'virusdie' | 'unknown';

function classifyHeader(row: string[]): SectionKind | null {
  const joined = row.filter(Boolean).join(' | ').toLowerCase();
  if (!joined) return null;
  if (/wordpress\s+access/.test(joined)) return 'wp';
  if (/^cyberpanel:?\s*(\|\s*cyberpanel:?)*$/.test(joined) || (/cyberpanel/.test(joined) && row.filter(Boolean).every(c => /cyberpanel/i.test(c)))) return 'cyberpanel';
  if (/^ftp:?\s*(\|\s*ftp:?)*$/.test(joined) || row.filter(Boolean).every(c => /^ftp:?$/i.test(c))) return 'ftp';
  if (row.filter(Boolean).every(c => /^cloudflare:?$/i.test(c))) return 'cloudflare';
  if (/login\s*-\s*racknerd/.test(joined) || row.filter(Boolean).every(c => /racknerd/i.test(c))) return 'racknerd';
  if (/email account for backups/.test(joined)) return 'backup-email';
  if (/cloudflare api token/.test(joined)) return 'cf-api';
  if (/website antivirus|virusdie/.test(joined)) return 'virusdie';
  return null;
}

/**
 * Column-aware section parser. Returns per-column arrays of trimmed
 * non-empty values in the order they appeared (labels stripped).
 */
function collectSectionValues(bodyRows: string[][], numCols: number): string[][] {
  const perCol: string[][] = Array.from({ length: numCols }, () => []);
  for (const row of bodyRows) {
    for (let c = 0; c < numCols; c++) {
      const raw = (row[c] ?? '').trim();
      if (!raw) continue;
      // Drop rows that are just the section header repeated (defensive)
      if (classifyHeader([raw])) continue;
      perCol[c].push(stripLabel(raw));
    }
  }
  return perCol;
}

export function parseCredentialsDump(text: string): SplitCategory[] | null {
  if (!detectCredentialsDump(text)) return null;

  const lines = text.split(/\r?\n/).map(l => l.replace(/\s+$/,'')).filter(l => l.length > 0);
  const rows = lines.map(splitCols);

  // Find the domain header row: the first row with >=2 cells that look like site domains.
  let headerIdx = -1;
  let domainCols: (string | null)[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const domains = r.map(c => {
      const cleaned = c.replace(/^https?:\/\//i,'').replace(/^www\./i,'').split('/')[0].toLowerCase();
      if (!cleaned) return null;
      if (!isSiteDomain(cleaned)) return null;
      if (IGNORED_HOSTS.has(cleaned)) return null;
      return cleaned;
    });
    const count = domains.filter(Boolean).length;
    if (count >= 2) {
      headerIdx = i;
      domainCols = domains;
      break;
    }
  }
  if (headerIdx === -1) return null;

  const numCols = domainCols.length;
  const today = new Date().toISOString().split('T')[0];

  // Walk rows after header, grouping by section headers.
  type Section = { kind: SectionKind; body: string[][] };
  const sections: Section[] = [];
  let current: Section | null = null;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    // pad row to numCols
    const row = rows[i].slice(0, numCols);
    while (row.length < numCols) row.push('');
    const kind = classifyHeader(row);
    if (kind) {
      current = { kind, body: [] };
      sections.push(current);
    } else if (current) {
      current.body.push(row);
    }
  }

  // Build per-column data buckets
  interface SiteData {
    domain: string;
    wp: string[];
    cyberpanel: string[];
    ftp: string[];
    cloudflare: string[];
    racknerd: string[];
    backupEmail: string[];
    cfApi: string[];
    virusdie: string[];
  }
  const sites: SiteData[] = domainCols.map(d => ({
    domain: d ?? '',
    wp: [], cyberpanel: [], ftp: [], cloudflare: [], racknerd: [],
    backupEmail: [], cfApi: [], virusdie: [],
  }));

  for (const sec of sections) {
    const perCol = collectSectionValues(sec.body, numCols);
    for (let c = 0; c < numCols; c++) {
      const vals = perCol[c];
      if (!vals.length) continue;
      const bucket = sec.kind;
      if (bucket === 'wp') sites[c].wp.push(...vals);
      else if (bucket === 'cyberpanel') sites[c].cyberpanel.push(...vals);
      else if (bucket === 'ftp') sites[c].ftp.push(...vals);
      else if (bucket === 'cloudflare') sites[c].cloudflare.push(...vals);
      else if (bucket === 'racknerd') sites[c].racknerd.push(...vals);
      else if (bucket === 'backup-email') sites[c].backupEmail.push(...vals);
      else if (bucket === 'cf-api') sites[c].cfApi.push(...vals);
      else if (bucket === 'virusdie') sites[c].virusdie.push(...vals);
    }
  }

  // ── Build websites ──
  const websites: Record<string, any>[] = [];
  const credentials: Record<string, any>[] = [];

  for (const site of sites) {
    if (!site.domain) continue;
    const siteUrl = normalizeUrl(site.domain);
    const name = domainToName(site.domain);

    // WP values: pick first url-like as adminUrl; then first email as email;
    // remaining non-url/non-email in order → username, password (repeat for secondary pair).
    const wp = [...site.wp];
    const adminUrl = wp.find(v => isUrlLike(v) || v.toLowerCase().startsWith(site.domain));
    if (adminUrl) wp.splice(wp.indexOf(adminUrl), 1);
    const emails = wp.filter(isEmail);
    for (const e of emails) wp.splice(wp.indexOf(e), 1);
    // wp now holds usernames/passwords in original order
    const wpUsername = wp[0] || '';
    const wpPassword = wp[1] || '';
    const wpEmail = emails[0] || '';
    const wpUsername2 = wp[2] || '';
    const wpPassword2 = wp[3] || '';
    const wpEmail2 = emails[1] || '';

    const notesLines: string[] = [];
    if (wpUsername2 || wpPassword2 || wpEmail2) {
      notesLines.push(`Secondary WP user: ${wpUsername2} / ${wpPassword2}${wpEmail2 ? ' ('+wpEmail2+')' : ''}`);
    }
    if (site.virusdie.length) notesLines.push('Virusdie protected');

    websites.push({
      id: crypto.randomUUID(),
      name,
      url: siteUrl,
      wpAdminUrl: adminUrl ? normalizeUrl(adminUrl) : normalizeUrl(site.domain + '/wp-admin'),
      wpUsername,
      wpPassword,
      hostingProvider: site.cyberpanel.length ? 'CyberPanel' : (site.racknerd.length ? 'RackNerd' : ''),
      hostingLoginUrl: site.cyberpanel[0] ? normalizeUrl(site.cyberpanel[0]) : '',
      hostingUsername: site.cyberpanel[1] || '',
      hostingPassword: site.cyberpanel[2] || '',
      category: 'WordPress',
      status: 'active',
      notes: notesLines.join('\n'),
      plugins: [],
      dateAdded: today,
      lastUpdated: today,
    });

    // ── Emit credential entries per section ──
    const pushCred = (c: Record<string, any>) => credentials.push({
      id: crypto.randomUUID(),
      category: 'Infrastructure',
      createdAt: today,
      apiKey: '',
      ...c,
    });

    // WP main login (also mirrored as credential for quick access)
    if (wpUsername || wpPassword) {
      pushCred({
        label: `WordPress — ${name}`,
        service: 'WordPress',
        url: adminUrl ? normalizeUrl(adminUrl) : normalizeUrl(site.domain + '/wp-admin'),
        username: wpUsername,
        password: wpPassword,
        notes: wpEmail ? `Email: ${wpEmail}` : '',
        tags: [site.domain, 'wordpress'],
      });
    }
    if (wpUsername2 || wpPassword2) {
      pushCred({
        label: `WordPress (secondary) — ${name}`,
        service: 'WordPress',
        url: adminUrl ? normalizeUrl(adminUrl) : normalizeUrl(site.domain + '/wp-admin'),
        username: wpUsername2,
        password: wpPassword2,
        notes: wpEmail2 ? `Email: ${wpEmail2}` : '',
        tags: [site.domain, 'wordpress', 'secondary'],
      });
    }

    // CyberPanel: [ip:port, username, password, 2fa?]
    if (site.cyberpanel.length) {
      const [host, user, pass, ...rest] = site.cyberpanel;
      pushCred({
        label: `CyberPanel — ${name}`,
        service: 'CyberPanel',
        url: host ? (isIpMaybePort(host) ? `https://${host}` : normalizeUrl(host)) : '',
        username: user || 'admin',
        password: pass || '',
        notes: rest.join(' | '),
        tags: [site.domain, 'cyberpanel', 'hosting'],
      });
    }

    // FTP: [host, user, pass, port?]
    if (site.ftp.length) {
      const [host, user, pass, ...rest] = site.ftp;
      const portLine = rest.find(v => /^\d{2,5}$/.test(v) || /port/i.test(v)) || '22';
      pushCred({
        label: `FTP — ${name}`,
        service: 'FTP',
        url: host || '',
        username: user || 'root',
        password: pass || '',
        notes: `Port: ${portLine.replace(/[^\d]/g,'') || '22'}`,
        tags: [site.domain, 'ftp', 'hosting'],
      });
    }

    // Cloudflare: values may be "username: X"/"password: X" — already stripped by stripLabel
    if (site.cloudflare.length) {
      const [user, pass] = site.cloudflare;
      pushCred({
        label: `Cloudflare — ${name}`,
        service: 'Cloudflare',
        url: 'https://dash.cloudflare.com',
        username: user || '',
        password: pass || '',
        notes: '',
        tags: [site.domain, 'cloudflare', 'dns'],
      });
    }

    // RackNerd: [email, password, 2fa-code, url?, vmuser, vmpass]
    if (site.racknerd.length) {
      const rn = site.racknerd;
      const email = rn.find(isEmail) || '';
      const url = rn.find(v => /racknerd/i.test(v) && isUrlLike(v)) || 'https://nerdvm.racknerd.com/';
      // remove those we've claimed
      const remaining = rn.filter(v => v !== email && v !== url && !/^Control Panel/i.test(v));
      // remaining likely: [password, 2fa-code, vmuser, vmpass]
      const [password = '', twoFa = '', vmUser = '', vmPass = ''] = remaining;
      pushCred({
        label: `RackNerd — ${name}`,
        service: 'RackNerd',
        url: normalizeUrl(url),
        username: email,
        password,
        notes: [twoFa && `2FA backup: ${twoFa}`, vmUser && `VM user: ${vmUser}`, vmPass && `VM pass: ${vmPass}`].filter(Boolean).join('\n'),
        tags: [site.domain, 'racknerd', 'vps'],
      });
    }

    // Backup email account (used for CyberPanel snappymail etc.)
    if (site.backupEmail.length) {
      const be = site.backupEmail;
      const email = be.find(isEmail) || '';
      const password = be.find(v => v && v !== email) || '';
      if (email || password) {
        pushCred({
          label: `Backup Email — ${name}`,
          service: 'Email',
          url: '',
          username: email,
          password,
          notes: 'Backup mailbox associated with the site',
          tags: [site.domain, 'email', 'backup'],
        });
      }
    }

    // Cloudflare API token
    if (site.cfApi.length) {
      const cf = site.cfApi;
      const tokenName = cf.find(v => /^[a-z0-9-]+$/i.test(v) && v.length < 60) || '';
      const token = cf.find(v => /^[A-Za-z0-9_-]{25,}$/.test(v)) || '';
      if (token) {
        pushCred({
          label: `Cloudflare API — ${name}`,
          service: 'Cloudflare API',
          url: 'https://dash.cloudflare.com/profile/api-tokens',
          username: tokenName,
          password: '',
          apiKey: token,
          notes: 'Cloudflare API token',
          tags: [site.domain, 'cloudflare', 'api'],
        });
      }
    }

    // Virusdie
    if (site.virusdie.length) {
      pushCred({
        label: `Virusdie — ${name}`,
        service: 'Virusdie',
        url: 'https://new.virusdie.com/websites',
        username: '',
        password: '',
        notes: 'Website antivirus protection',
        tags: [site.domain, 'security', 'antivirus'],
        category: 'Security',
      });
    }
  }

  const categories: SplitCategory[] = [];
  if (websites.length) {
    categories.push({
      target: 'websites', meta: TARGET_META.websites, confidence: 'high',
      items: websites, fieldMap: {}, score: 100,
    });
  }
  if (credentials.length) {
    categories.push({
      target: 'credentials', meta: TARGET_META.credentials, confidence: 'high',
      items: credentials, fieldMap: {}, score: 95,
    });
  }
  return categories.length ? categories : null;
}
