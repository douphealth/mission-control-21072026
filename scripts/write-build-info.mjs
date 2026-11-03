import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
// Nitro can retain existing public assets across builds. Clear only known
// generated outputs so deployment metadata and assets always match this build.
for (const output of ['../dist', '../.output']) {
  rmSync(new URL(output, import.meta.url), { recursive: true, force: true });
}
let commit = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || '';
if (!/^[a-f0-9]{40}$/i.test(commit)) {
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { commit = 'unknown'; }
}
mkdirSync('public', { recursive: true });
writeFileSync('public/build-info.json', JSON.stringify({ app: 'mission-control', commit, builtAt: new Date().toISOString() }) + '\n');
