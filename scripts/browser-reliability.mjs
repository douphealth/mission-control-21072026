import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { chromium, webkit } from 'playwright';

const root = process.cwd();
const temporary = path.join(root, '__mc_reliability_test__');
const output = path.join(temporary, 'dist');
const origin = 'http://127.0.0.1:4179';
const passed = [];
const browsers = [];
let server;
const pass = name => { passed.push(name); console.log('PASS', name); };
await mkdir(temporary, { recursive: true });
await mkdir('test-results', { recursive: true });
await writeFile(path.join(temporary, 'index.html'), '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>');
await writeFile(path.join(temporary, 'entry.tsx'), `
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useDataStore } from '@/stores/dataStore';
import * as cloud from '@/lib/cloudSync';
import TaskQuickEditor from '@/components/TaskQuickEditor';
import { TaskModal } from '@/pages/TasksPage';
import '@/styles.css';
const fixture = { id: 'editor-task', title: 'Editor fixture', description: 'A long description '.repeat(200), category: 'Business', linkedProject: '', subtasks: [], status: 'todo', priority: 'medium', dueDate: '', createdAt: '2026-10-01' };
const mode = new URLSearchParams(location.search).get('mode') || 'quick';
(window as any).__mc = { db, cloud, store: useDataStore };
function Harness() {
  const row = useLiveQuery(() => db.tasks.get('editor-task'), []);
  const [open, setOpen] = useState(true);
  useEffect(() => { if (mode !== 'sync') void db.tasks.put(fixture); }, []);
  if (mode === 'sync') return <p>Isolated synchronization test</p>;
  if (!row) return <p>Loading fixture</p>;
  return <div style={{ transform: 'translateZ(0)', height: 120, overflow: 'hidden' }}>
    {mode === 'full' ? <TaskModal open={open} task={row} onClose={() => setOpen(false)} onSave={async task => {
      if ((window as any).__failSave) throw new Error('Simulated storage failure');
      await useDataStore.getState().updateItem('tasks', row.id, task);
    }} /> : open && <TaskQuickEditor task={row} onClose={() => setOpen(false)} />}
  </div>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
`);

