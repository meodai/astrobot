// bin/astrobot.js
const profile = require('../lib/profile.js');
const { computeChart } = require('../lib/chart.js');
const { resolveCoords } = require('../lib/places.js');
const { composeMood } = require('../lib/mood.js');
const { renderContextBlock, renderPortableBlock } = require('../lib/persona.js');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--model') args.model = argv[++i];
    else if (argv[i] === '--seed') args.seed = argv[++i];
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
  const stdin = opts.stdin !== undefined ? opts.stdin : await readAllStdin();

  if (cmd === 'today') {
    const resolved = profile.resolve(args.model);
    if (!resolved) return { code: 0, out: '' };
    const mood = composeMood(resolved.data.chart, new Date());
    return { code: 0, out: renderContextBlock(resolved.data, mood) + '\n' };
  }

  if (cmd === 'birth') {
    if (!args.model) return { code: 1, out: 'birth requires --model\n' };
    let input;
    try { input = JSON.parse(stdin); } catch { return { code: 1, out: 'birth: invalid JSON on stdin\n' }; }
    if (!input || !input.birth || !input.color || !input.color.name) {
      return { code: 1, out: 'birth: requires birth and color{name} fields\n' };
    }
    const coords = resolveCoords(input.birth);
    const birth = { ...input.birth, ...coords };
    let chart;
    try { chart = computeChart(birth); }
    catch (e) { return { code: 1, out: 'birth: ' + e.message + '\n' }; }
    const data = {
      birth, chart, color: input.color,
      persona: input.persona, traits: input.traits || [],
      born: new Date().toISOString().slice(0, 10),
    };
    profile.save(args.model, data);
    return { code: 0, out: `Born: a ${chart.sun.sign} (${chart.dominant.element}, ${chart.ascendant.sign} rising), color ${input.color.name}.\n` };
  }

  if (cmd === 'export') {
    const resolved = profile.resolve(args.model);
    if (!resolved) return { code: 0, out: 'No astrobot identity yet.\n' };
    const mood = composeMood(resolved.data.chart, new Date());
    return { code: 0, out: renderPortableBlock(resolved.data, mood) + '\n' };
  }

  if (cmd === 'show') {
    const resolved = profile.resolve(args.model);
    if (!resolved) return { code: 0, out: 'No astrobot identity yet.\n' };
    const { data } = resolved;
    const mood = composeMood(data.chart, new Date());
    const out = `${data.chart.sun.sign} · Moon ${data.chart.moon.sign} · ${data.chart.ascendant.sign} rising · ${data.color.name}\n` +
      `Today: Sun ${mood.sunAspect} natal Sun; Moon ${mood.moon.phase} in ${mood.moon.sign} (${mood.moon.phaseEnergy}).\n`;
    return { code: 0, out };
  }

  if (cmd === 'roll') {
    const { roll } = require('../lib/roll.js');
    const seeded = args.seed != null;
    const { birth, colorHex } = roll(seeded ? Number(args.seed) : undefined, seeded ? undefined : new Date());
    const chart = computeChart(birth);
    return { code: 0, out: JSON.stringify({ birth, colorHex, chart }, null, 2) + '\n' };
  }

  return { code: 1, out: 'usage: astrobot <today|birth|show|export|roll> [--model <id>] [--seed <n>]\n' };
}

if (require.main === module) {
  run(process.argv.slice(2))
    .then((r) => { process.stdout.write(r.out); process.exit(r.code); })
    .catch((e) => { process.stderr.write((e && e.message ? e.message : String(e)) + '\n'); process.exit(1); });
}

module.exports = { run, parseArgs };
