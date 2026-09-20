import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const output = mkdtempSync(resolve('.api-smoke-'));
try {
  execFileSync(process.execPath, [
    'node_modules/typescript/bin/tsc', '-p', 'tsconfig.api.json',
    '--noEmit', 'false', '--outDir', output
  ], { stdio: 'inherit' });
  const routes = ['ask.js', 'parse-intent.js',
    ...readdirSync(join(output, 'api/sync')).filter(f => f.endsWith('.js')).map(f => 'sync/' + f)];
  for (const route of routes) {
    // Native Node ESM, without tsx or a bundler resolving missing extensions.
    const { default: handler } = await import(pathToFileURL(join(output, 'api', route)).href);
    assert.equal(typeof handler, 'function', route);
    const headers = {};
    let status;
    let ended = false;
    const res = {
      setHeader(key, value) { headers[key] = value; },
      status(code) { status = code; return this; },
      end() { ended = true; return this; },
      json() { ended = true; return this; },
      send() { ended = true; return this; }
    };
    await handler({ method: 'OPTIONS' }, res);
    assert.equal(status, 200, route);
    assert.equal(ended, true, route);
    assert.ok(headers['Access-Control-Allow-Methods'], route);
    console.log('PASS ' + route);
  }
  console.log('All API modules load in native Node ESM; OPTIONS checks passed. No database writes or AI calls made.');
} finally {
  rmSync(output, { recursive: true, force: true });
}
