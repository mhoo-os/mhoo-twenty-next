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
const out = resolve(process.argv[2] ?? '/tmp/finance-remote-dom-proof');
await mkdir(out, { recursive: true });
process.chdir(app); // Native strip-comments plugin resolves metafile paths from cwd.
const hash = async (p) =>
  createHash('sha256')
    .update(await readFile(p))
    .digest('hex');
const sharedHashes = {};
for (const file of [
  'components/finance-question-prototype.tsx',
  'investigation/question-prototype.ts',
  'contracts/money.ts',
])
  sharedHashes[file] = await hash(resolve(app, 'src', file));
const component = await build({
  absWorkingDir: app,
  entryPoints: ['harness/remote-fixture.tsx'],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  outfile: resolve(out, 'remote-component.mjs'),
  plugins: getFrontComponentBuildPlugins(),
  metafile: true,
  minify: true,
});
await build({
  absWorkingDir: app,
  entryPoints: ['harness/remote-host.jsx'],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  outfile: resolve(out, 'host.js'),
  alias: {
    '@': resolve(root, 'packages/twenty-front-component-renderer/src'),
    react: resolve(root, 'node_modules/react'),
    'react-dom': resolve(root, 'node_modules/react-dom'),
  },
  define: { 'process.env.NODE_ENV': '"production"' },
});
await writeFile(
  resolve(out, 'component-metafile.json'),
  JSON.stringify(component.metafile, null, 2),
);
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1:4334').pathname;
  if (pathname === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end(
      '<!doctype html><html><meta charset="utf-8"><title>Finance actual Remote DOM proof</title><div id="error"></div><div id="root"></div><script type="module" src="/host.js"></script></html>',
    );
    return;
  }
  if (pathname === '/host.js' || pathname === '/remote-component.mjs') {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(await readFile(resolve(out, pathname.slice(1))));
    return;
  }
  res.writeHead(404).end();
});
let browser;
let page;
const errors = [];
let workerCount = 0;
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(4334, '127.0.0.1', resolve);
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1100 },
  });
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (
      u.protocol === 'blob:' ||
      (u.hostname === '127.0.0.1' && u.port === '4334')
    )
      return route.continue();
    errors.push(`External request denied: ${u.origin}`);
    return route.abort();
  });
  page = await context.newPage();
  page.on('worker', () => workerCount++);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4334');
  await page
    .getByRole('button', { name: 'Select February', exact: true })
    .waitFor({ timeout: 20000 });
  assert.equal(
    await page.locator('iframe').getAttribute('sandbox'),
    'allow-scripts',
  );
  assert.ok(workerCount > 0, 'Actual sandbox worker must exist');
  assert.equal(
    await page
      .getByRole('region', { name: 'Finance question prototype', exact: true })
      .evaluate((e) => getComputedStyle(e).color),
    'rgb(37, 41, 35)',
  );
  assert.equal(
    await page
      .locator('.mhoo-fq-card')
      .first()
      .evaluate((e) => getComputedStyle(e).borderRadius),
    '14px',
  );
  for (const name of [
    'Account',
    'Period',
    'Snapshot',
    'Your question',
    'Demo response simulation',
  ])
    assert.ok(await page.getByLabel(name, { exact: true }).isVisible());
  await page
    .getByLabel('Your question', { exact: true })
    .fill('Which periods need more evidence?');
  await page
    .getByRole('button', { name: 'Explore question →', exact: true })
    .click();
  await page
    .getByRole('heading', { name: 'Source excerpts by period', exact: true })
    .waitFor();
  await page.getByText('3 / 4 excerpts', { exact: true }).waitFor();
  await page
    .getByRole('button', { name: 'Select February', exact: true })
    .click();
  await page
    .locator('.mhoo-fq-row')
    .filter({ hasText: '2025-01-08' })
    .waitFor({ state: 'hidden' });
  assert.equal(await page.locator('.mhoo-fq-row').count(), 4);
  await page
    .getByRole('button', {
      name: 'Demo produce supplier 2025-02-05 · operating · Excerpt available $560.00 →',
      exact: true,
    })
    .click();
  const evidence = page.getByRole('region', {
    name: 'Selected source evidence',
    exact: true,
  });
  await evidence
    .getByText(
      'd4,operating,2025-02-05,Demo produce supplier,56000,USD,SYNTHETIC_EXCLUDED',
      { exact: true },
    )
    .waitFor();
  assert.ok((await evidence.innerText()).includes('CSV row 5'));
  await page.screenshot({
    path: resolve(out, 'native-remote-evidence.png'),
    fullPage: true,
  });
  await writeFile(
    resolve(out, 'labels.json'),
    JSON.stringify(
      await page
        .locator('label')
        .evaluateAll((nodes) => nodes.map((e) => e.outerHTML)),
      null,
      2,
    ),
  );
  await page.getByLabel('Account', { exact: true }).selectOption('reserve');
  await page
    .getByText('2 contributing demo records', { exact: false })
    .waitFor();
  assert.equal(await page.locator('.mhoo-fq-row').count(), 2);
  assert.ok(!(await evidence.innerText()).includes('CSV row 5'));
  await page
    .getByLabel('Demo response simulation', { exact: true })
    .selectOption('slow');
  await page.getByText('Previous answer · stale', { exact: true }).waitFor();
  assert.equal(await page.locator('.mhoo-fq-row').count(), 0);
  await page
    .getByLabel('Demo response simulation', { exact: true })
    .selectOption('denied');
  await page.getByText('Demo access denied.', { exact: false }).waitFor();
  await page.waitForTimeout(2600); // Beyond the 2400ms fixture response: falsify late overwrite.
  assert.equal(await page.locator('.mhoo-fq-row').count(), 0);
  assert.ok(
    await page.getByText('Demo access denied.', { exact: false }).isVisible(),
  );
  assert.ok(!(await evidence.innerText()).includes('CSV row 5'));
  assert.equal(await page.locator('#error').innerText(), '');
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: resolve(out, 'native-remote-denied.png'),
    fullPage: true,
  });
  await writeFile(
    resolve(out, 'receipt.json'),
    JSON.stringify(
      {
        result: 'PASS',
        timestamp: new Date().toISOString(),
        scope:
          'actual Twenty Remote DOM iframe/worker, synthetic read-only fixture; no installed Workspace or native authorization proof',
        workerCount,
        sharedHashes,
        errors,
        checks: [
          'sandbox allow-scripts and actual worker',
          'CSS injection',
          'five explicit accessible control names',
          'native question input and explore dispatch',
          'chart selection filters four records',
          'd4 source excerpt and CSV row 5',
          'native account change clears selected evidence',
          'delayed response cannot overwrite denied state',
        ],
      },
      null,
      2,
    ),
  );
  process.stdout.write('PASS: actual Remote DOM case\n');
} catch (error) {
  if (page)
    await page.screenshot({
      path: resolve(out, 'failure.png'),
      fullPage: true,
    });
  await writeFile(
    resolve(out, 'failure.json'),
    JSON.stringify(
      {
        visibleText: page ? await page.locator('body').innerText() : null,
        timestamp: new Date().toISOString(),
        error: String(error),
        errors,
        workerCount,
        sharedHashes,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
