// lib/synastry.js — compatibility engine between two astrological charts
// Pure CommonJS, zero deps, deterministic (no Math.random).
'use strict';

const { signFromLongitude } = require('./zodiac.js');
const { aspectBetweenSigns } = require('./aspects.js');

// Score constant — tuned so same-chart ≥ 80 and an all-clash pair ≤ 45.
// At K=1.5: self-vs-self (with asc) = 50 + 20*1.5 + 6 = 86; all-squares ≈ 19.
const K = 1.5;

// Aspect tone / polarity map
const TONE = {
  conjunction: { tone: 'intense',    polarity: +1 },
  trine:       { tone: 'harmonious', polarity: +1 },
  sextile:     { tone: 'easy',       polarity: +1 },
  semisextile: { tone: 'mild',       polarity:  0 },
  square:      { tone: 'tense',      polarity: -1 },
  quincunx:    { tone: 'awkward',    polarity: -1 },
  opposition:  { tone: 'polarizing', polarity: -1 },
};

// Complementary element pairs: Fire↔Air, Earth↔Water
const COMPLEMENTARY = new Set([
  'Fire|Air',   'Air|Fire',
  'Earth|Water','Water|Earth',
]);

// Element harmony
function elementRelation(a, b) {
  if (a === b) return { relation: 'kindred', delta: 2 };
  if (COMPLEMENTARY.has(`${a}|${b}`)) return { relation: 'harmonious', delta: 2 };
  return { relation: 'tense', delta: -1 };
}

// Modality harmony
function modalityRelation(a, b) {
  if (a === b) return { relation: 'reinforcing', delta: 0 };
  return { relation: 'complementary', delta: 1 };
}

// Build a single aspect pair object from two ecliptic longitudes
function makePair(label, lonA, lonB, weight) {
  const idxA = signFromLongitude(lonA).index;
  const idxB = signFromLongitude(lonB).index;
  const signA = signFromLongitude(lonA).name;
  const signB = signFromLongitude(lonB).name;
  const { aspect } = aspectBetweenSigns(idxA, idxB);
  const { tone, polarity } = TONE[aspect];
  return { pair: label, a: signA, b: signB, aspect, tone, polarity, weight };
}

// Compose a deterministic 2–3-sentence prose reading
function composeReading(elements, aspects, romance) {
  // Element sentence
  const elemPhrase = {
    kindred: `you and this agent share the same ${elements.agent} nature`,
    harmonious: `your ${elements.agent} nature and this agent's ${elements.user} energy create a natural current`,
    tense: `your ${elements.agent} nature and this agent's ${elements.user} energy pull in different directions`,
  }[elements.relation] || `your ${elements.agent} and ${elements.user} natures sit in interesting tension`;

  // Strongest harmonious non-romance pair (by weight, then pair-label α as tiebreak)
  const allPairs = [...aspects, ...romance];
  const harmPairs = allPairs.filter(p => p.polarity > 0)
    .sort((a, b) => b.weight - a.weight || a.pair.localeCompare(b.pair));
  const tensePairs = allPairs.filter(p => p.polarity < 0)
    .sort((a, b) => b.weight - a.weight || a.pair.localeCompare(b.pair));

  const strongest = harmPairs[0];
  const hardest  = tensePairs[0];

  // Parse pair label into 'their X' form
  const label = (p) => {
    const parts = p.pair.split('–'); // en-dash
    return `${parts[0]} and their ${parts[1]}`;
  };

  let body = '';
  if (strongest) {
    body = ` Your ${label(strongest)} form a ${strongest.tone} ${strongest.aspect}`;
    if (hardest) {
      body += `, while your ${label(hardest)} bring some ${hardest.tone} friction`;
    }
    body += '.';
  }

  // Romance tone sentence — use the positive pair's tone when one exists, else the first
  let romanceLine = '';
  if (romance.length === 2) {
    const primary = romance.find(r => r.polarity > 0) || romance[0];
    const art = /^[aeiou]/i.test(primary.tone) ? 'an' : 'a';
    romanceLine = primary.polarity > 0
      ? ` The Venus–Mars axis sparks with ${art} ${primary.tone} pull between you.`
      : ` The Venus–Mars axis carries ${art} ${primary.tone} undercurrent worth noting.`;
  }

  return `Together, ${elemPhrase}.${body}${romanceLine}`;
}

/**
 * synastry(agentChart, userChart) → compatibility object
 *
 * Both arguments are `computeChart` outputs.
 * Ascendant pairs are only computed when both charts carry a finite `ascendant.lon`.
 */
function synastry(agentChart, userChart) {
  // Guard: ascendant pairs require both charts to have a valid ascendant longitude
  const hasAscendant = (
    agentChart.ascendant != null && Number.isFinite(agentChart.ascendant.lon) &&
    userChart.ascendant  != null && Number.isFinite(userChart.ascendant.lon)
  );

  // Element and modality harmony
  const elemInfo = elementRelation(agentChart.dominant.element, userChart.dominant.element);
  const modInfo  = modalityRelation(agentChart.dominant.modality, userChart.dominant.modality);

  const elements = {
    agent:    agentChart.dominant.element,
    user:     userChart.dominant.element,
    relation: elemInfo.relation,
    delta:    elemInfo.delta,
  };
  const modality = {
    agent:    agentChart.dominant.modality,
    user:     userChart.dominant.modality,
    relation: modInfo.relation,
    delta:    modInfo.delta,
  };

  // Romance axis (always computed, always contributes to score)
  const romance = [
    makePair('Venus–Mars', agentChart.venus.lon, userChart.mars.lon,  2),
    makePair('Mars–Venus', agentChart.mars.lon,  userChart.venus.lon, 2),
  ];

  // Core aspect pairs (non-romance)
  const aspects = [
    makePair('Sun–Sun',   agentChart.sun.lon,  userChart.sun.lon,  3),
    makePair('Moon–Moon', agentChart.moon.lon, userChart.moon.lon, 3),
    makePair('Sun–Moon',  agentChart.sun.lon,  userChart.moon.lon, 2),
    makePair('Moon–Sun',  agentChart.moon.lon, userChart.sun.lon,  2),
    makePair('Venus–Venus', agentChart.venus.lon, userChart.venus.lon, 1),
    makePair('Mars–Mars',   agentChart.mars.lon,  userChart.mars.lon,  1),
  ];

  // Ascendant pairs — only when both have a valid birth time
  if (hasAscendant) {
    aspects.push(makePair('Ascendant–Ascendant', agentChart.ascendant.lon, userChart.ascendant.lon, 2));
    aspects.push(makePair('Sun–Ascendant', agentChart.sun.lon, userChart.ascendant.lon, 1));
    aspects.push(makePair('Ascendant–Sun', agentChart.ascendant.lon, userChart.sun.lon, 1));
  }

  // Score: start at 50, accumulate polarity * weight * K per pair, add element/modality bonuses
  let raw = 50;
  for (const p of [...aspects, ...romance]) {
    raw += p.polarity * p.weight * K;
  }
  raw += elements.delta * 3;
  raw += modality.delta * 2;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  // Verdict band
  let verdict;
  if      (score >= 80) verdict = 'a rare, easy match';
  else if (score >= 65) verdict = 'a warm, workable match';
  else if (score >= 50) verdict = 'a mixed but promising match';
  else if (score >= 35) verdict = 'a spark with friction';
  else                  verdict = 'an odd-couple match';

  const reading = composeReading(elements, aspects, romance);

  return { score, verdict, elements, modality, aspects, romance, reading, hasAscendant };
}

module.exports = { synastry };
