import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

async function startServer(t) {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server.js', import.meta.url))], {
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', TLS_CERT: '', TLS_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  });
  return await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(Error('Server startup timeout: ' + output)), 5000);
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('exit', code => { clearTimeout(timeout); reject(Error('Server exited: ' + code + ' ' + output)); });
    child.stderr.on('data', chunk => { output += chunk; });
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timeout); resolve(match[0]); }
    });
  });
}

test('invalid and opaque origins are rejected without terminating the server', async t => {
  const base = await startServer(t);
  for (const origin of ['null', 'invalid', 'https://other.example']) {
    const response = await fetch(base + '/api/control?op=start', {
      method: 'POST', headers: { Origin: origin }, signal: AbortSignal.timeout(3000),
    });
    assert.equal(response.status, 403);
    assert.equal((await fetch(base + '/api/state')).status, 200);
  }
  assert.equal((await fetch(base + '/api/control?op=start', {
    method: 'POST', headers: { Origin: base },
  })).status, 200);
});

test('server session survives scenario resets but changes across process starts', async t => {
  const base = await startServer(t);
  const first = await (await fetch(base + '/api/state')).json();
  assert.equal(typeof first.sessionId, 'string');
  assert.ok(first.sessionId.length > 0);
  const reset = await (await fetch(base + '/api/control?op=reset', { method: 'POST' })).json();
  assert.equal(reset.sessionId, first.sessionId);
  assert.equal(reset.epoch, first.epoch + 1);
  const other = await startServer(t);
  const restarted = await (await fetch(other + '/api/state')).json();
  assert.notEqual(restarted.sessionId, first.sessionId);
});
