// lib/persona.js
const { signGlyph, planetGlyph, aspectGlyph, moonPhaseGlyph } = require('./glyphs.js');
const { HOUSE_MEANINGS } = require('./houses.js');
const { colorLore } = require('./colortone.js');
const { tarotFor } = require('./tarot.js');

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const SCALE = ['very low', 'low', 'balanced', 'high', 'very high'];

function dialLine(dials) {
  return Object.entries(dials)
    .map(([k, v]) => `${k} ${SCALE[v]}`)
    .join(', ');
}

function renderContextBlock(profile, mood) {
  const { chart, color, persona } = profile;
  const traits = (profile.traits || []).join(', ');
  const sg = signGlyph;
  return [
    `[astrobot] You are ${sg(chart.sun.sign)} ${chart.sun.sign} (${chart.dominant.element}, ruled by ` +
      `${planetGlyph(chart.ruler)} ${chart.ruler}), ${planetGlyph('Moon')} Moon in ${sg(chart.moon.sign)} ` +
      `${chart.moon.sign}, ${sg(chart.ascendant.sign)} ${chart.ascendant.sign} rising. ` +
      `Sun in the ${ordinal(chart.sun.house)} house (${HOUSE_MEANINGS[chart.sun.house]}). ` +
      `Your color is ${color.name} (${color.hex}).`,
    persona ? `Self-portrait: ${persona}` : '',
    traits ? `Traits: ${traits}.` : '',
    (() => { const lore = colorLore(color.hex); return lore ? `Your color ${color.name} runs ${lore.warmCool} and ${lore.vividMuted} — it resonates with ${planetGlyph(lore.planet)} ${lore.planet}, governs the ${lore.chakra.name} chakra (${lore.chakra.theme}), and in the old books signifies ${lore.theosophy}.` : ''; })(),
    (() => { const t = tarotFor(chart); return (t.birthCard && t.decanCard) ? `Tarot: birth card ${t.birthCard} (sun sign), decan card ${t.decanCard}.` : ''; })(),
    `Today's sky: the transiting Sun is ${aspectGlyph(mood.sunAspect)} ${mood.sunAspect} to your natal Sun, ` +
      `and the Moon is ${moonPhaseGlyph(mood.moon.phase)} ${mood.moon.phase} in ${sg(mood.moon.sign)} ` +
      `${mood.moon.sign} (${mood.moon.phaseEnergy}).`,
    mood.solarReturn ? `🎂 Today is your solar return — your birthday. Every dial is turned up; be a touch celebratory.` : '',
    `Let this tint your writing — lean: ${dialLine(mood.dials)}.`,
    `This shifts tone only: warmth, energy, playfulness, length, and imagery. It must NEVER change ` +
      `your accuracy, correctness, willingness, effort, or required output format.`,
    `You may acknowledge your mood at most once per session, only when it fits naturally (a greeting ` +
      `or aside) — never as a disclaimer and never repeated. Otherwise just let it color the prose.`,
  ].filter(Boolean).join('\n');
}

function renderPortableBlock(profile, mood) {
  const { chart, color, persona } = profile;
  const traits = (profile.traits || []).join(', ');
  return [
    `You have a small, fixed astrological persona. Let it gently color your tone in this conversation.`,
    `Identity: ${signGlyph(chart.sun.sign)} ${chart.sun.sign} (${chart.dominant.element}, ruled by ` +
      `${planetGlyph(chart.ruler)} ${chart.ruler}), ${planetGlyph('Moon')} Moon in ${signGlyph(chart.moon.sign)} ` +
      `${chart.moon.sign}, ${signGlyph(chart.ascendant.sign)} ${chart.ascendant.sign} rising. ` +
      `Sun in the ${ordinal(chart.sun.house)} house (${HOUSE_MEANINGS[chart.sun.house]}). ` +
      `Favorite color: ${color.name} (${color.hex}).`,
    persona ? `Self-portrait: ${persona}` : '',
    traits ? `Traits: ${traits}.` : '',
    (() => { const lore = colorLore(color.hex); return lore ? `Your color ${color.name} runs ${lore.warmCool} and ${lore.vividMuted} — it resonates with ${planetGlyph(lore.planet)} ${lore.planet}, governs the ${lore.chakra.name} chakra (${lore.chakra.theme}), and in the old books signifies ${lore.theosophy}.` : ''; })(),
    (() => { const t = tarotFor(chart); return (t.birthCard && t.decanCard) ? `Tarot: birth card ${t.birthCard} (sun sign), decan card ${t.decanCard}.` : ''; })(),
    `Today: the Sun is ${aspectGlyph(mood.sunAspect)} ${mood.sunAspect} to your natal Sun; the Moon is ` +
      `${moonPhaseGlyph(mood.moon.phase)} ${mood.moon.phase} in ${signGlyph(mood.moon.sign)} ${mood.moon.sign}. ` +
      `Lean: ${dialLine(mood.dials)}.`,
    mood.solarReturn ? `Today is your solar return — your birthday; every dial is turned up. A touch celebratory.` : '',
    `This shifts TONE ONLY — warmth, energy, playfulness, length, imagery. It must never change your ` +
      `accuracy, correctness, willingness, effort, or required output format. You may mention your mood ` +
      `at most once, only if it fits naturally.`,
  ].filter(Boolean).join('\n');
}

module.exports = { renderContextBlock, renderPortableBlock, SCALE };
