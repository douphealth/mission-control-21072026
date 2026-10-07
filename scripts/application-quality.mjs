import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.QUALITY_BASE_URL || 'http://127.0.0.1:4173';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) {
  throw new Error('Quality tests may write fixture data ONLY to a local, isolated test server.');
}
mkdirSync('quality-artifacts', { recursive: true });
const results = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Athens' });
// Never contact or authenticate to any real third-party service.
await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function check(name, test) {
  const start = performance.now();
  try { const detail = await test(); results.push({ name, status: 'pass', ms: Math.round(performance.now() - start), detail }); }
  catch (error) { results.push({ name, status: 'fail', error: error.message }); }
  console.log(JSON.stringify(results.at(-1)));
}
async function until(test, message) {
  for (let n = 0; n < 60; n++) { if (await test()) return; await page.waitForTimeout(200); }
  throw new Error(message);
}
async function go(section) {
  await page.evaluate(async id => (await import('/src/stores/navigationStore.ts')).useNavigationStore.getState().setActiveSection(id), section);
  await page.waitForTimeout(550);
  await page.locator('#main-content').waitFor();
}
await page.goto(base, { waitUntil: 'networkidle' });
await page.locator('#main-content').waitFor({ timeout: 60000 });

const sections = ['dashboard','now','tasks','calendar','projects','notes','focus','review','decisions','reminders','payments','habits','ideas','links','websites','wp-manage','github','builds','apps-funnels','seo','industry','mentions','audience','control-center','cloudflare','vercel','google-tasks','credentials','settings','demo'];
for (const section of sections) {
  await check(`Render workspace: ${section}`, async () => {
    const before = errors.length;
    await go(section);
    const text = await page.locator('#main-content').innerText();
    assert(text.trim().length > 20, 'Workspace is empty');
    assert(!/Mission Control hit an error|This section hit a problem|Something went wrong/i.test(text), 'Workspace error boundary visible');
    assert.equal(errors.length, before, errors.slice(before).join('; '));
    return { characters: text.length };
  });
}
await go('dashboard');
await check('Capture: one task for two immediate Enter events', async () => {
  const title = `Quality capture ${Date.now()}`;
  const input = page.getByRole('textbox', { name: 'Capture a task, note, idea, link or reminder' });
  await input.fill(title);
  await input.evaluate(el => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await until(async () => await input.inputValue() === '', 'Capture did not finish');
  const rows = await page.evaluate(async title => (await import('/src/lib/db.ts')).db.tasks.filter(t => t.title === title).toArray(), title);
  assert.equal(rows.length, 1, `Expected one record; got ${rows.length}`);
});
await check('Aborted native IndexedDB transaction creates no sync journal entry', async () => {
  const result = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.ts');
    const id = `quality-abort-${crypto.randomUUID()}`;
    try { await db.transaction('rw', db.tasks, async () => { await db.tasks.put({ id, title: 'Aborted quality fixture', status: 'todo' }); throw new Error('intentional abort'); }); } catch { /* expected */ }
    await new Promise(r => setTimeout(r, 100));
    return { exists: !!await db.tasks.get(id), journaled: !!JSON.parse(localStorage.getItem('mc-cloud-dirty-records-v3') || '{}')[`tasks::${id}`] };
  });
  assert.equal(result.exists, false);
  assert.equal(result.journaled, false, 'An aborted transaction left a put/delete in the sync queue');
});
await check('Quota exhaustion: navigation, planning, accessibility and review remain usable', async () => {
  const failed = await page.evaluate(async () => {
    const nav = (await import('/src/stores/navigationStore.ts')).useNavigationStore;
    const plan = (await import('/src/stores/planStore.ts')).usePlanStore;
    const a11y = (await import('/src/stores/a11yStore.ts')).useA11yStore;
    const review = (await import('/src/stores/reviewStore.ts')).useReviewStore;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (/^mc-(navigation|plan|a11y|review)/.test(key)) throw new DOMException('fixture quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    const failures = [];
    try {
      for (const [name, action] of [['navigation', () => nav.getState().setActiveSection('tasks')], ['planning', () => plan.getState().setArea('personal')], ['accessibility', () => a11y.getState().set({ highContrast: false })], ['review', () => review.getState().markWeeklyReview('2026-10-07')]]) {
        try { action(); } catch (error) { failures.push(`${name}: ${error.name}`); }
      }
    } finally { Storage.prototype.setItem = original; plan.getState().setArea('all'); }
    return failures;
  });
  assert.deepEqual(failed, []);
});
await go('dashboard');
for (const width of [390, 768, 1024, 1440]) {
  await page.setViewportSize({ width, height: 1000 });
  await check(`Today layout: ${width}px`, async () => {
    await page.waitForTimeout(350);
    const layout = await page.evaluate(() => {
      const root = document.querySelector('#main-content');
      const capture = document.querySelector('.mc13-capture');
      const hero = document.querySelector('.mc13-now-title');
      const bad = [root, capture, hero].filter(Boolean).filter(el => el.scrollWidth > el.clientWidth + 3).map(el => el.className);
      return { bad, viewport: innerWidth, mainWidth: root?.clientWidth, mainScrollWidth: root?.scrollWidth };
    });
    await page.screenshot({ path: `quality-artifacts/today-${width}.png`, fullPage: true });
    assert.deepEqual(layout.bad, [], `Horizontal overflow: ${JSON.stringify(layout)}`);
    return layout;
  });
}
await page.setViewportSize({ width: 390, height: 844 });
await check('Mobile More is reachable and scrolls to Settings', async () => {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'All workspaces' });
  await sheet.waitFor();
  const settings = sheet.getByRole('button', { name: /Settings/ });
  await settings.scrollIntoViewIfNeeded();
  assert(await settings.isVisible());
  await settings.click();
  await page.waitForTimeout(500);
});
await check('Fatal error text is rendered as text, never injected HTML', async () => {
  const safe = await page.evaluate(async () => {
    const payload = '<img src=x onerror="window.__qualityInjected=true">';
    window.dispatchEvent(new ErrorEvent('error', { message: payload, error: new Error(payload) }));
    await new Promise(r => setTimeout(r, 80));
    const overlay = document.getElementById('mc-fatal');
    return !window.__qualityInjected && !overlay?.querySelector('img') && overlay?.textContent.includes(payload);
  });
  assert.equal(safe, true, 'Error message was interpreted as HTML');
});
await page.reload({ waitUntil: 'networkidle' });
await page.locator('#main-content').waitFor({ timeout: 60000 });

