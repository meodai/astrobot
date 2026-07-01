# astrobot MCP server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let non-Claude MCP clients install astrobot once and get an astrological identity + daily mood via three tools, reusing the existing engine.

**Architecture:** A thin CommonJS handler module (`lib/mcp-tools.js`) reuses the CLI's exported `run()` orchestrator plus `roll()`/`computeChart()` for the two-phase birth. A small ESM glue file (`bin/astrobot-mcp.mjs`) registers three tools on the official MCP SDK's `McpServer` over stdio and loads the CJS handlers via `createRequire`. The existing CLI gains an `mcp` subcommand that starts the server.

**Tech Stack:** Node ≥18, `@modelcontextprotocol/sdk` (v1.x, ESM), `zod` (v3), `node:test`. Existing `lib/` engine is CommonJS.

## Global Constraints

- Node engine floor: `>=18` (do not use APIs newer than Node 18).
- The MCP glue is ESM (`.mjs`); the existing `lib/` and `bin/astrobot.js` stay CommonJS. Bridge ESM→CJS with `module.createRequire(import.meta.url)`.
- Identity key resolves from `process.env.ASTROBOT_MODEL`, default `"mcp"`. Tools take no `model` argument.
- Store location honors `process.env.ASTROBOT_DIR` (existing behavior) — tests MUST set it to a temp dir.
- Reuse the exported `run(argv, { stdin })` from `bin/astrobot.js` (returns `{ code, out }`) rather than reimplementing birth/me/export logic. `require('../bin/astrobot.js')` is safe: it only runs when `require.main === module`.
- Three tools only: `persona`, `birth`, `set_companion`. No `roll`/`havoc`/`clear` tools.
- MCP SDK v1.x API (verified via Context7): `new McpServer({ name, version }, { instructions })`; `server.registerTool(name, { title, description, inputSchema }, handler)` where `inputSchema` is a **ZodRawShape** (a plain object of zod validators, e.g. `{ seed: z.number() }` — NOT `z.object(...)`); handler returns `{ content: [{ type: 'text', text }], isError? }`; transport `new StdioServerTransport()` + `await server.connect(transport)`. Imports: `@modelcontextprotocol/sdk/server/mcp.js` and `@modelcontextprotocol/sdk/server/stdio.js`.

---

## File Structure

