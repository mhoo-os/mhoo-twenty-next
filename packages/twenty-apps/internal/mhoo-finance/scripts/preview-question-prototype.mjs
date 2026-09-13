// Local-only preview of the actual React component. No Workspace/API adapter.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.twenty/question-preview');
await mkdir(output, { recursive: true });
await build({
  stdin: {
    contents:
      "import React from 'react'; import {createRoot} from 'react-dom/client'; import {FinanceQuestionPrototype} from './src/components/finance-question-prototype'; createRoot(document.getElementById('root')).render(<FinanceQuestionPrototype />);",
    resolveDir: root,
    loader: 'tsx',
  },
  bundle: true,
  outfile: resolve(output, 'app.js'),
  platform: 'browser',
  format: 'esm',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"' },
});
await writeFile(
  resolve(output, 'index.html'),
  '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>mhoo Finance · synthetic question prototype</title></head><body style="margin:0;padding:24px;background:#eef0e9"><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
);
process.stdout.write('Built actual FinanceQuestionPrototype at ' + output + '\n');
if (!process.argv.includes('--build-only')) {
  const routes = {
    '/': ['index.html', 'text/html'],
    '/app.js': ['app.js', 'text/javascript'],
  };
  const server = createServer(async (request, response) => {
    const route = routes[request.url];
    if (request.method !== 'GET' || !route) {
      response.writeHead(404);
      response.end();
      return;
    }
    try {
      const content = await readFile(resolve(output, route[0]));
      response.writeHead(200, {
        'Content-Type': route[1],
        'Cache-Control': 'no-store',
      });
      response.end(content);
    } catch {
      response.writeHead(500);
      response.end('Preview unavailable');
    }
  });
  server.listen(4331, '127.0.0.1', () =>
    process.stdout.write(
      'Finance-only synthetic preview http://127.0.0.1:4331 · PID ' +
        process.pid +
        '\n',
    ),
  );
}
