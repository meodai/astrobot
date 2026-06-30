// lib/chart.js
const { eclipticLongitudeOf, gastHours } = require('./ephemeris.js');
const { signFromLongitude, decanOf, norm360, SIGNS } = require('./zodiac.js');

const OBLIQUITY_DEG = 23.4393;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// Modality is derived from sign index: 0,3,6,9 Cardinal; 1,4,7,10 Fixed; 2,5,8,11 Mutable.
const MODALITY = ['Cardinal', 'Fixed', 'Mutable'];

function ascendantLongitude(lstHours, latDeg, oblDeg = OBLIQUITY_DEG) {
  const ramc = norm360(lstHours * 15) * DEG;
  const obl = oblDeg * DEG;
  const lat = latDeg * DEG;
  const asc = Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(obl) + Math.tan(lat) * Math.sin(obl))
  );
  return norm360(asc * RAD);
}

function utcInstant(birth) {
  const ms = Date.parse(birth.datetime + 'Z');
  if (Number.isNaN(ms)) throw new Error('invalid birth.datetime: ' + birth.datetime);
  return new Date(ms - (birth.tzOffsetMinutes || 0) * 60000);
}

function bodyPlacement(body, date) {
  const lon = eclipticLongitudeOf(body, date);
  return { sign: signFromLongitude(lon).name, lon };
}

function computeChart(birth) {
  if (!Number.isFinite(birth.lat) || !Number.isFinite(birth.lon)) {
    throw new Error('computeChart requires numeric birth.lat and birth.lon');
  }
  const date = utcInstant(birth);

  const sunLon = eclipticLongitudeOf('Sun', date);
  const sun = { sign: signFromLongitude(sunLon).name, lon: sunLon, decan: decanOf(sunLon) };

  const chart = {
    sun,
    moon: bodyPlacement('Moon', date),
    mercury: bodyPlacement('Mercury', date),
    venus: bodyPlacement('Venus', date),
    mars: bodyPlacement('Mars', date),
    jupiter: bodyPlacement('Jupiter', date),
    saturn: bodyPlacement('Saturn', date),
  };

  // Ascendant: local sidereal time = GAST + east-longitude/15.
  const lst = ((gastHours(date) + birth.lon / 15) % 24 + 24) % 24;
  const ascLon = ascendantLongitude(lst, birth.lat);
  chart.ascendant = { sign: signFromLongitude(ascLon).name, lon: ascLon };

  // Dominant element/modality: tally the seven body signs.
  const elementTally = {};
  const modalityTally = {};
  for (const key of ['sun','moon','mercury','venus','mars','jupiter','saturn']) {
    const s = signFromLongitude(chart[key].lon);
    elementTally[s.element] = (elementTally[s.element] || 0) + 1;
    const mod = MODALITY[s.index % 3];
    modalityTally[mod] = (modalityTally[mod] || 0) + 1;
  }
  const top = (tally) => Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];

  chart.dominant = { element: top(elementTally), modality: top(modalityTally) };
  chart.ruler = SIGNS[signFromLongitude(sunLon).index].ruler;
  return chart;
}

module.exports = { computeChart, ascendantLongitude, OBLIQUITY_DEG };
