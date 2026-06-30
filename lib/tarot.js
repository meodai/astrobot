// lib/tarot.js — Golden Dawn astrological tarot correspondences (public-domain facts).
'use strict';

const { SIGNS } = require('./zodiac.js');

// Zodiacal trumps (Golden Dawn / Rider-Waite-Smith naming).
const MAJOR_BY_SIGN = {
  Aries: 'The Emperor', Taurus: 'The Hierophant', Gemini: 'The Lovers',
  Cancer: 'The Chariot', Leo: 'Strength', Virgo: 'The Hermit',
  Libra: 'Justice', Scorpio: 'Death', Sagittarius: 'Temperance',
  Capricorn: 'The Devil', Aquarius: 'The Star', Pisces: 'The Moon',
};

// Minor Arcana pip suit follows the sign's element.
const SUIT_BY_ELEMENT = { Fire: 'Wands', Water: 'Cups', Air: 'Swords', Earth: 'Pentacles' };

// Modality sequence mirrors the SIGNS array: index % 3 → 0=Cardinal, 1=Fixed, 2=Mutable.
const MODALITY = ['Cardinal', 'Fixed', 'Mutable'];

// Golden Dawn rule: cardinal signs hold pips 2–4, fixed 5–7, mutable 8–10.
// decanIndex (0..2) is the offset within the triplicity.
const BASE_BY_MODALITY = { Cardinal: 2, Fixed: 5, Mutable: 8 };

/**
 * birthCard(signName) → Major Arcana title for this sun sign, or '' for unknown input.
 */
function birthCard(signName) {
  return MAJOR_BY_SIGN[signName] || '';
}

/**
 * decanCard(signName, decanIndex) → Minor Arcana pip string, e.g. "2 of Wands".
 * decanIndex is 0, 1, or 2.  Returns '' for unrecognised sign or null/undefined decan.
 */
function decanCard(signName, decanIndex) {
  const idx = SIGNS.findIndex((s) => s.name === signName);
  if (idx < 0 || decanIndex == null) return '';
  const suit = SUIT_BY_ELEMENT[SIGNS[idx].element];
  const base = BASE_BY_MODALITY[MODALITY[idx % 3]];
  return (base + decanIndex) + ' of ' + suit;
}

/**
 * tarotFor(chart) → { birthCard, decanCard }
 * chart must have a .sun.sign and .sun.decan (0..2).
 */
function tarotFor(chart) {
  return {
    birthCard: birthCard(chart.sun.sign),
    decanCard: decanCard(chart.sun.sign, chart.sun.decan),
  };
}

module.exports = { birthCard, decanCard, tarotFor, MAJOR_BY_SIGN };
