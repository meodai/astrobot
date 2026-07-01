// Browser entry — bundles the real engine (pure modules only) for the microsite.
const { computeChart } = require('../../lib/chart.js');
const { composeMood } = require('../../lib/mood.js');
const { synastry } = require('../../lib/synastry.js');
const { renderContextBlock, renderPortableBlock } = require('../../lib/persona.js');
const { renderBirthPrompt } = require('../../lib/birthprompt.js');
const { colorLore } = require('../../lib/colortone.js');
const { colorName } = require('../../lib/colorname.js');
const { resolveOffset, offsetForZone } = require('../../lib/timezone.js');
const { SIGNS } = require('../../lib/zodiac.js');
const glyphs = require('../../lib/glyphs.js');
const { tarotFor, cardSlug } = require('../../lib/tarot.js');
const CITIES = require('../../vendor/cities.json');

module.exports = {
  computeChart,
  composeMood,
  synastry,
  renderContextBlock,
  renderPortableBlock,
  renderBirthPrompt,
  colorLore,
  colorName,
  resolveOffset,
  offsetForZone,
  SIGNS,
  glyphs,
  tarotFor,
  cardSlug,
  CITIES,
};
