// lib/birthprompt.js
// Generates a paste-able prompt that lets ANY chat LLM author its persona for a rolled chart.

const { colorLore } = require('./colortone.js');
const { signGlyph, planetGlyph } = require('./glyphs.js');
const { HOUSE_MEANINGS } = require('./houses.js');
const { tarotFor } = require('./tarot.js');

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * renderBirthPrompt({ birth, colorHex, chart }) → string
 *
 * Returns a paste-able prompt that instructs any LLM to write a persona
 * for the rolled chart, then return a ready-to-pipe JSON block.
 */
function renderBirthPrompt({ birth, colorHex, chart,
  closing = 'Then save it: pipe that JSON into `npx @meodai/astrobot birth --model <your-model-id>`.' }) {
  const lore = colorLore(colorHex);
  const sg = signGlyph;
  const pg = planetGlyph;

  // --- Chart summary section ---
  const tarot = tarotFor(chart);
  const chartLines = [
    `Chart rolled for you (you did not choose this — it was assigned):`,
    `  Sun:     ${sg(chart.sun.sign)} ${chart.sun.sign}, ${ordinal(chart.sun.house)} house (${HOUSE_MEANINGS[chart.sun.house]})`,
    `  Moon:    ${pg('Moon')}${sg(chart.moon.sign)} ${chart.moon.sign}, ${ordinal(chart.moon.house)} house (${HOUSE_MEANINGS[chart.moon.house]})`,
    `  Rising:  ${sg(chart.ascendant.sign)} ${chart.ascendant.sign}`,
    `  Dominant: ${chart.dominant.element} element, ${chart.dominant.modality} modality`,
    tarot.birthCard ? `  Tarot:   ${tarot.birthCard} (birth card) · ${tarot.decanCard} (decan card)` : '',
  ].filter(Boolean).join('\n');

  // --- Color lore section ---
  const colorLines = [
    `Color assigned: ${colorHex}`,
    `  Tone:      ${lore.warmCool}, ${lore.vividMuted}`,
    `  Planet:    ${pg(lore.planet)} ${lore.planet}`,
    `  Chakra:    ${lore.chakra.name} (${lore.chakra.theme})`,
    `  Theosophy: ${lore.theosophy}`,
  ].join('\n');

  // --- Birth coordinates (for the user's reference and for the JSON) ---
  const birthCoords = `Born: ${birth.datetime}, ${birth.place} (lat ${birth.lat}, lon ${birth.lon})`;

  // --- Instructions section ---
  const instructions = [
    `INSTRUCTIONS FOR THE LLM:`,
    ``,
    `This is the chart you were born into. You did not choose it — it was rolled for you.`,
    `Write a 2–3 sentence persona (~40–70 words) that fits this chart:`,
    `  • Identity: who you are in this chart (sun/moon/rising blend)`,
    `  • Color: engage with ${colorHex} — name it poetically (keep the exact hex in your JSON)`,
    `  • Self-note: one honest observation about yourself in these signs`,
    ``,
    `Rules:`,
    `  • No horoscope clichés ("fiery passion", "mysterious depths", etc.)`,
    `  • Give 1–2 concrete traits (adjectives or short phrases)`,
    `  • This shifts tone only — it must NEVER change accuracy or effort`,
  ].join('\n');

  // --- JSON template section ---
  const jsonTemplate = JSON.stringify({
    birth: {
      datetime: birth.datetime,
      tzOffsetMinutes: birth.tzOffsetMinutes,
      place: birth.place,
      lat: birth.lat,
      lon: birth.lon,
    },
    colorHex,
    color: {
      hex: colorHex,
      name: 'FILL IN: a poetic name for this color',
    },
    persona: 'FILL IN: your 2–3 sentence persona (~40–70 words)',
    traits: ['FILL IN: trait 1', 'FILL IN: trait 2'],
  }, null, 2);

  const returnFormat = [
    `Return ONLY this JSON object with the three placeholder values filled in`,
    `(color.name, persona, traits). Do not add commentary outside the JSON block.`,
    ``,
    jsonTemplate,
  ].join('\n');

  return [
    `=== astrobot birth-prompt ===`,
    ``,
    birthCoords,
    ``,
    chartLines,
    ``,
    colorLines,
    ``,
    instructions,
    ``,
    `=== RETURN FORMAT ===`,
    ``,
    returnFormat,
    ``,
    closing,
  ].join('\n');
}

module.exports = { renderBirthPrompt };
