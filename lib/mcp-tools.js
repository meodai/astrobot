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
