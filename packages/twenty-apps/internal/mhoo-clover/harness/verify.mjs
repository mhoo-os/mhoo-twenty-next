import { build } from 'esbuild';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] ?? '/tmp/clover-two-host-trial');
await mkdir(out, { recursive: true });
const built = await build({ absWorkingDir: app, entryPoints: ['harness/entry.tsx'], bundle: true, outfile: resolve(out, 'trial.js'), jsx: 'automatic', metafile: true, define: { 'process.env.NODE_ENV': '"development"' } });
const shared = ['src/operator/PaymentStatus.tsx', 'src/operator/status-contract.ts'];
const hashes = {};
for (const path of shared) {
  assert.ok(built.metafile.inputs[path], `Missing shared module ${path}`);
  hashes[path] = createHash('sha256').update(await readFile(resolve(app, path))).digest('hex');
}
for (const path of ['harness/twenty-adapter.tsx', 'harness/web-adapter.tsx'])
  assert.ok(built.metafile.inputs[path].imports.some((i) => i.path === shared[0]), `Adapter must import identical shared module: ${path}`);
const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clover synthetic status trial</title><link rel="stylesheet" href="/trial.css"><style>body{margin:0;background:#fff;font-family:Arial,sans-serif}.mhoo-trial-banner{display:flex;justify-content:space-between;gap:16px;padding:24px 32px;border-bottom:1px solid #e4ebe5;color:#435e4b;font-size:13px}.mhoo-trial-banner strong{font-size:28px;color:#183f2a;letter-spacing:-1px}.mhoo-trial-note{padding:20px 32px;background:#f5f7f4;color:#52634f;font-size:12px}</style><div id="root"></div><script type="module" src="/trial.js"></script></html>';
const servers = [];
let browser;
const checks = [];
const errors = [];
try {
  for (const port of [4332, 4333]) {
    const server = createServer(async (req, res) => {
      const path = req.url?.split('?')[0];
      if (path === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
      if (path === '/trial.js' || path === '/trial.css') {
        res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'text/css');
        res.end(await readFile(resolve(out, path.slice(1)))); return;
      }
      res.writeHead(404).end();
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    servers.push(server);
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [host, port] of [['twenty', 4332], ['web', 4333]]) {
    const context = await browser.newContext({ viewport: { width: 1200, height: 1150 } });
    await context.route('**/*', (route) => {
      const u = new URL(route.request().url());
      if (u.hostname !== '127.0.0.1' || u.port !== String(port)) { errors.push('Unexpected external request'); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/?host=${host}`);
    const status = page.getByRole('status');
    await status.getByText('Choose a merchant to inspect its saved pages.').waitFor();
    const select = page.getByLabel('Merchant', { exact: true });
    await select.selectOption('partial');
    await status.getByText('Partial history · more pages remain').waitFor();
    for (const text of ['Earlier grant · cannot resume', 'Smaller date windows needed', 'Range ended · coverage unverified', 'More receipts exist. This view is partial.']) assert.ok(await status.getByText(text).isVisible());
    await page.screenshot({ path: resolve(out, `${host}-partial.png`), fullPage: true });
    for (const [id, text] of [['denied', 'Access denied.'], ['missing', 'No connection is available.'], ['uncertain', 'Status could not be confirmed.'], ['empty', 'No saved pages yet.']]) {
      await select.selectOption(id);
      await status.getByText(text, { exact: false }).waitFor();
      assert.equal(await status.locator('article').count(), 0);
      if (id === 'uncertain') await page.screenshot({ path: resolve(out, `${host}-uncertain.png`), fullPage: true });
      checks.push(`${host}: ${id} displayed without stale pages`);
    }
    await select.selectOption('slow');
    await select.selectOption('denied');
    await status.getByText('Access denied.', { exact: false }).waitFor();
    await page.waitForTimeout(350); // Wait beyond the deliberately delayed fixture to falsify stale response overwrite.
    assert.ok((await status.innerText()).includes('Access denied.'));
    await page.getByRole('button', { name: 'Refresh status' }).click();
    await status.getByText('Access denied.', { exact: false }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await select.selectOption('partial');
    await status.getByText('Partial history · more pages remain').waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: resolve(out, `${host}-mobile.png`), fullPage: true });
    checks.push(`${host}: initial selection, four partial/coverage states, delayed response isolation, refresh and mobile width`);
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(out, 'receipt.json'), JSON.stringify({ timestamp: new Date().toISOString(), scope: 'synthetic ordinary-DOM definition harness; NOT native Remote DOM or installed invocation', sharedHashes: hashes, checks, errors }, null, 2));
  await writeFile(resolve(out, 'metafile.json'), JSON.stringify(built.metafile, null, 2));
  process.stdout.write(JSON.stringify({ result: 'PASS', out, checks: checks.length, sharedHashes: hashes }) + '\n');
} finally {
  await browser?.close();
  await Promise.all(servers.map((s) => new Promise((resolve) => s.close(resolve))));
}
