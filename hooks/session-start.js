// hooks/session-start.js
const profile = require('../lib/profile.js');
const { composeMood } = require('../lib/mood.js');
const { renderContextBlock } = require('../lib/persona.js');

function buildOutput(input) {
  try {
    const model = input && typeof input === 'object' ? input.model : undefined;
    const resolved = profile.resolve(model);
    if (!resolved || !resolved.data || !resolved.data.chart) return '';
    const mood = composeMood(resolved.data.chart, new Date());
    const additionalContext = renderContextBlock(resolved.data, mood);
    return JSON.stringify({
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext },
    });
  } catch {
    return '';
  }
}

function main() {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (data += c));
  process.stdin.on('end', () => {
    let input = null;
    try { input = JSON.parse(data); } catch { input = null; }
    const out = buildOutput(input);
    if (out) process.stdout.write(out);
    process.exit(0);
  });
  process.stdin.on('error', () => process.exit(0));
}

if (require.main === module) main();

module.exports = { buildOutput };
