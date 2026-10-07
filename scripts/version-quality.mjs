import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const base = process.env.QUALITY_BASE_URL || 'http://127.0.0.1:4173';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Backup tests must only use an isolated local server.');
mkdirSync('quality-artifacts', { recursive:true });
const browser = await chromium.launch();
const results = [];
try {
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(base, { waitUntil:'networkidle' });
  await page.locator('#main-content').waitFor({ timeout:60000 });
  const run = async (name, fn) => {
    try { const data = await page.evaluate(fn); assert.equal(data.ok, true, JSON.stringify(data)); results.push({ name, status:'pass' }); }
    catch (error) { results.push({ name, status:'fail', error:error.message }); }
    console.log(JSON.stringify(results.at(-1)));
  };
  await run('Full localStorage does not prevent a verified IndexedDB backup', async () => {
    const versions = await import('/src/lib/versions.ts');
    const { versionDb } = await import('/src/lib/versionStorage.ts');
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('isolated quota fixture', 'QuotaExceededError'); };
    try {
      const saved = await versions.saveVersion({ name:'Quality quota backup' });
      return { ok:!!await versionDb.snapshots.get(saved.id) };
    } finally { Storage.prototype.setItem = original; }
  });
  await run('Legacy history is copied and verified before its old key is removed', async () => {
    const { versionDb, prepareVersionStorage, LEGACY_VERSIONS_KEY } = await import('/src/lib/versionStorage.ts');
    const snapshot = { id:'quality-legacy-copy', name:'Legacy fixture', createdAt:new Date().toISOString(), type:'manual', device:'test', counts:{ tasks:1 }, sizeBytes:100, payload:{ tasks:[{ id:'legacy-fixture', title:'Legacy data' }] } };
    localStorage.setItem(LEGACY_VERSIONS_KEY, JSON.stringify([snapshot]));
    await prepareVersionStorage();
    const saved = await versionDb.snapshots.get(snapshot.id);
    return { ok:localStorage.getItem(LEGACY_VERSIONS_KEY) === null && JSON.stringify(saved.payload) === JSON.stringify(snapshot.payload) };
  });
  await run('Conflicting legacy snapshot IDs preserve both original copies', async () => {
    const { versionDb, prepareVersionStorage, LEGACY_VERSIONS_KEY } = await import('/src/lib/versionStorage.ts');
    const snapshot = await versionDb.snapshots.get('quality-legacy-copy');
    const conflict = { ...snapshot, payload:{ tasks:[{ id:'different-fixture', title:'Do not discard' }] } };
    const raw = JSON.stringify([conflict]);
    localStorage.setItem(LEGACY_VERSIONS_KEY, raw);
    let failed = false;
    try { await prepareVersionStorage(); } catch { failed = true; }
    const saved = await versionDb.snapshots.get(snapshot.id);
    const ok = failed && localStorage.getItem(LEGACY_VERSIONS_KEY) === raw && JSON.stringify(saved.payload) === JSON.stringify(snapshot.payload);
    localStorage.removeItem(LEGACY_VERSIONS_KEY); // Synthetic test fixture only.
    return { ok };
  });
  await run('Restore rolls back every collection when a later write fails', async () => {
    const { db } = await import('/src/lib/db.ts');
    const { versionDb } = await import('/src/lib/versionStorage.ts');
    const { restoreVersion } = await import('/src/lib/versions.ts');
    const id = 'quality-atomic-restore';
    await db.tasks.put({ id:'quality-current-marker', title:'Keep current', status:'todo' });
    await versionDb.snapshots.put({ id, name:'Atomic test', createdAt:new Date().toISOString(), type:'manual', device:'test', counts:{ tasks:1, notes:1 }, sizeBytes:100, payload:{ tasks:[{ id:'quality-replacement', title:'New task' }], notes:[{ id:'quality-trigger-failure', title:'Fail this native write' }] } });
    const fail = (_key, row) => { if (row.id === 'quality-trigger-failure') throw new Error('Isolated write failure'); };
    db.notes.hook('creating', fail);
    let failed = false;
    try { await restoreVersion(id); } catch { failed = true; }
    finally { db.notes.hook('creating').unsubscribe(fail); }
    return { ok:failed && !!await db.tasks.get('quality-current-marker') && !await db.tasks.get('quality-replacement') };
  });
  await run('A failed safety backup stops restore before any local clearing', async () => {
    const { db } = await import('/src/lib/db.ts');
    const { versionDb } = await import('/src/lib/versionStorage.ts');
    const { restoreVersion } = await import('/src/lib/versions.ts');
    const fail = () => { throw new Error('Isolated backup failure'); };
    versionDb.snapshots.hook('creating', fail);
    let failed = false;
    try { await restoreVersion('quality-atomic-restore'); } catch { failed = true; }
    finally { versionDb.snapshots.hook('creating').unsubscribe(fail); }
    return { ok:failed && !!await db.tasks.get('quality-current-marker') };
  });
  await run('Portable version export omits credential values and marks its policy', async () => {
    const { db } = await import('/src/lib/db.ts');
    const { saveVersion, downloadVersionFile } = await import('/src/lib/versions.ts');
    await db.credentials.put({ id:'quality-vault-record', label:'Quality credential', apiKey:'fixture-private-not-real', password:'fixture-password-not-real', service:'test', username:'test', url:'https://example.invalid', notes:'', category:'test', createdAt:new Date().toISOString() });
    const saved = await saveVersion({ name:'Quality portable backup' });
    const original = URL.createObjectURL;
    let blob;
    URL.createObjectURL = value => { blob = value; return original.call(URL, value); };
    try { await downloadVersionFile(saved); }
    finally { URL.createObjectURL = original; }
    const text = await blob.text();
    const portable = JSON.parse(text);
    window.__qualityPortable = portable;
    return { ok:portable.secretPolicy === 'excluded' && !text.includes('fixture-private-not-real') && !text.includes('fixture-password-not-real') };
  });
  await run('Restoring a sanitized version preserves destination credentials', async () => {
    const { db } = await import('/src/lib/db.ts');
    const { importVersionFile, restoreVersion } = await import('/src/lib/versions.ts');
    const portable = window.__qualityPortable;
    if (!portable) return { ok:false, reason:'No sanitized backup captured' };
    const imported = await importVersionFile(new File([JSON.stringify(portable)], 'fixture.mcversion.json', { type:'application/json' }));
    await db.credentials.update('quality-vault-record', { apiKey:'new-destination-fixture', label:'Changed after backup' });
    await restoreVersion(imported.id);
    const restored = await db.credentials.get('quality-vault-record');
    return { ok:restored?.apiKey === 'new-destination-fixture' && restored?.label === 'Quality credential' };
  });
  // Screenshots are of this isolated browser's actual app, not design mockups.
  for (const theme of ['light', 'dark', 'sage']) {
    await page.evaluate(async value => {
      (await import('/src/stores/settingsStore.ts')).useSettingsStore.getState().setTheme(value);
      (await import('/src/stores/navigationStore.ts')).useNavigationStore.getState().setActiveSection('dashboard');
    }, theme);
    await page.waitForTimeout(500);
    await page.screenshot({ path:`quality-artifacts/today-${theme}.png` });
  }
} finally {
  writeFileSync('quality-artifacts/backup-results.json', JSON.stringify({ scope:'Native Chromium IndexedDB; isolated records, no live accounts.', results }, null, 2));
  await browser.close();
}
if (results.some(result => result.status === 'fail')) process.exitCode = 1;
