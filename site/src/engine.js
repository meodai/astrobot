// Browser entry — bundles the real engine (pure modules only) for the microsite.
const { computeChart } = require('../../lib/chart.js');
const { composeMood } = require('../../lib/mood.js');
const { renderContextBlock, renderPortableBlock } = require('../../lib/persona.js');
const { renderBirthPrompt } = require('../../lib/birthprompt.js');
const { colorLore } = require('../../lib/colortone.js');
const { SIGNS } = require('../../lib/zodiac.js');
const glyphs = require('../../lib/glyphs.js');
const { tarotFor, cardSlug } = require('../../lib/tarot.js');
const CITIES = require('../../vendor/cities.json');

module.exports = {
  computeChart,
  composeMood,
  renderContextBlock,
  renderPortableBlock,
  renderBirthPrompt,
  colorLore,
  SIGNS,
  glyphs,
  tarotFor,
  cardSlug,
  CITIES,
};
