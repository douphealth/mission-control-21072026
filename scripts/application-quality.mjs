import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.QUALITY_BASE_URL || 'http://127.0.0.1:4173';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local isolated server required');
mkdirSync('quality-artifacts', { recursive: true });
const results = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Athens' });
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  return url.origin === new URL(base).origin ? route.continue() : route.abort();
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
async function check(name, test) {
  try {
    const detail = await test();
    results.push({ name, status: 'pass', detail });
  } catch (error) {
    results.push({ name, status: 'fail', error: String(error.message || error) });
  }
  console.log('QUALITY_RESULT', JSON.stringify(results.at(-1)));
}
async function go(section) {
  await page.evaluate(async id => {
    const mod = await import('/src/stores/navigationStore.ts');
    mod.useNavigationStore.getState().setActiveSection(id);
  }, section);
  await page.waitForTimeout(600);
}
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#main-content').waitFor({ timeout: 60000 });
  const sections = ['dashboard', 'now', 'tasks', 'calendar', 'projects', 'notes', 'focus', 'review', 'decisions', 'reminders', 'payments', 'habits', 'ideas', 'links', 'websites', 'wp-manage', 'github', 'builds', 'apps-funnels', 'seo', 'industry', 'mentions', 'audience', 'control-center', 'cloudflare', 'vercel', 'google-tasks', 'credentials', 'settings', 'demo'];
  for (const section of sections) {
    await check(`Workspace renders: ${section}`, async () => {
      const before = pageErrors.length;
      await go(section);
      const text = await page.locator('#main-content').innerText();
      assert(text.trim().length > 20, 'Empty workspace');
      assert(!/Mission Control hit an error|This section hit a problem|Something went wrong/i.test(text), 'Visible error boundary');
      assert.equal(pageErrors.length, before, pageErrors.slice(before).join('; '));
      return { characters: text.length, authenticatedProviderChecks: 'not tested' };
    });
  }
  await go('dashboard');
  await check('Capture prevents same-frame duplicate submissions', async function captureAndAssert() {
    const title = `Quality capture ${Date.now()}`;
    const input = page.getByRole('textbox', { name: 'Capture a task, note, idea, link or reminder' });
    await input.fill(title);
    await input.evaluate(el => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await page.waitForTimeout(1500);
    const count = await page.evaluate(async title => {
      const { db } = await import('/src/lib/db.ts');
      return db.tasks.filter(task => task.title === title).count();
    }, title);
    assert.equal(count, 1);
    assert.equal(await input.inputValue(), '');
  });
  await check('Aborted IndexedDB writes do not enter the sync journal', async () => {
    const result = await page.evaluate(async () => {
      const { db } = await import('/src/lib/db.ts');
      const id = `quality-abort-${crypto.randomUUID()}`;
      try {
        await db.transaction('rw', db.tasks, async () => {
          await db.tasks.put({ id, title: 'Aborted test row', status: 'todo' });
          throw new Error('Intentional test abort');
        });
      } catch { /* Expected abort in isolated test database. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
      const journal = JSON.parse(localStorage.getItem('mc-cloud-dirty-records-v3') || '{}');
      return { exists: !!await db.tasks.get(id), queued: !!journal[`tasks::${id}`] };
    });
    assert.deepEqual(result, { exists: false, queued: false });
  });
  await check('Quota-exhausted preferences do not crash', async () => {
    const failures = await page.evaluate(async () => {
      const nav = (await import('/src/stores/navigationStore.ts')).useNavigationStore;
      const plan = (await import('/src/stores/planStore.ts')).usePlanStore;
      const a11y = (await import('/src/stores/a11yStore.ts')).useA11yStore;
      const review = (await import('/src/stores/reviewStore.ts')).useReviewStore;
      const original = Storage.prototype.setItem;
      const failed = [];
      Storage.prototype.setItem = function (key, value) {
        if (/^mc-(navigation|plan|a11y|review)/.test(key)) throw new DOMException('Test quota', 'QuotaExceededError');
        return original.call(this, key, value);
      };
      try {
        const actions = [() => nav.getState().setActiveSection('tasks'), () => plan.getState().setArea('personal'), () => a11y.getState().set({ highContrast: false }), () => review.getState().markWeeklyReview('2026-10-07')];
        for (const action of actions) { try { action(); } catch (error) { failed.push(error.message); } }
      } finally { Storage.prototype.setItem = original; plan.getState().setArea('all'); }
      return failed;
    });
    assert.deepEqual(failures, []);
  });
  await go('dashboard');
  for (const width of [390, 768, 1024, 1440]) {
    await check(`Today layout at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => ['#main-content', '.mc13-capture', '.mc13-now-title'].filter(selector => {
        const element = document.querySelector(selector);
        return element && element.scrollWidth > element.clientWidth + 3;
      }));
      await page.screenshot({ path: `quality-artifacts/today-${width}.png`, fullPage: true });
      assert.deepEqual(overflow, [], `Overflow: ${overflow.join(', ')}`);
    });
  }
  await check('Mobile More scrolls to Settings', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'More', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'All workspaces' });
    const settings = sheet.getByRole('button', { name: /Settings/ });
    await settings.scrollIntoViewIfNeeded();
    assert(await settings.isVisible());
    await settings.click();
  });
  await check('Error diagnostics render untrusted text without HTML injection', async () => {
    const safe = await page.evaluate(async () => {
      const payload = '<img src=x onerror="window.__qualityInjected=true">';
      const { showFatalError } = await import('/src/lib/fatalError.ts');
      showFatalError(payload);
      await new Promise(resolve => setTimeout(resolve, 50));
      const overlay = document.getElementById('mc-fatal');
      return !window.__qualityInjected && !overlay.querySelector('img') && overlay.textContent.includes(payload);
    });
    assert.equal(safe, true);
  });
} catch (error) {
  results.push({ name: 'Browser harness', status: 'fail', error: String(error.stack || error) });
} finally {
  writeFileSync('quality-artifacts/results.json', JSON.stringify({ testedAt: new Date().toISOString(), scope: 'Isolated Chromium; synthetic local records. No real provider or multi-device validation.', results }, null, 2));
  console.log('QUALITY_SUMMARY', JSON.stringify({ passed: results.filter(item => item.status === 'pass').length, failed: results.filter(item => item.status === 'fail').length }));
  await browser.close();
}
if (results.some(item => item.status === 'fail')) process.exitCode = 1;