await check('Mock Drive + native IndexedDB: aborted apply retries, no false saved status', async () => {
  const source = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.ts');
    const records = {};
    for (const table of db.tables) {
      if (table.name === 'syncHealth') continue;
      for (const row of await table.toArray()) records[`${table.name}::${row.id}`] = { data: row, deleted: false, updatedAt: new Date().toISOString(), revision: `fixture-${row.id}` };
    }
    localStorage.setItem('mc-cloud-dirty-records-v3', '{}');
    localStorage.setItem('mc_google_access_token_v1', JSON.stringify({ access_token: 'isolated-quality-token-not-a-real-credential', expires_at: Date.now()+3600000, scope: 'https://www.googleapis.com/auth/drive.appdata' }));
    return records;
  });
  const goodKey = 'tasks::quality-rollback-first';
  const badKey = 'tasks::quality-rollback-second';
  let good = false;
  const record = (id, valid) => ({ data: valid ? { id, title: 'Isolated sync fixture', status: 'todo' } : { id }, deleted: false, updatedAt: '2026-10-07T10:00:00.000Z', revision: `fixture-${id}` });
  await context.route('https://www.googleapis.com/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/upload/')) return route.fulfill({ status: 500, body: 'Unexpected upload in isolated test' });
    const data = url.searchParams.get('alt') === 'media' ? { version: 2, writerId: 'quality', updatedAt: '2026-10-07T10:00:00.000Z', records: { ...source, [goodKey]: record('quality-rollback-first', true), [badKey]: record('quality-rollback-second', good) } } : { files: [{ id: 'quality-file', name: 'mission-control-sync-v2-quality.json', modifiedTime: good ? '2' : '1' }] };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await context.route('https://openidconnect.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'quality@example.invalid', email_verified: true }) }));
  const first = await page.evaluate(async () => {
    const sync = await import('/src/lib/cloudSync.ts');
    const result = await sync.forceCloudSync();
    const { db } = await import('/src/lib/db.ts');
    return { result, exists: !!await db.tasks.get('quality-rollback-first'), state: sync.getRecordSyncState('tasks','quality-rollback-first') };
  });
  assert.equal(first.result.ok, false, 'Malformed remote row was accepted');
  assert.equal(first.exists, false, 'Transaction rollback failed');
  assert.notEqual(first.state, 'saved', 'Aborted record was incorrectly confirmed');
  good = true;
  const second = await page.evaluate(async () => {
    const sync = await import('/src/lib/cloudSync.ts');
    const result = await sync.retryCloudPush();
    const { db } = await import('/src/lib/db.ts');
    return { result, exists: !!await db.tasks.get('quality-rollback-first'), unknown: sync.getRecordSyncState('tasks','never-synced-fixture') };
  });
  assert.equal(second.result.ok, true, JSON.stringify(second.result));
  assert.equal(second.exists, true, 'Retry skipped a row from the aborted transaction');
  assert.notEqual(second.unknown, 'saved', 'Global synced status falsely confirmed an unknown record');
});

writeFileSync('quality-artifacts/results.json', JSON.stringify({ testedAt: new Date().toISOString(), base, scope: 'Isolated Chromium; synthetic records and mocked Drive. No real account validation.', results }, null, 2));
console.log('QUALITY_SUMMARY', JSON.stringify({ passed: results.filter(r=>r.status==='pass').length, failed: results.filter(r=>r.status==='fail').length }));
await browser.close();
if (results.some(r => r.status === 'fail')) process.exitCode = 1;