async function pageReady(context, mode) {
  const page = await context.newPage();
  page.on('pageerror', error => console.log('Browser error:', error.stack || error.message));
  await page.goto(`${origin}/?mode=${mode}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__mc);
  return page;
}
try {
  // Build a static test shell from the actual production components and stores.
  // No dev HMR server, SSR registry, app bootstrap or live user data is involved.
  await build({ configFile: false, root: temporary, publicDir: false,
    plugins: [react(), tailwind()], cacheDir: path.join(temporary, 'vite-cache'),
    resolve: { alias: { '@': path.join(root, 'src') } },
    build: { outDir: output, emptyOutDir: true, minify: false, sourcemap: true } });
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json' };
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url || '/', origin).pathname;
    const target = path.resolve(output, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(output + path.sep)) { response.writeHead(403); response.end(); return; }
    try { const body = await readFile(target); response.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(body); }
    catch { response.writeHead(404); response.end('Not found'); }
  });
  await new Promise(resolve => server.listen(4179, '127.0.0.1', resolve));
  for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await browserType.launch(); browsers.push(browser);
    try {
      for (const mode of ['quick', 'full']) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
        const page = await pageReady(context, mode);
        const save = page.locator('[data-task-dialog-frame] header button').filter({ hasText: 'Save changes' });
        await save.waitFor({ state: 'visible' }).catch(async error => {
          await page.screenshot({ path: `test-results/${engine}-${mode}-failure.png` });
          console.log('Harness page:', (await page.locator('body').innerText()).slice(0, 2000));
          throw error;
        });
        for (const [width, height] of [[390, 844], [360, 640], [812, 375], [360, 320]]) {
          await page.setViewportSize({ width, height });
          await page.waitForTimeout(150);
          await page.locator('[data-task-dialog-body]').evaluate(el => { el.scrollTop = el.scrollHeight; });
          const box = await save.boundingBox();
          assert(box && box.y >= 0 && box.y + box.height <= height && box.x >= 0 && box.x + box.width <= width,
            `${engine}/${mode} save outside ${width}x${height}: ${JSON.stringify(box)}`);
          assert(await save.evaluate(el => {
            const b = el.getBoundingClientRect(); const at = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
            return !!at && el.contains(at);
          }), 'Save is covered by another layer');
        }
        await page.setViewportSize({ width: 390, height: 844 });
        const title = page.getByPlaceholder(mode === 'quick' ? 'Task title' : 'Task title...', { exact: true });
        await title.fill(`Saved ${mode} ${engine}`);
        if (mode === 'full') {
          await page.evaluate(() => { window.__failSave = true; });
          await save.click(); await page.waitForTimeout(150);
          assert(await save.isVisible(), 'Failed save closed the editor');
          assert.equal(await title.inputValue(), `Saved ${mode} ${engine}`);
          await page.evaluate(() => { window.__failSave = false; });
          pass(`${engine}: failed task save retains draft and dialog`);
        }
        await page.screenshot({ path: `test-results/${engine}-${mode}-mobile-save.png` });
        await save.click();
        await page.waitForFunction(() => !document.querySelector('[data-task-dialog-frame]'));
        assert.equal(await page.evaluate(async () => (await window.__mc.db.tasks.get('editor-task'))?.title), `Saved ${mode} ${engine}`);
        pass(`${engine}: ${mode} editor save reachable at four viewport sizes and persists to IndexedDB`);
        await context.close();
      }
    } finally { await browser.close(); }
  }

  const browser = await chromium.launch(); browsers.push(browser);
  const files = new Map(); let sequence = 0; let failReadBack = false; let uploads = 0;
  const remoteRecord = id => ({ data: { id, title: id, description: '', status: 'todo', priority: 'medium', dueDate: '', category: '', linkedProject: '', subtasks: [], createdAt: '2026-10-01' }, deleted: false, updatedAt: '2026-10-01T01:00:00Z' });
  for (const id of ['legacy-a', 'legacy-b']) files.set(id, { id, name: 'mission-control-sync-v1.json', modifiedTime: '2026-10-01T01:00:00.000Z', backup: { version: 1, updatedAt: '', records: { [`tasks::${id}`]: remoteRecord(id) } } });
  const cors = { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'authorization,content-type', 'cache-control': 'no-store' };
  async function device(name) {
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname === '127.0.0.1') return route.continue();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (url.hostname === 'openidconnect.googleapis.com') return route.fulfill({ headers: cors, json: { email: request.headers().authorization?.includes('different') ? 'different@example.test' : 'same@example.test' } });
      if (url.hostname !== 'www.googleapis.com') return route.abort();
      if (url.pathname.startsWith('/upload/')) {
        uploads++;
        const parts = [...(request.postData() || '').matchAll(/Content-Type: application\/json(?:;[^\r]*)?\r\n\r\n([\s\S]*?)(?=\r\n--)/g)].map(m => JSON.parse(m[1]));
        assert.equal(parts.length, 2, 'Malformed Drive multipart upload');
        const id = request.method() === 'POST' ? `file-${++sequence}` : url.pathname.split('/').at(-1);
        files.set(id, { id, name: parts[0].name, modifiedTime: new Date(Date.now() + ++sequence).toISOString(), backup: parts[1] });
        return route.fulfill({ headers: cors, json: { id } });
      }
      if (url.searchParams.get('alt') === 'media') {
        const id = url.pathname.split('/').at(-1);
        if (failReadBack && id.startsWith('file-')) return route.fulfill({ status: 503, headers: cors, body: 'simulated unavailable' });
        return route.fulfill({ headers: cors, json: files.get(id).backup });
      }
      const list = [...files.values()].map(({ id, name, modifiedTime }) => ({ id, name, modifiedTime }));
      const start = Number(url.searchParams.get('pageToken') || '0');
      return route.fulfill({ headers: cors, json: { files: list.slice(start, start + 2), ...(start + 2 < list.length ? { nextPageToken: String(start + 2) } : {}) } });
    });
    await context.addInitScript(({ name }) => {
      localStorage.setItem('mc_google_oauth_client_id', 'reliability-test.apps.googleusercontent.com');
      localStorage.setItem('mc_google_access_token_v1', JSON.stringify({ access_token: name, expires_at: Date.now() + 3600000, scope: 'openid email https://www.googleapis.com/auth/drive.appdata' }));
    }, { name });
    return { context, page: await pageReady(context, 'sync') };
  }
  const phone = await device('phone'), desktop = await device('desktop');
  const seed = (page, id, dirty) => page.evaluate(async ({ id, dirty }) => {
    await window.__mc.db.tasks.put({ id, title: id, description: '', status: 'todo', priority: 'medium', dueDate: '', category: '', linkedProject: '', subtasks: [], createdAt: '2026-10-01' });
    if (dirty) window.__mc.cloud.markCloudRecordDirty('tasks', id);
  }, { id, dirty });
  const sync = page => page.evaluate(() => window.__mc.cloud.forceCloudSync());
  const titles = page => page.evaluate(async () => (await window.__mc.db.tasks.toArray()).map(t => t.title).sort());
  await seed(phone.page, 'phone-clean', false); await seed(phone.page, 'phone-dirty', true); await seed(desktop.page, 'desktop-dirty', true);
  const initial = await Promise.all([sync(phone.page), sync(desktop.page)]);
  initial.forEach(result => assert(result.ok, result.error));
  assert((await sync(phone.page)).ok); assert((await sync(desktop.page)).ok);
  assert.deepEqual(await titles(phone.page), await titles(desktop.page));
  assert.deepEqual(await titles(phone.page), ['desktop-dirty', 'legacy-a', 'legacy-b', 'phone-clean', 'phone-dirty']);
  pass('Two isolated device stores converge; unjournaled local tasks and all paginated legacy backups survive');
  await phone.page.evaluate(async () => {
    await window.__mc.db.tasks.update('phone-clean', { title: 'edited on phone' });
    window.__mc.cloud.markCloudRecordDirty('tasks', 'phone-clean');
  });
  assert((await sync(phone.page)).ok); assert((await sync(desktop.page)).ok);
  assert.deepEqual(await titles(phone.page), await titles(desktop.page));
  pass('A phone edit reaches the desktop after confirmed cloud write/read');
  const beforeUploads = uploads;
  await phone.page.evaluate(() => { const t = JSON.parse(localStorage.getItem('mc_google_access_token_v1')); t.access_token = 'different'; localStorage.setItem('mc_google_access_token_v1', JSON.stringify(t)); });
  const mismatch = await sync(phone.page);
  assert(!mismatch.ok && mismatch.error.includes('Account mixing'), mismatch.error); assert.equal(uploads, beforeUploads);
  pass('Account mismatch is blocked before uploading local records');
  await desktop.page.evaluate(() => { const t = JSON.parse(localStorage.getItem('mc_google_access_token_v1')); t.expires_at = 0; localStorage.setItem('mc_google_access_token_v1', JSON.stringify(t)); });
  assert(!(await sync(desktop.page)).ok); pass('Expired credentials do not report synchronized');
  await desktop.page.evaluate(() => { const t = JSON.parse(localStorage.getItem('mc_google_access_token_v1')); t.expires_at = Date.now() + 3600000; localStorage.setItem('mc_google_access_token_v1', JSON.stringify(t)); });
  await seed(desktop.page, 'failure-kept', true); failReadBack = true;
  assert(!(await sync(desktop.page)).ok);
  assert(await desktop.page.evaluate(() => window.__mc.cloud.getPendingCloudCount()) > 0);
  assert((await titles(desktop.page)).includes('failure-kept'));
  pass('Provider failure retains local data and pending changes instead of false success');
  await phone.context.close(); await desktop.context.close(); await browser.close();
} finally {
  await writeFile('test-results/browser-reliability.json', JSON.stringify({ passed,
    note: 'Real Chromium/WebKit, actual application code and IndexedDB; Google Drive transport and identities are test doubles, not authenticated production accounts.' }, null, 2));
  await Promise.all(browsers.map(browser => browser.close().catch(() => {})));
  if (server) await new Promise(resolve => server.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
