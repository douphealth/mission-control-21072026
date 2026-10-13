import assert from 'node:assert/strict';

// Synthetic fixture records only. The caller blocks every external network request.
export async function runIntakeChecks(page, check, engine) {
  async function go(section) {
    await page.evaluate(async section => (await import('/src/stores/navigationStore.ts')).useNavigationStore.getState().setActiveSection(section), section);
    if (section !== 'credentials') await page.locator(`[data-testid="library-${section === 'ai-prompts' ? 'prompts' : 'links'}"]`).waitFor();
  }
  async function closeDialog(dialog) { await dialog.getByRole('button', { name: 'Close', exact: true }).first().click(); }
  async function test(name, fn) {
    await check(name, async () => {
      try { return await fn(); }
      finally { if (await page.getByRole('dialog').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(100); } }
    });
  }
  await test('Affiliate spreadsheet headings and explicit valid-only save preserve attribution and exclude private columns', async () => {
    await go('links'); await page.getByRole('button', { name: 'Bulk add', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Bulk add links' });
    const suffix = crypto.randomUUID(), url = `https://example.com/A/${suffix}?sig=A%2Bb&ref=Case#Offer`;
    const headers = ['Program', 'Category', 'Type', 'Affiliate/referral link', 'Strategy status', 'Verdict', 'HTTP', 'Final URL', 'Tracking evidence', 'Notes', 'Affiliate Dashboard', 'Username', 'Password'];
    const row = ['QA Partner', 'Social Media', 'Ambassador/referral', url, 'USE NOW', 'APPROVED', '200', 'https://example.com/', 'Ref path', 'A note', 'https://example.com/dashboard', 'private@example.com', 'synthetic-private-only'];
    const pending = [...row]; pending[0] = 'Pending partner'; pending[3] = 'RETRIEVE FROM DASHBOARD';
    const raw = [headers.join('\t'), row.join('\t'), pending.join('\t')].join('\n');
    const box = dialog.getByRole('textbox', { name: 'Bulk library input' }); await box.fill(raw);
    await dialog.getByRole('button', { name: 'Preview entries' }).click(); await dialog.getByText('1 valid entries; 1 errors').waitFor();
    const save = dialog.getByRole('button', { name: 'Save 1 valid entries', exact: true }); assert(await save.isDisabled());
    const details = dialog.locator('details').filter({ hasText: 'Column mapping (13 columns)' });
    if (!(await details.evaluate(element => element.open))) await details.locator('summary').first().click();
    assert(await dialog.getByRole('combobox', { name: 'Column 13 mapping', exact: true }).isDisabled());
    await dialog.getByRole('checkbox', { name: /Import valid rows only/ }).check(); await save.click();
    await dialog.getByRole('status').filter({ hasText: 'Selected entries were saved' }).waitFor();
    assert.equal(await box.inputValue(), raw);
    const stored = await page.evaluate(async url => (await import('/src/lib/db.ts')).db.links.filter(row => row.url === url).toArray(), url);
    assert.equal(stored.length, 1); assert.equal(stored[0].url, url); assert.equal(stored[0].kind, 'affiliate');
    assert.equal(stored[0].strategyStatus, 'USE NOW'); assert.equal(stored[0].vertical, 'Social media'); assert(!JSON.stringify(stored).includes('synthetic-private-only')); assert(!JSON.stringify(stored).includes('private@example.com'));
    assert(await dialog.getByRole('button', { name: 'Selected rows saved' }).isDisabled());
    await closeDialog(dialog);
  });
  await test('Manual column mapping chooses the referral link instead of the dashboard URL', async () => {
    await go('links'); await page.getByRole('button', { name: 'Bulk add', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Bulk add links' });
    await dialog.getByRole('textbox', { name: 'Bulk library input' }).fill('Example\thttps://example.com/dashboard\thttps://example.com/ref?tag=fixture');
    await dialog.getByRole('button', { name: 'Preview entries' }).click();
    await dialog.getByRole('combobox', { name: 'Column 2 mapping', exact: true }).selectOption('__ignore__');
    await dialog.getByRole('combobox', { name: 'Column 3 mapping', exact: true }).selectOption('url');
    await dialog.getByText('1 valid entries; 0 errors').waitFor();
    await dialog.getByText('affiliate / https://example.com/ref?tag=fixture', { exact: true }).waitFor();
    assert(await dialog.getByRole('button', { name: 'Save batch' }).isDisabled());
    await dialog.getByRole('checkbox', { name: /I checked the column mapping/ }).check();
    assert(await dialog.getByRole('button', { name: 'Save batch' }).isEnabled());
    await closeDialog(dialog);
  });
  await test('Credential dialog preserves quoted secret whitespace and dates while explicitly leaving an invalid row out', async () => {
    await go('credentials'); await page.getByRole('button', { name: 'Bulk add', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Paste many credentials at once' });
    const label = `QA mapped vault ${crypto.randomUUID()}`;
    const raw = `Label\tService\tLogin URL\tEmail\tPassword\tDate\tNotes\n${label}\tFixture\thttps://example.com\tfixture@example.com\t"  synthetic-only  "\t22/4/2020\t"Line one\nLine two"\nNo account\t\t\t\t\t\t`;
    await dialog.getByRole('textbox', { name: 'Bulk credential input' }).fill(raw);
    await dialog.getByText('1 valid entries; 1 errors').waitFor();
    const save = dialog.getByRole('button', { name: 'Save 1 valid entries', exact: true }); assert(await save.isDisabled());
    await dialog.getByRole('checkbox', { name: /Import valid rows only/ }).check(); await save.click();
    await dialog.getByRole('status').filter({ hasText: 'Selected entries were saved' }).waitFor();
    const state = await page.evaluate(async label => {
      const { db } = await import('/src/lib/db.ts'); const { decryptOrNull } = await import('/src/lib/encryption.ts');
      const rows = await db.credentials.filter(row => row.label === label).toArray();
      return { count: rows.length, encrypted: rows[0]?.password.startsWith('mcenc:v2:'), exact: await decryptOrNull(rows[0]?.password || '') === '  synthetic-only  ', category: rows[0]?.category, notes: rows[0]?.notes };
    }, label);
    assert.equal(state.count, 1); assert(state.encrypted); assert(state.exact); assert.equal(state.category, 'General'); assert(state.notes.includes('Date: 22/4/2020')); assert(state.notes.includes('Line one\nLine two'));
    assert.equal(await dialog.getByRole('textbox', { name: 'Bulk credential input' }).inputValue(), raw);
    for (const width of [390, 1440]) { await page.setViewportSize({ width, height: 950 }); await page.waitForTimeout(100); assert(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 2)); await page.screenshot({ path: `quality-artifacts/${engine}-vault-intake-${width}.png` }); }
    await closeDialog(dialog);
  });
  await test('Twelve prompt labels become twelve separately categorized stored entries', async () => {
    await go('ai-prompts'); await page.getByRole('button', { name: 'Bulk add', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Bulk add AI prompts' });
    const suffix = crypto.randomUUID();
    const raw = Array.from({ length: 12 }, (_, i) => `## Prompt ${i + 1}: QA ${suffix} ${i % 2 ? 'Python review' : 'SEO audit'}\nYou are a specialist.\n1. Read the input.\n2. Explain.\n`).join('\n');
    await dialog.getByRole('textbox', { name: 'Bulk library input' }).fill(raw);
    await dialog.getByRole('button', { name: 'Preview entries' }).click(); await dialog.getByText('12 valid entries; 0 errors').waitFor();
    assert.equal(await dialog.getByRole('textbox', { name: 'Entry 1 category', exact: true }).inputValue(), 'SEO & content');
    assert.equal(await dialog.getByRole('textbox', { name: 'Entry 2 category', exact: true }).inputValue(), 'Development');
    for (const width of [390, 1440]) { await page.setViewportSize({ width, height: 950 }); await page.waitForTimeout(100); assert(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 2)); await page.screenshot({ path: `quality-artifacts/${engine}-prompt-intake-${width}.png` }); }
    await dialog.getByRole('button', { name: 'Save batch', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    const count = await page.evaluate(async suffix => (await import('/src/lib/db.ts')).db.notes.filter(row => row.kind === 'ai-prompt' && row.title.includes(suffix)).count(), suffix);
    assert.equal(count, 12);
  });
  await test('Split entry repairs an existing combined prompt without deleting the original', async () => {
    const title = `QA combined ${crypto.randomUUID()}`;
    const content = `Prompt 1: ${title} SEO\nYou are an SEO expert.\n\nPrompt 2: ${title} Code\nAct as a Python reviewer.`;
    const id = await page.evaluate(async ({ title, content }) => (await import('/src/stores/dataStore.ts')).useDataStore.getState().addItem('notes', { title, content, kind: 'ai-prompt', category: 'General', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false, color: 'emerald' }), { title, content });
    await go('ai-prompts'); await page.getByRole('textbox', { name: 'Search library' }).fill(title);
    await page.locator('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).getByRole('button', { name: 'Split entry', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Bulk add AI prompts' });
    await dialog.getByRole('button', { name: 'Preview entries' }).click(); await dialog.getByText('2 valid entries; 0 errors').waitFor();
    await dialog.getByRole('button', { name: 'Save batch', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
    const original = await page.evaluate(async id => (await import('/src/lib/db.ts')).db.notes.get(id), id);
    assert.equal(original.content, content); assert.notEqual(original.status, 'archived');
  });
  await test('Ambiguous long text cannot silently be saved as one prompt', async () => {
    await go('ai-prompts'); await page.getByRole('button', { name: 'Bulk add', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Bulk add AI prompts' });
    await dialog.getByRole('textbox', { name: 'Bulk library input' }).fill('Ordinary prose. '.repeat(60) + '\n\n' + 'Second independent item. '.repeat(60));
    await dialog.getByRole('button', { name: 'Preview entries' }).click(); await dialog.getByText('1 valid entries; 0 errors').waitFor();
    assert(await dialog.getByRole('button', { name: 'Save batch', exact: true }).isDisabled());
    await dialog.getByRole('combobox', { name: 'Prompt split rule' }).selectOption('paragraphs');
    await dialog.getByRole('button', { name: 'Preview entries' }).click(); await dialog.getByText('2 valid entries; 0 errors').waitFor();
    assert(await dialog.getByRole('button', { name: 'Save batch', exact: true }).isEnabled()); await closeDialog(dialog);
  });
  await test('441 valid credential rows and five unresolved rows remain individually accounted for', async () => {
    const result = await page.evaluate(async () => {
      const { previewBulkIntake } = await import('/src/lib/bulkIntake.ts');
      const lines = ['Account name\tDescription\tLogin URL\tEmail\tPassword\tDate\tNotes'];
      for (let i = 0; i < 446; i++) lines.push([9, 20, 21, 30, 31].includes(i) ? '\tOnly metadata\t\t\t\t\t' : `Fixture ${i}\tDescription\thttps://example.com/${i}\tu${i}@example.com\tfixture-${i}\t22/4/2020\tNote`);
      const started = performance.now(); const parsed = previewBulkIntake('credentials', lines.join('\n'));
      return { valid: parsed.rows.length, unresolved: parsed.issues.length, categories: parsed.rows.every(row => row.category === 'General'), elapsedMs: Math.round(performance.now() - started) };
    });
    assert.equal(result.valid, 441); assert.equal(result.unresolved, 5); assert(result.categories); assert(result.elapsedMs < 3000); return result;
  });

  await test('Full 441-row encrypted UI import leaves five invalid rows recoverable', async () => {
    await go('credentials'); await page.getByRole('button', { name: 'Bulk add', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Paste many credentials at once' });
    const batch = `QA large ${crypto.randomUUID()}`;
    const lines = ['Account name\tDescription\tLogin URL\tEmail\tPassword\tDate\tNotes'];
    for (let i = 0; i < 446; i++) lines.push([9, 20, 21, 30, 31].includes(i) ? '\tOnly metadata\t\t\t\t\t' : `${batch} ${i}\tFixture service\thttps://example.com/${i}\tu${i}@example.com\tsynthetic-${i}\t22/4/2020\tRetain this note`);
    const raw = lines.join('\n');
    await dialog.getByRole('textbox', { name: 'Bulk credential input' }).fill(raw);
    await dialog.getByText('441 valid entries; 5 errors').waitFor();
    const save = dialog.getByRole('button', { name: 'Save 441 valid entries', exact: true });
    assert(await save.isDisabled());
    await dialog.getByRole('checkbox', { name: /Import valid rows only/ }).check();
    assert.equal(await dialog.getByRole('checkbox', { name: /Include entry/ }).count(), 20);
    const started = Date.now();
    await save.click();
    await dialog.getByRole('status').filter({ hasText: 'Selected entries were saved' }).waitFor({ timeout: 120000 });
    const duration = Date.now() - started;
    const state = await page.evaluate(async batch => {
      const { db } = await import('/src/lib/db.ts'); const { decryptOrNull } = await import('/src/lib/encryption.ts');
      const rows = await db.credentials.filter(row => row.label.startsWith(batch + ' ')).toArray();
      const first = rows.find(row => row.label === batch + ' 0');
      return { count: rows.length, ids: new Set(rows.map(row => row.id)).size, encrypted: rows.every(row => row.password.startsWith('mcenc:v2:')), category: rows.every(row => row.category === 'General'), firstDecrypts: await decryptOrNull(first?.password || '') === 'synthetic-0' };
    }, batch);
    assert.deepEqual(state, { count: 441, ids: 441, encrypted: true, category: true, firstDecrypts: true });
    assert.equal(await dialog.getByRole('textbox', { name: 'Bulk credential input' }).inputValue(), raw);
    assert(await dialog.getByRole('button', { name: 'Selected rows saved' }).isDisabled());
    await closeDialog(dialog);
    return { encryptedRows: 441, retainedInvalidRows: 5, saveDurationMs: duration };
  });

}
