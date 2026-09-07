import { build } from 'esbuild';
import { getFrontComponentBuildPlugins } from 'twenty-sdk/front-component-renderer/build';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(app, '../../../..');
const out = resolve(process.argv[2] ?? '/tmp/clover-remote-dom-proof');
await mkdir(out, { recursive: true });
process.chdir(app); // Native strip-comments plugin resolves metafile paths from cwd.
const hash = async (p) => createHash('sha256').update(await readFile(p)).digest('hex');
const sharedHashes = {};
for (const file of ['PaymentStatus.tsx', 'status-contract.ts', 'payment-status.css']) sharedHashes[file] = await hash(resolve(app, 'src/operator', file));
const component = await build({ absWorkingDir: app, entryPoints: ['harness/remote-fixture.tsx'], bundle: true, format: 'esm', jsx: 'automatic', outfile: resolve(out, 'remote-component.mjs'), plugins: getFrontComponentBuildPlugins(), metafile: true, minify: true });
await build({ absWorkingDir: app, entryPoints: ['harness/remote-host.jsx'], bundle: true, format: 'esm', jsx: 'automatic', outfile: resolve(out, 'host.js'), alias: { '@': resolve(root, 'packages/twenty-front-component-renderer/src') }, define: { 'process.env.NODE_ENV': '"production"' } });
await writeFile(resolve(out, 'component-metafile.json'), JSON.stringify(component.metafile, null, 2));
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1:4332').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><meta charset="utf-8"><title>Clover actual Remote DOM proof</title><div id="error"></div><div id="root"></div><script type="module" src="/host.js"></script></html>'); return; }
  if (pathname === '/host.js' || pathname === '/remote-component.mjs') { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(resolve(out, pathname.slice(1)))); return; }
  res.writeHead(404).end();
});
let browser;
let page;
const errors = [];
let workerCount = 0;
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4332, '127.0.0.1', resolve); });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1100 } });
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.protocol === 'blob:' || (u.hostname === '127.0.0.1' && u.port === '4332')) return route.continue();
    errors.push(`External request denied: ${u.origin}`); return route.abort();
  });
  page = await context.newPage();
  page.on('worker', () => workerCount++);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4332');
  await page.getByText('Choose a merchant to inspect its saved pages.').waitFor({ timeout: 20000 });
  assert.equal(await page.locator('iframe').getAttribute('sandbox'), 'allow-scripts');
  assert.ok(workerCount > 0, 'Actual sandbox worker must exist');
  const select = page.getByLabel('Merchant', { exact: true });
  await select.selectOption('partial');
  await page.getByText('Partial history · more pages remain').waitFor();
  assert.equal(await page.locator('.mhoo-clover-status__page').count(), 4);
  assert.equal(await page.locator('.mhoo-clover-status').evaluate((e) => getComputedStyle(e).color), 'rgb(22, 59, 45)');
  assert.equal(await page.locator('.mhoo-clover-status__panel').first().evaluate((e) => getComputedStyle(e).borderRadius), '18px');
  await page.screenshot({ path: resolve(out, 'native-remote-partial.png'), fullPage: true });
  await select.selectOption('slow');
  await select.selectOption('denied');
  await page.getByText('Access denied.', { exact: false }).waitFor();
  await page.waitForTimeout(350); // Beyond delayed fixture; falsifies late response overwrite.
  assert.equal(await page.locator('.mhoo-clover-status__page').count(), 0);
  assert.ok(await page.getByText('Access denied.', { exact: false }).isVisible());
  await page.getByRole('button', { name: 'Refresh status' }).click();
  await page.getByText('Access denied.', { exact: false }).waitFor();
  assert.equal(await page.locator('#error').innerText(), '');
  assert.deepEqual(errors, []);
  await page.screenshot({ path: resolve(out, 'native-remote-denied.png'), fullPage: true });
  await writeFile(resolve(out, 'receipt.json'), JSON.stringify({ result: 'PASS', timestamp: new Date().toISOString(), scope: 'actual Twenty Remote DOM iframe/worker, synthetic read-only fixture; no installed Workspace or native authorization proof', workerCount, sharedHashes, errors, checks: ['sandbox allow-scripts and actual worker', 'native select event and effect', 'four partial/coverage states', 'CSS injection', 'late response isolation', 'refresh effect'] }, null, 2));
  process.stdout.write('PASS: actual Remote DOM case\n');
} catch (error) {
  if (page) await page.screenshot({ path: resolve(out, 'failure.png'), fullPage: true });
  await writeFile(resolve(out, 'failure.json'), JSON.stringify({ visibleText: page ? await page.locator('body').innerText() : null, timestamp: new Date().toISOString(), error: String(error), errors, workerCount, sharedHashes }, null, 2));
  throw error;
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
