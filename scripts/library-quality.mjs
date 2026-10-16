import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
const base = process.env.QUALITY_BASE_URL || 'http://127.0.0.1:4173';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Isolated local server required');
const results = [];
await mkdir('quality-artifacts', { recursive: true });
for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await type.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const check = async (name, run) => {
    try { const detail = await run(); results.push({ engine, name, status: 'pass', detail }); }
    catch (error) { results.push({ engine, name, status: 'fail', error: error.message }); }
    console.log('LIBRARY_RESULT', JSON.stringify(results.at(-1)));
  };
  async function go(id) {
    await page.evaluate(async id => (await import('/src/stores/navigationStore.ts')).useNavigationStore.getState().setActiveSection(id), id);
    await page.locator(`[data-testid="library-${id === 'ai-prompts' ? 'prompts' : 'links'}"]`).waitFor();
  }
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('#main-content').waitFor({ timeout: 60000 });
    await check('Duplicate credential rows receive valid IDs; encrypted reimport is idempotent', async () => {
      const result = await page.evaluate(async () => {
        const { useDataStore } = await import('/src/stores/dataStore.ts');
        const { db } = await import('/src/lib/db.ts');
        const { decryptOrNull } = await import('/src/lib/encryption.ts');
        const { parseCredentialBatch } = await import('/src/lib/credentialBulk.ts');
        const name = `QA vault ${crypto.randomUUID()}`;
        const input = JSON.stringify([{ label: name, service: 'Test', username: 'synthetic', password: 'synthetic-test-only', notes: '' }, { label: name, service: 'Test', username: 'synthetic', password: 'synthetic-test-only', notes: 'Enrichment' }]);
        const parsed = parseCredentialBatch(input);
        if (parsed.errors.length) throw new Error('Credential fixture did not parse');
        const first = await useDataStore.getState().bulkAddItems('credentials', parsed.items);
        const second = await useDataStore.getState().bulkAddItems('credentials', parsed.items);
        const saved = await db.credentials.filter(row => row.label === name).toArray();
        return { count: saved.length, validId: !!saved[0]?.id, encrypted: saved[0]?.password.startsWith('mcenc:v2:'), decrypts: await decryptOrNull(saved[0]?.password || '') === 'synthetic-test-only', first: { created: first.created, updated: first.updated }, second: { created: second.created, updated: second.updated }, enriched: saved[0]?.notes === 'Enrichment' };
      });
      assert.deepEqual(result, { count: 1, validId: true, encrypted: true, decrypts: true, first: { created: 1, updated: 0 }, second: { created: 0, updated: 0 }, enriched: true });
    });
    await check('Conflicting credentials block the entire batch without secret disclosure', async () => {
      const result = await page.evaluate(async () => {
        const { useDataStore } = await import('/src/stores/dataStore.ts'); const { db } = await import('/src/lib/db.ts');
        const label = `QA conflict ${crypto.randomUUID()}`;
        let message = '';
        try { await useDataStore.getState().bulkAddItems('credentials', [{ label, password: 'synthetic-one' }, { label, password: 'synthetic-two' }]); } catch (error) { message = error.message; }
        return { count: await db.credentials.filter(row => row.label === label).count(), blocked: /different secret|conflicts/.test(message), leaks: /synthetic-one|synthetic-two/.test(message) };
      });
      assert.deepEqual(result, { count: 0, blocked: true, leaks: false });
    });
    await check('Failed bulk writes roll back all rows; concurrent imports stay unique', async () => {
      const result = await page.evaluate(async () => {
        const { useDataStore } = await import('/src/stores/dataStore.ts'); const { db } = await import('/src/lib/db.ts');
        const title = `QA atomic ${crypto.randomUUID()}`;
        let failed = false;
        try { await useDataStore.getState().bulkAddItems('links', [{ title, url: `https://example.com/${title}/a` }, { title, url: `https://example.com/${title}/b`, badClone: () => 1 }]); } catch { failed = true; }
        const rolledBack = await db.links.filter(row => row.title === title).count() === 0;
        const link = { title: title + ' concurrent', url: `https://example.com/${encodeURIComponent(title)}/one` };
        await Promise.all([useDataStore.getState().bulkAddItems('links', [link]), useDataStore.getState().bulkAddItems('links', [link])]);
        return { failed, rolledBack, unique: await db.links.filter(row => row.url === link.url).count() === 1 };
      });
      assert.deepEqual(result, { failed: true, rolledBack: true, unique: true });
    });
    await check('Full affiliate URLs on one host remain separate and retain tracking', async () => {
      const result = await page.evaluate(async () => {
        const { useDataStore } = await import('/src/stores/dataStore.ts'); const { parseLibraryIntake } = await import('/src/lib/libraryIntake.ts');
        const suffix = crypto.randomUUID();
        const urls = [`https://example.com/${suffix}/A?tag=alex-20`, `https://example.com/${suffix}/A?tag=other-20`, `https://example.com/${suffix}/a?tag=alex-20`];
        const parsed = parseLibraryIntake('links', urls.join('\n'));
        const saved = await useDataStore.getState().bulkAddItems('links', parsed.rows);
        const { db } = await import('/src/lib/db.ts'); const actual = await db.links.bulkGet(saved.ids);
        return { created: saved.created, intact: JSON.stringify(actual.map(row => row.url)) === JSON.stringify(urls) };
      });
      assert.deepEqual(result, { created: 3, intact: true });
    });
    const promptTitle = `QA prompt ${Date.now()}`;
    const original = 'Analyze {{topic}}.\n\n1. Preserve examples.\n2. Explain tradeoffs.\n---\nKeep this rule.';
    await check('Prompt UI previews without writes, saves once and fills variables without mutation', async () => {
      await go('ai-prompts');
      await page.getByRole('button', { name: 'Bulk add', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Bulk add AI prompts' });
      await dialog.getByRole('textbox', { name: 'Bulk library input' }).fill(JSON.stringify([{ title: promptTitle, content: original, model: 'Any model', tags: ['research'] }]));
      await dialog.getByRole('button', { name: 'Preview entries' }).click();
      await dialog.getByText('1 valid entries; 0 errors').waitFor();
      const before = await page.evaluate(async title => (await import('/src/lib/db.ts')).db.notes.filter(row => row.title === title).count(), promptTitle);
      assert.equal(before, 0);
      await dialog.getByRole('button', { name: 'Save batch' }).evaluate(button => { button.click(); button.click(); });
      await dialog.waitFor({ state: 'hidden' });
      const search = page.getByRole('textbox', { name: 'Search library' }); await search.fill(promptTitle);
      await page.getByRole('button', { name: 'Use prompt', exact: true }).click();
      const use = page.getByRole('dialog', { name: promptTitle });
      await use.getByRole('textbox', { name: 'topic', exact: true }).fill('time management');
      assert.equal(await use.getByRole('textbox', { name: 'Prompt preview' }).inputValue(), original.replace('{{topic}}', 'time management'));
      await use.getByRole('button', { name: 'Close', exact: true }).click();
      const saved = await page.evaluate(async title => (await import('/src/lib/db.ts')).db.notes.filter(row => row.title === title).toArray(), promptTitle);
      assert.equal(saved.length, 1); assert.equal(saved[0].content, original); assert.equal(saved[0].kind, 'ai-prompt');
    });
    await check('JSON export round trips the complete prompt', async () => {
      const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export view' }).click();
      const file = await download; const filePath = await file.path();
      const exported = JSON.parse(await readFile(filePath, 'utf8'));
      assert.equal(exported.prompts.length, 1); assert.equal(exported.prompts[0].content, original);
    });
    await check('Import errors require explicit opt-in and storage failures retain drafts', async () => {
      await go('links'); await page.getByRole('button', { name: 'Bulk add', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Bulk add links' });
      const box = dialog.getByRole('textbox', { name: 'Bulk library input' });
      await box.fill('[{"url":"https://example.com/valid"},{"url":"javascript:x"}]');
      await dialog.getByRole('button', { name: 'Preview entries' }).click();
      await dialog.getByText('1 valid entries; 1 errors').waitFor();
      assert(await dialog.getByRole('button', { name: /^Save (?:batch|\d+ valid entries)$/ }).isDisabled());
      const raw = `https://example.com/qa-failure-${Date.now()}`;
      await box.fill(raw); await dialog.getByRole('button', { name: 'Preview entries' }).click();
      await page.evaluate(async () => { const { useDataStore } = await import('/src/stores/dataStore.ts'); window.__libraryBulk = useDataStore.getState().bulkAddItems; useDataStore.setState({ bulkAddItems: async () => { throw new Error('Synthetic storage failure'); } }); });
      await page.waitForTimeout(100);
      await dialog.getByRole('button', { name: 'Save batch' }).click();
      await dialog.getByRole('alert').filter({ hasText: 'Synthetic storage failure' }).waitFor();
      assert.equal(await box.inputValue(), raw);
      await page.evaluate(async () => { const { useDataStore } = await import('/src/stores/dataStore.ts'); useDataStore.setState({ bulkAddItems: window.__libraryBulk }); delete window.__libraryBulk; });
      await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();
    });
    await (await import('./intake-quality.mjs')).runIntakeChecks(page, check, engine);
    await (await import('./premium-quality.mjs')).runPremiumChecks(page, check, engine);
    await check('Libraries persist across reload and fit mobile; screenshots', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('#main-content').waitFor(); await go('ai-prompts');
      await page.getByRole('textbox', { name: 'Search library' }).fill(promptTitle);
      await page.locator('article').filter({ has: page.getByRole('heading', { name: promptTitle, exact: true }) }).getByRole('button', { name: 'Use prompt', exact: true }).waitFor();
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 950 }); await page.waitForTimeout(200);
        const fits = await page.locator('[data-testid="library-prompts"]').evaluate(el => el.scrollWidth <= el.clientWidth + 2);
        assert(fits, `Prompt library overflows at ${width}px`);
        await page.screenshot({ path: `quality-artifacts/${engine}-prompts-${width}.png`, fullPage: true });
      }
    });
  } catch (error) { results.push({ engine, name: 'Library harness', status: 'fail', error: error.message }); }
  finally { await context.close(); await browser.close(); }
}
await writeFile('quality-artifacts/library-results.json', JSON.stringify({ scope: 'Isolated Chromium/WebKit with synthetic records and blocked external requests. No live provider or family-device test.', results }, null, 2));
console.log('LIBRARY_SUMMARY', JSON.stringify({ passed: results.filter(r => r.status === 'pass').length, failed: results.filter(r => r.status === 'fail').length }));
if (results.some(r => r.status === 'fail')) process.exitCode = 1;