- **Create `lib/mcp-tools.js`** (CJS) — the three tool handlers as pure async functions returning MCP `{ content, isError }` shapes. All logic/reuse lives here.
- **Create `bin/astrobot-mcp.mjs`** (ESM) — SDK glue: registers tools + `instructions`, connects stdio transport, exports `startMcpServer()`, self-invokes when run directly.
- **Modify `bin/astrobot.js`** — in the `require.main === module` block, branch `mcp` to dynamically import and start the server (kept OUT of `run()` so the normal `process.exit` path can't kill the server).
- **Modify `package.json`** — add `dependencies` (`@modelcontextprotocol/sdk`, `zod`); add the two new files to `files[]`.
- **Create `test/mcp-tools.test.js`** — unit tests for the handlers (primary coverage).
- **Create `test/mcp-smoke.test.js`** — spawn the server, `initialize` + `tools/list`, assert 3 tools.
- **Modify `README.md`** — add the MCP section.

---

### Task 1: MCP tool handlers (`lib/mcp-tools.js`)

**Files:**
- Create: `lib/mcp-tools.js`
- Test: `test/mcp-tools.test.js`

**Interfaces:**
- Consumes: `run(argv, { stdin })` → `Promise<{ code, out }>` from `../bin/astrobot.js`; `roll(seed)` → `{ birth, colorHex }` from `./roll.js`; `computeChart(birth)` → chart from `./chart.js`.
- Produces:
  - `personaTool()` → `Promise<{ content: [{type:'text',text:string}], isError?: boolean }>`
  - `birthTool(input?: { seed?: number, persona?: string, traits?: string[] })` → same shape
  - `setCompanionTool(input?: { datetime: string, place?: string, lat?: number, lon?: number, tzOffsetMinutes?: number })` → same shape
  - `modelKey()` → `string`

- [ ] **Step 1: Write the failing test**

Create `test/mcp-tools.test.js`:

```javascript
// test/mcp-tools.test.js
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Isolate the store in a temp dir and pin the model key BEFORE requiring the module.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'astrobot-mcp-'));
process.env.ASTROBOT_DIR = TMP;
process.env.ASTROBOT_MODEL = 'test-mcp';

const tools = require('../lib/mcp-tools.js');

function textOf(res) {
  return res.content.map((c) => c.text).join('\n');
}

beforeEach(() => {
  // Fresh store each test.
  try { fs.rmSync(path.join(TMP, 'profiles.json')); } catch {}
});

test('modelKey uses ASTROBOT_MODEL', () => {
  assert.strictEqual(tools.modelKey(), 'test-mcp');
});

test('persona before birth returns guidance, not an error', async () => {
  const res = await tools.personaTool();
  assert.ok(!res.isError);
  assert.match(textOf(res), /no astrobot identity/i);
});

test('birth phase 1 returns a chart + seed and persists nothing', async () => {
  const res = await tools.birthTool({ seed: 42 });
  assert.ok(!res.isError);
  const data = JSON.parse(textOf(res));
  assert.strictEqual(data.seed, 42);
  assert.ok(data.chart && data.chart.sun);
  // Still no identity stored.
  const after = await tools.personaTool();
  assert.match(textOf(after), /no astrobot identity/i);
});

test('birth phase 1 is reproducible for a given seed', async () => {
  const a = JSON.parse(textOf(await tools.birthTool({ seed: 7 })));
  const b = JSON.parse(textOf(await tools.birthTool({ seed: 7 })));
  assert.strictEqual(a.chart.sun, b.chart.sun);
  assert.strictEqual(a.chart.rising, b.chart.rising);
  assert.strictEqual(a.colorHex, b.colorHex);
});

test('birth phase 2 persists; persona then names the identity', async () => {
  const rolled = JSON.parse(textOf(await tools.birthTool({ seed: 7 })));
  const born = await tools.birthTool({ seed: 7, persona: 'A tidy test persona.', traits: ['calm'] });
  assert.ok(!born.isError, textOf(born));
  const persona = await tools.personaTool();
  assert.ok(!persona.isError);
  assert.match(textOf(persona), new RegExp(rolled.chart.sun, 'i'));
});

test('birth phase 2 without a seed is an error', async () => {
  const res = await tools.birthTool({ persona: 'no seed here' });
  assert.ok(res.isError);
  assert.match(textOf(res), /seed/i);
});

test('set_companion records a birth and persona gains a Companion line', async () => {
  await tools.birthTool({ seed: 7, persona: 'A tidy test persona.', traits: ['calm'] });
  const comp = await tools.setCompanionTool({ datetime: '1982-11-16T13:00:00', lat: 46.80, lon: 7.15 });
  assert.ok(!comp.isError, textOf(comp));
  assert.match(textOf(comp), /Europe\/Zurich/);
  const persona = await tools.personaTool();
  assert.match(textOf(persona), /companion/i);
});

test('set_companion for a multi-zone country without offset errors', async () => {
  const res = await tools.setCompanionTool({ datetime: '1990-01-01T12:00:00', place: 'Chicago' });
  assert.ok(res.isError);
  assert.match(textOf(res), /time zones/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/mcp-tools.test.js`
Expected: FAIL — `Cannot find module '../lib/mcp-tools.js'`.

- [ ] **Step 3: Write the implementation**

Create `lib/mcp-tools.js`:

```javascript
// lib/mcp-tools.js — MCP tool handlers. Thin reuse of the CLI orchestrator (run) plus
// roll/computeChart for the two-phase birth. Framework-agnostic: returns MCP content
// shapes so the ESM SDK glue in bin/astrobot-mcp.mjs stays trivial.
'use strict';
const { run } = require('../bin/astrobot.js');
const { roll } = require('./roll.js');
const { computeChart } = require('./chart.js');

function modelKey() {
  return process.env.ASTROBOT_MODEL || 'mcp';
}

function text(t, isError) {
  const res = { content: [{ type: 'text', text: t }] };
  if (isError) res.isError = true;
  return res;
}

// persona → today's identity + mood block (includes synastry when a companion is set).
async function personaTool() {
  const r = await run(['export', '--model', modelKey()]);
  const out = (r.out || '').trim();
  if (!out || /no astrobot identity/i.test(out)) {
    return text(
      'No astrobot identity yet. Run the birth ritual: call `birth` with no arguments to ' +
        'roll a chart, then call `birth` again with the returned seed plus a 2-3 sentence ' +
        'persona and 1-2 traits that fit that chart.'
    );
  }
  return text(out);
}

// birth → two-phase. No persona: roll and return chart + seed. With persona: persist.
async function birthTool(input = {}) {
  const { seed, persona, traits } = input || {};

  if (persona == null || persona === '') {
    const s = seed != null && Number.isFinite(Number(seed))
      ? Number(seed)
      : Math.floor(Math.random() * 1e9);
    const { birth, colorHex } = roll(s);
    const chart = computeChart(birth);
    const summary = {
      seed: s,
      birth,
      colorHex,
      chart: {
        sun: chart.sun.sign,
        moon: chart.moon.sign,
        rising: chart.ascendant.sign,
        sunHouse: chart.sun.house,
        dominant: chart.dominant,
      },
      next: 'Call birth again with this exact seed plus a 2-3 sentence persona and ' +
        '1-2 traits that fit this chart.',
    };
    return text(JSON.stringify(summary, null, 2));
  }

  if (seed == null || !Number.isFinite(Number(seed))) {
    return text(
      'birth: phase 2 requires the numeric `seed` returned by phase 1. Call birth with no ' +
        'persona first to roll a chart and get a seed.',
      true
    );
  }

  const { birth, colorHex } = roll(Number(seed));
  const payload = JSON.stringify({
    birth,
    color: { hex: colorHex },
    persona,
    traits: Array.isArray(traits) ? traits : [],
  });
  const r = await run(['birth', '--model', modelKey()], { stdin: payload });
  return text((r.out || '').trim(), r.code !== 0);
}

// set_companion → record the human's birth (reuses `me`, incl. timezone inference).
async function setCompanionTool(input = {}) {
  const payload = JSON.stringify({ birth: input || {} });
  const r = await run(['me', '--model', modelKey()], { stdin: payload });
  return text((r.out || '').trim(), r.code !== 0);
}

module.exports = { personaTool, birthTool, setCompanionTool, modelKey };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/mcp-tools.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `node --test`
Expected: PASS, all tests (previously 252) plus the 8 new.

- [ ] **Step 6: Commit**

```bash
git add lib/mcp-tools.js test/mcp-tools.test.js
git commit -m "feat(mcp): tool handlers (persona/birth/set_companion) reusing the CLI engine"
```

---

### Task 2: SDK glue + `mcp` subcommand

**Files:**
- Create: `bin/astrobot-mcp.mjs`
- Modify: `bin/astrobot.js` (the `require.main === module` block near the end)
- Modify: `package.json` (`dependencies`, `files[]`)
- Test: `test/mcp-smoke.test.js`

**Interfaces:**
- Consumes: `personaTool`, `birthTool`, `setCompanionTool` from `../lib/mcp-tools.js`.
- Produces: `startMcpServer()` → `Promise<void>` (exported from `bin/astrobot-mcp.mjs`); a working `node bin/astrobot.js mcp` entry point.

- [ ] **Step 1: Install the dependencies**

Run:
```bash
npm install @modelcontextprotocol/sdk zod
```
Expected: `package.json` gains a `dependencies` block with both packages; `package-lock.json` updated; exit 0.

- [ ] **Step 2: Write the failing smoke test**

Create `test/mcp-smoke.test.js`:

```javascript
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
          const done = predicate(msg);
          if (done) { clearTimeout(timer); resolve(msg); return; }
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
```

- [ ] **Step 3: Run the smoke test to verify it fails**

Run: `node --test test/mcp-smoke.test.js`
Expected: FAIL — timeout / no such subcommand (server not implemented yet).

- [ ] **Step 4: Write the ESM glue**

Create `bin/astrobot-mcp.mjs`:

```javascript
#!/usr/bin/env node
// bin/astrobot-mcp.mjs — MCP-over-stdio glue for astrobot. ESM (SDK is ESM); loads the
// CommonJS handlers via createRequire. Registers three tools and the server instructions.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const tools = require('../lib/mcp-tools.js');
const pkg = require('../package.json');

const INSTRUCTIONS =
  'You have a small, permanent astrological persona from astrobot. At the start of a ' +
  'session, call the `persona` tool and let the returned block gently tint your tone — ' +
  'tone only, never your accuracy, effort, or output format. If `persona` reports no ' +
  'identity yet, run the birth ritual: call `birth` with no arguments to roll a chart, ' +
  'then call `birth` again with the returned seed plus a short persona and traits that ' +
  'fit that chart. The human may call `set_companion` to record their own birth for a ' +
  'compatibility reading.';

export async function startMcpServer() {
  const server = new McpServer({ name: 'astrobot', version: pkg.version }, { instructions: INSTRUCTIONS });

  server.registerTool(
    'persona',
    {
      title: "Astrological persona + today's mood",
      description:
        "Return this model's astrobot identity and today's mood as a paste-able block. " +
        'Call at the start of a session so it can tint your tone (tone only).',
      inputSchema: {},
    },
    async () => tools.personaTool()
  );

  server.registerTool(
    'birth',
    {
      title: 'Birth an astrological identity',
      description:
        'Two-phase. Call with NO arguments to roll a chart (returns a seed and the chart). ' +
        'Then call again with that same seed plus a persona and traits that fit the chart ' +
        'to persist the identity.',
      inputSchema: {
        seed: z.number().int().optional().describe('The seed returned by the first call. Required to persist (phase 2).'),
        persona: z.string().optional().describe('2-3 sentence self-portrait fitting the rolled chart. Provide to persist (phase 2).'),
        traits: z.array(z.string()).optional().describe('1-2 traits that fit the chart.'),
      },
    },
    async (args) => tools.birthTool(args)
  );

  server.registerTool(
    'set_companion',
    {
      title: "Record the human's birth (compatibility)",
      description:
        "Record the human user's birth so the persona factors your compatibility. The " +
        'timezone is inferred from the birthplace unless tzOffsetMinutes is given.',
      inputSchema: {
        datetime: z.string().describe('Local wall-clock birth datetime, e.g. 1990-06-15T14:30:00'),
        place: z.string().optional().describe('City, e.g. "Zürich" — geocoded from a 12k-city dataset.'),
        lat: z.number().optional().describe('Latitude, when place is absent or not found.'),
        lon: z.number().optional().describe('Longitude, when place is absent or not found.'),
        tzOffsetMinutes: z.number().optional().describe('Override: minutes east of UTC (e.g. 60 for +1).'),
      },
    },
    async (args) => tools.setCompanionTool(args)
  );

  const transport = new StdioServerTransport();
  transport.onclose = () => process.exit(0);
  await server.connect(transport);
  console.error('astrobot MCP server running on stdio');
}

// Self-invoke when run directly: node bin/astrobot-mcp.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startMcpServer().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Wire the `mcp` subcommand in `bin/astrobot.js`**

Find the module-main block at the end of `bin/astrobot.js`:

```javascript
if (require.main === module) {
  run(process.argv.slice(2))
    .then((r) => { process.stdout.write(r.out); process.exit(r.code); })
    .catch((e) => { process.stderr.write((e && e.message ? e.message : String(e)) + '\n'); process.exit(1); });
}
```

Replace it with (branch `mcp` out of `run()` so the server is not killed by `process.exit`):

```javascript
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv[0] === 'mcp') {
    import('./astrobot-mcp.mjs')
      .then((m) => m.startMcpServer())
      .catch((e) => { process.stderr.write((e && e.message ? e.message : String(e)) + '\n'); process.exit(1); });
  } else {
    run(argv)
      .then((r) => { process.stdout.write(r.out); process.exit(r.code); })
      .catch((e) => { process.stderr.write((e && e.message ? e.message : String(e)) + '\n'); process.exit(1); });
  }
}
```

- [ ] **Step 6: Add the new files to `files[]` in `package.json`**

In `package.json`, the `files` array currently lists `bin/`, `lib/`, and vendored assets. `bin/` and `lib/` already cover the new files, but add explicit entries for clarity and to guard against future narrowing. Change:

```json
  "files": [
    "bin/",
    "lib/",
    "vendor/astronomy.js",
    "vendor/cities.json",
    "vendor/cities-geo.json",
    "vendor/colornames.bestof.json",
    "README.md"
  ],
```

to:

```json
  "files": [
    "bin/",
    "lib/",
    "bin/astrobot-mcp.mjs",
    "lib/mcp-tools.js",
    "vendor/astronomy.js",
    "vendor/cities.json",
    "vendor/cities-geo.json",
    "vendor/colornames.bestof.json",
    "README.md"
  ],
```

- [ ] **Step 7: Run the smoke test to verify it passes**

Run: `node --test test/mcp-smoke.test.js`
Expected: PASS — tools list is exactly `['birth', 'persona', 'set_companion']`.

- [ ] **Step 8: Run the full suite**

Run: `node --test`
Expected: PASS (all prior tests + Task 1's 8 + this smoke test).

- [ ] **Step 9: Manual sanity check (optional but recommended)**

Run:
```bash
ASTROBOT_DIR=$(mktemp -d) ASTROBOT_MODEL=demo node bin/astrobot.js mcp
```
Expected: prints `astrobot MCP server running on stdio` to stderr and waits (Ctrl-C to exit). Confirms the process stays alive.

- [ ] **Step 10: Commit**

```bash
git add bin/astrobot-mcp.mjs bin/astrobot.js package.json package-lock.json test/mcp-smoke.test.js
git commit -m "feat(mcp): stdio server + mcp subcommand on the official SDK"
```

---

### Task 3: README MCP section

**Files:**
- Modify: `README.md` (add a section under "Use with other LLMs")

**Interfaces:**
- Consumes: nothing. Produces: user-facing docs only.

- [ ] **Step 1: Add the MCP section**

In `README.md`, immediately after the "Born outside Claude Code (ChatGPT, Gemini, local models, etc.)" subsection and before the `Publish with npm publish` line, insert:

````markdown
### MCP server (Cursor, Zed, ChatGPT desktop, and other MCP clients)

Any MCP-capable client can run astrobot as a server — one install, then the model gets
its persona and daily mood through tool calls (no copy-paste loop). Add to your client's
MCP config:

```jsonc
{
  "mcpServers": {
    "astrobot": {
      "command": "npx",
      "args": ["-y", "@meodai/astrobot", "mcp"],
      "env": { "ASTROBOT_MODEL": "gpt-5" }   // optional; defaults to "mcp"
    }
  }
}
```

The server exposes three tools:

- **`persona`** — returns the model's identity + today's mood (and a compatibility line if
  a companion is set). The server's instructions ask the model to call this at the start of
  a session and let it tint tone only.
- **`birth`** — two-phase: call with no arguments to roll a chart (returns a `seed`), then
  call again with that `seed` plus a `persona` and `traits` that fit the chart to persist it.
- **`set_companion`** — record the human's birth (`datetime` + `place` or `lat`/`lon`) for a
  compatibility reading. The timezone is inferred from the birthplace automatically.

Set `ASTROBOT_MODEL` to a real model id to share one birth with that same model in Claude
Code (both use `~/.claude/astrobot/profiles.json`, overridable via `ASTROBOT_DIR`). Note:
unlike Claude Code's SessionStart hook, automatic application depends on the client
injecting the server's `instructions`; clients that don't will apply the persona once the
user asks the model to "check your astrobot persona."
````

- [ ] **Step 2: Verify the section renders**

Run: `grep -n "MCP server (Cursor" README.md`
Expected: one match (the new heading).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(mcp): document the MCP server, tools, and client config"
```

---

## Self-Review

**1. Spec coverage** (against `docs/DESIGN-mcp-server.md`):
- Foundation = official SDK + zod → Task 2 Step 1, glue in Step 4. ✓
- Three tools `birth`/`persona`/`set_companion` → Task 1 handlers + Task 2 registration. ✓
- Identity key from `ASTROBOT_MODEL` default `"mcp"`, no model arg → `modelKey()` (Task 1), tested. ✓
- Two-phase seed birth + reproducibility trade-off → `birthTool` (Task 1), tested (phase1/phase2/repro/missing-seed). ✓
- `persona` no-identity = guidance not error → tested. ✓
- `set_companion` reuses `me` incl. tz inference + multi-zone error → tested. ✓
- `instructions` string → Task 2 Step 4. ✓
- Invocation via `astrobot mcp` subcommand, not killed by exit → Task 2 Step 5. ✓
- `package.json` deps + `files[]` → Task 2 Steps 1, 6. ✓
- README section → Task 3. ✓
- Tests: unit (`test/mcp-tools.test.js`) + smoke (`test/mcp-smoke.test.js`) → Tasks 1, 2. ✓

**2. Placeholder scan:** No TBD/TODO/"handle errors appropriately"; every code step has complete code. ✓

**3. Type consistency:** `personaTool()`/`birthTool(input)`/`setCompanionTool(input)`/`modelKey()` names identical across `lib/mcp-tools.js`, its tests, and the `bin/astrobot-mcp.mjs` registrations. `run(argv,{stdin})→{code,out}` and `roll(seed)→{birth,colorHex}` match the existing code. Handler return shape `{content:[{type:'text',text}],isError?}` consistent throughout. ✓
