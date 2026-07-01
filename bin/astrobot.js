#!/usr/bin/env node
// bin/astrobot.js
const profile = require('../lib/profile.js');
const { computeChart } = require('../lib/chart.js');
const { resolveCoords } = require('../lib/places.js');
const { geocode } = require('../lib/geocode.js');
const { composeMood } = require('../lib/mood.js');
const { renderContextBlock, renderPortableBlock } = require('../lib/persona.js');
const { renderBirthPrompt } = require('../lib/birthprompt.js');
const { colorName } = require('../lib/colorname.js');
const { synastry } = require('../lib/synastry.js');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--model') args.model = argv[++i];
    else if (argv[i] === '--seed') args.seed = argv[++i];
    else if (argv[i] === '--clear') args.clear = true;
    else args._.push(argv[i]);
  }
  return args;
}

function readAllStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) return resolve('');
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

async function run(argv, opts = {}) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  // Only `birth` consumes stdin; reading it for every command would hang
  // non-`birth` invocations whose stdin is a non-TTY pipe that never closes.

  if (cmd === 'today') {
    const resolved = profile.resolve(args.model);
    if (!resolved) return { code: 0, out: '' };
    const mood = composeMood(resolved.data.chart, new Date(), resolved.data.color && resolved.data.color.hex);
    const user = profile.getUser();
    const syn = user && user.chart ? synastry(resolved.data.chart, user.chart) : null;
    return { code: 0, out: renderContextBlock(resolved.data, mood, syn) + '\n' };
  }

  if (cmd === 'birth') {
    if (!args.model) return { code: 1, out: 'birth requires --model\n' };
    const stdin = opts.stdin !== undefined ? opts.stdin : await readAllStdin();
    let input;
    try { input = JSON.parse(stdin); } catch { return { code: 1, out: 'birth: invalid JSON on stdin\n' }; }
    if (!input || !input.birth || !input.color || !input.color.hex) {
      return { code: 1, out: 'birth: requires birth and color{hex} fields\n' };
    }
    const coords = resolveCoords(input.birth);
    const birth = { ...input.birth, ...coords };
    let chart;
    try { chart = computeChart(birth); }
    catch (e) { return { code: 1, out: 'birth: ' + e.message + '\n' }; }
    const derivedName = colorName(input.color.hex) || input.color.hex;
    const data = {
      birth, chart, color: { ...input.color, name: derivedName },
      persona: input.persona, traits: input.traits || [],
      born: new Date().toISOString().slice(0, 10),
    };
    profile.save(args.model, data);
    return { code: 0, out: `Born: a ${chart.sun.sign} (${chart.dominant.element}, ${chart.ascendant.sign} rising), color ${derivedName}.\n` };
  }

  if (cmd === 'export') {
    const resolved = profile.resolve(args.model);
    if (!resolved) return { code: 0, out: 'No astrobot identity yet.\n' };
    const mood = composeMood(resolved.data.chart, new Date(), resolved.data.color && resolved.data.color.hex);
    const user = profile.getUser();
    const syn = user && user.chart ? synastry(resolved.data.chart, user.chart) : null;
    return { code: 0, out: renderPortableBlock(resolved.data, mood, syn) + '\n' };
  }

  if (cmd === 'show') {
    const resolved = profile.resolve(args.model);
    if (!resolved) return { code: 0, out: 'No astrobot identity yet.\n' };
    const { data } = resolved;
    const mood = composeMood(data.chart, new Date(), data.color && data.color.hex);
    const out = `${data.chart.sun.sign} · Moon ${data.chart.moon.sign} · ${data.chart.ascendant.sign} rising · ${data.color.name}\n` +
      `Today: Sun ${mood.sunAspect} natal Sun; Moon ${mood.moon.phase} in ${mood.moon.sign} (${mood.moon.phaseEnergy}).\n`;
    return { code: 0, out };
  }

  if (cmd === 'me') {
    if (args.clear) {
      profile.clearUser();
      return { code: 0, out: 'Cleared your stored birth.\n' };
    }
    const stdin = opts.stdin !== undefined ? opts.stdin : await readAllStdin();
    let input;
    try { input = JSON.parse(stdin); } catch { return { code: 1, out: 'me: invalid JSON on stdin\n' }; }
    if (!input || !input.birth || !input.birth.datetime) {
      return { code: 1, out: 'me: requires birth and birth.datetime\n' };
    }
    const birth = { ...input.birth };
    if (Number.isFinite(birth.lat) && Number.isFinite(birth.lon)) {
      // lat/lon already provided — use them directly
    } else if (birth.place) {
      const g = geocode(birth.place);
      if (!g) return { code: 1, out: 'Could not find that place — pass lat/lon.\n' };
      birth.lat = g.lat;
      birth.lon = g.lon;
      birth.place = g.name + ', ' + g.cc;
    } else {
      return { code: 1, out: 'me needs birth.lat/lon or a known birth.place\n' };
    }
    if (birth.tzOffsetMinutes == null) birth.tzOffsetMinutes = 0;
    let chart;
    try { chart = computeChart(birth); }
    catch (e) { return { code: 1, out: 'me: ' + e.message + '\n' }; }
    profile.setUser({ birth, chart });
    return { code: 0, out: `Recorded your birth: ${chart.sun.sign} sun, ${chart.ascendant.sign} rising${birth.place ? ', born ' + birth.place : ''}. Your agents will now factor your compatibility.\n` };
  }

  if (cmd === 'roll') {
    const { roll } = require('../lib/roll.js');
    const seeded = args.seed != null;
    const { birth, colorHex } = roll(seeded ? Number(args.seed) : undefined, seeded ? undefined : new Date());
    const chart = computeChart(birth);
    return { code: 0, out: JSON.stringify({ birth, colorHex, chart }, null, 2) + '\n' };
  }

  if (cmd === 'havoc') {
    if (!args.model) return { code: 1, out: 'havoc requires --model\n' };
    const state = args._[1];
    if (state !== 'on' && state !== 'off') return { code: 1, out: 'usage: astrobot havoc <on|off> --model <id>\n' };
    const ok = profile.setHavoc(args.model, state === 'on');
    if (!ok) return { code: 1, out: 'No astrobot identity for ' + args.model + ' — run /astrobot first.\n' };
    return { code: 0, out: state === 'on'
      ? 'Havoc mode ON — the persona is unleashed for ' + args.model + '.\n'
      : 'Havoc mode off — guardrail restored for ' + args.model + '.\n' };
  }

  if (cmd === 'birth-prompt') {
    const { roll } = require('../lib/roll.js');
    const seeded = args.seed != null;
    const { birth, colorHex } = roll(seeded ? Number(args.seed) : undefined, seeded ? undefined : new Date());
    const chart = computeChart(birth);
    return { code: 0, out: renderBirthPrompt({ birth, colorHex, chart }) + '\n' };
  }

  return { code: 1, out: 'usage: astrobot <today|birth|birth-prompt|show|export|roll|havoc|me> [on|off] [--model <id>] [--seed <n>] [--clear]\n' };
}

if (require.main === module) {
  run(process.argv.slice(2))
    .then((r) => { process.stdout.write(r.out); process.exit(r.code); })
    .catch((e) => { process.stderr.write((e && e.message ? e.message : String(e)) + '\n'); process.exit(1); });
}

module.exports = { run, parseArgs };
