// test/birthprompt.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const { roll } = require('../lib/roll.js');
const { computeChart } = require('../lib/chart.js');
const { renderBirthPrompt } = require('../lib/birthprompt.js');

const SEED = 7;
const BIN = path.join(__dirname, '..', 'bin', 'astrobot.js');

// --- Direct unit tests on renderBirthPrompt ---

test('renderBirthPrompt is deterministic for a fixed roll', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const out1 = renderBirthPrompt({ birth, colorHex, chart });
  const out2 = renderBirthPrompt({ birth, colorHex, chart });
  assert.strictEqual(out1, out2, 'output must be identical for the same inputs');
});

test('renderBirthPrompt output contains the sun sign', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const out = renderBirthPrompt({ birth, colorHex, chart });
  assert.ok(out.includes(chart.sun.sign), `output must mention sun sign "${chart.sun.sign}"`);
});

test('renderBirthPrompt output contains at least one house meaning', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const out = renderBirthPrompt({ birth, colorHex, chart });
  const { HOUSE_MEANINGS } = require('../lib/houses.js');
  const meanings = Object.values(HOUSE_MEANINGS);
  const found = meanings.some(m => out.includes(m));
  assert.ok(found, 'output must include at least one HOUSE_MEANINGS value');
});

test('renderBirthPrompt output contains color-lore planet name', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const { colorLore } = require('../lib/colortone.js');
  const lore = colorLore(colorHex);
  const out = renderBirthPrompt({ birth, colorHex, chart });
  assert.ok(out.includes(lore.planet), `output must include lore.planet "${lore.planet}"`);
});

test('renderBirthPrompt output contains color-lore chakra name', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const { colorLore } = require('../lib/colortone.js');
  const lore = colorLore(colorHex);
  const out = renderBirthPrompt({ birth, colorHex, chart });
  assert.ok(out.includes(lore.chakra.name), `output must include lore.chakra.name "${lore.chakra.name}"`);
});

test('renderBirthPrompt output contains the literal colorHex', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const out = renderBirthPrompt({ birth, colorHex, chart });
  assert.ok(out.includes(colorHex), `output must include colorHex "${colorHex}"`);
});

test('renderBirthPrompt output contains the rolled birth datetime', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const out = renderBirthPrompt({ birth, colorHex, chart });
  assert.ok(out.includes(birth.datetime), `output must include birth.datetime "${birth.datetime}"`);
});

test('renderBirthPrompt output contains a coordinate (lat)', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const out = renderBirthPrompt({ birth, colorHex, chart });
  assert.ok(out.includes(String(birth.lat)), `output must include birth.lat "${birth.lat}"`);
});

test('renderBirthPrompt output contains "tone only"', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const out = renderBirthPrompt({ birth, colorHex, chart });
  assert.ok(out.toLowerCase().includes('tone only'), 'output must include "tone only"');
});

test('renderBirthPrompt output contains birth --model instruction', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const out = renderBirthPrompt({ birth, colorHex, chart });
  assert.ok(out.includes('birth --model'), 'output must include "birth --model" instruction');
});

test('renderBirthPrompt embedded JSON is parseable and contains birth.datetime and colorHex', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const out = renderBirthPrompt({ birth, colorHex, chart });
  // Extract the JSON block — it starts with { and ends with the last }
  const jsonStart = out.indexOf('{\n');
  const jsonEnd = out.lastIndexOf('}') + 1;
  assert.ok(jsonStart !== -1, 'output must contain a JSON block');
  const jsonStr = out.slice(jsonStart, jsonEnd);
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    assert.fail('embedded JSON block must be parseable: ' + e.message);
  }
  assert.strictEqual(parsed.birth.datetime, birth.datetime, 'JSON must contain rolled birth.datetime');
  assert.strictEqual(parsed.colorHex, colorHex, 'JSON must contain rolled colorHex');
});

// --- CLI integration tests ---

test('CLI birth-prompt --seed 7 exits with code 0 and prints output', () => {
  const out = execFileSync(process.execPath, [BIN, 'birth-prompt', '--seed', String(SEED)], {
    encoding: 'utf8',
  });
  assert.ok(out.length > 100, 'output must be non-trivially long');
});

test('CLI birth-prompt --seed 7 is deterministic across two runs', () => {
  const out1 = execFileSync(process.execPath, [BIN, 'birth-prompt', '--seed', String(SEED)], { encoding: 'utf8' });
  const out2 = execFileSync(process.execPath, [BIN, 'birth-prompt', '--seed', String(SEED)], { encoding: 'utf8' });
  assert.strictEqual(out1, out2, 'seeded birth-prompt must be deterministic');
});

test('CLI birth-prompt --seed 7 output contains sun sign', () => {
  const { birth, colorHex } = roll(SEED);
  const chart = computeChart(birth);
  const out = execFileSync(process.execPath, [BIN, 'birth-prompt', '--seed', String(SEED)], { encoding: 'utf8' });
  assert.ok(out.includes(chart.sun.sign), `CLI output must mention sun sign "${chart.sun.sign}"`);
});

test('CLI birth-prompt --seed 7 output contains "tone only"', () => {
  const out = execFileSync(process.execPath, [BIN, 'birth-prompt', '--seed', String(SEED)], { encoding: 'utf8' });
  assert.ok(out.toLowerCase().includes('tone only'), 'CLI output must include "tone only"');
});

test('CLI birth-prompt --seed 7 output contains birth --model instruction', () => {
  const out = execFileSync(process.execPath, [BIN, 'birth-prompt', '--seed', String(SEED)], { encoding: 'utf8' });
  assert.ok(out.includes('birth --model'), 'CLI output must include "birth --model"');
});

test('usage string includes birth-prompt', () => {
  const { run } = require('../bin/astrobot.js');
  return run(['unknown-command'], { stdin: '' }).then((r) => {
    assert.ok(r.out.includes('birth-prompt'), 'usage string must include birth-prompt');
    assert.strictEqual(r.code, 1);
  });
});
