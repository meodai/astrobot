// lib/ephemeris.js
const astronomy = require('../vendor/astronomy.js');
const { norm360 } = require('./zodiac.js');

const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

function eclipticLongitudeOf(body, date) {
  if (body === 'Sun') {
    return norm360(astronomy.SunPosition(date).elon);
  }
  if (body === 'Moon') {
    return norm360(astronomy.EclipticGeoMoon(date).lon);
  }
  const vec = astronomy.GeoVector(astronomy.Body[body], date, true);
  return norm360(astronomy.Ecliptic(vec).elon);
}

function moonPhaseAngle(date) {
  return norm360(astronomy.MoonPhase(date));
}

function gastHours(date) {
  return ((astronomy.SiderealTime(date) % 24) + 24) % 24;
}

module.exports = { BODIES, eclipticLongitudeOf, moonPhaseAngle, gastHours };
