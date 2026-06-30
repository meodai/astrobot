// bin/astrobot.js
const profile = require('../lib/profile.js');
const { computeChart } = require('../lib/chart.js');
const { composeMood } = require('../lib/mood.js');
const { renderContextBlock } = require('../lib/persona.js');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--model') args.model = argv[++i];
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
    const chart = computeChart(input.birth);
    const data = {
      birth: input.birth, chart, color: input.color,
      persona: input.persona, traits: input.traits || [],
      born: new Date().toISOString().slice(0, 10),
    };
    profile.save(args.model, data);
    return { code: 0, out: `Born: a ${chart.sun.sign} (${chart.dominant.element}, ${chart.ascendant.sign} rising), color ${input.color.name}.\n` };
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

  return { code: 1, out: 'usage: astrobot <today|birth|show> [--model <id>]\n' };
}

if (require.main === module) {
  run(process.argv.slice(2)).then((r) => { process.stdout.write(r.out); process.exit(r.code); });
}

module.exports = { run, parseArgs };
