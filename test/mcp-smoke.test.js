// test/mcp-smoke.test.js — spawn the server, do the initialize handshake + tools/list.
const { test } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('mcp server advertises the three tools', async () => {
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'astrobot-smoke-'));
  const proc = spawn(process.execPath, ['bin/astrobot.js', 'mcp'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, ASTROBOT_DIR: TMP, ASTROBOT_MODEL: 'smoke' },
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  const send = (msg) => proc.stdin.write(JSON.stringify(msg) + '\n');

  // Read newline-delimited JSON-RPC messages until predicate matches or timeout.
  const waitFor = (predicate) =>
    new Promise((resolve, reject) => {
      let buf = '';
      const timer = setTimeout(() => reject(new Error('timeout: ' + buf)), 10000);
      proc.stdout.on('data', (chunk) => {
        buf += chunk.toString();
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          let msg;
          try { msg = JSON.parse(line); } catch { continue; }
          if (predicate(msg)) { clearTimeout(timer); resolve(msg); return; }
        }
      });
    });

  try {
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' },
    }});
    await waitFor((m) => m.id === 1 && m.result);
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const list = await waitFor((m) => m.id === 2 && m.result);
    const names = (list.result.tools || []).map((t) => t.name).sort();
    assert.deepStrictEqual(names, ['birth', 'persona', 'set_companion']);
  } finally {
    proc.kill();
  }
});
