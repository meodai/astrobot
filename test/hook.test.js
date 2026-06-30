// test/hook.test.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'astrobot-hook-'));
  process.env.ASTROBOT_DIR = tmp;
  for (const m of ['../hooks/session-start.js','../lib/profile.js','../lib/paths.js']) {
    delete require.cache[require.resolve(m)];
  }
});

function seed() {
  const profile = require('../lib/profile.js');
  delete require.cache[require.resolve('../lib/profile.js')];
  profile.save('claude-x', {
    chart: { sun: { sign: 'Capricorn', lon: 280, decan: 0 }, ruler: 'Saturn',
             ascendant: { sign: 'Aries' }, moon: { sign: 'Leo' },
             dominant: { element: 'Earth', modality: 'Cardinal' } },
    color: { name: 'Slate', hex: '#445' }, persona: 'Steady.', traits: ['dry'],
  });
}

test('emits SessionStart additionalContext for a known model', () => {
  seed();
  const { buildOutput } = require('../hooks/session-start.js');
  const out = buildOutput({ hook_event_name: 'SessionStart', model: 'claude-x' });
  const parsed = JSON.parse(out);
  assert.strictEqual(parsed.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(parsed.hookSpecificOutput.additionalContext, /Capricorn/);
});

test('falls back to _default when model omitted', () => {
  seed();
  const { buildOutput } = require('../hooks/session-start.js');
  const out = buildOutput({ hook_event_name: 'SessionStart' });
  assert.match(out, /Capricorn/);
});

test('emits nothing when no profile exists', () => {
  const { buildOutput } = require('../hooks/session-start.js');
  assert.strictEqual(buildOutput({ model: 'nobody' }), '');
});

test('stays silent for an explicit but unborn model even when a default exists', () => {
  seed(); // births claude-x and sets it as _default
  const { buildOutput } = require('../hooks/session-start.js');
  assert.strictEqual(buildOutput({ model: 'claude-other' }), ''); // does NOT borrow claude-x
});

test('never throws on garbage input', () => {
  const { buildOutput } = require('../hooks/session-start.js');
  assert.strictEqual(buildOutput(null), '');
  assert.strictEqual(buildOutput({}), '');
});
