// lib/timezone.js — infer a birthplace's UTC offset from its country, with historical
// DST handled by the IANA database via Intl. No network, no runtime deps.
//
// resolveOffset(cc, datetime) maps an ISO country code to a representative IANA zone,
// then asks Intl for that zone's offset at the (approximate) birth instant — so a 1975
// Swiss birth gets +1 (no DST yet) while a 1982 summer birth gets +2. Countries that
// genuinely span several populated zones return { multiZone: true } so the caller can
// ask for an explicit offset instead of guessing.
'use strict';

// Countries whose populated regions fall in different offsets — a code alone can't decide.
const MULTI_ZONE_CC = new Set([
  'US', 'CA', 'RU', 'AU', 'BR', 'MX', 'ID', 'KZ', 'MN', 'CD', 'GL', 'KI', 'FM', 'UM', 'AQ',
]);

// ISO country code → representative IANA zone (the dominant/most-populous one).
// Island exclaves of otherwise single-zone countries (e.g. Spanish Canaries, Ecuadorian
// Galápagos) are intentionally folded into the mainland zone.
const IANA_BY_CC = {
  // Europe
  AL: 'Europe/Tirane', AD: 'Europe/Andorra', AT: 'Europe/Vienna', BY: 'Europe/Minsk',
  BE: 'Europe/Brussels', BA: 'Europe/Sarajevo', BG: 'Europe/Sofia', HR: 'Europe/Zagreb',
  CY: 'Asia/Nicosia', CZ: 'Europe/Prague', DK: 'Europe/Copenhagen', EE: 'Europe/Tallinn',
  FO: 'Atlantic/Faroe', FI: 'Europe/Helsinki', FR: 'Europe/Paris', DE: 'Europe/Berlin',
  GI: 'Europe/Gibraltar', GR: 'Europe/Athens', HU: 'Europe/Budapest', IS: 'Atlantic/Reykjavik',
  IE: 'Europe/Dublin', IT: 'Europe/Rome', XK: 'Europe/Belgrade', LV: 'Europe/Riga',
  LI: 'Europe/Vaduz', LT: 'Europe/Vilnius', LU: 'Europe/Luxembourg', MT: 'Europe/Malta',
  MD: 'Europe/Chisinau', MC: 'Europe/Monaco', ME: 'Europe/Podgorica', NL: 'Europe/Amsterdam',
  MK: 'Europe/Skopje', NO: 'Europe/Oslo', PL: 'Europe/Warsaw', PT: 'Europe/Lisbon',
  RO: 'Europe/Bucharest', SM: 'Europe/San_Marino', RS: 'Europe/Belgrade', SK: 'Europe/Bratislava',
  SI: 'Europe/Ljubljana', ES: 'Europe/Madrid', SE: 'Europe/Stockholm', CH: 'Europe/Zurich',
  UA: 'Europe/Kyiv', GB: 'Europe/London', VA: 'Europe/Vatican', GG: 'Europe/Guernsey',
  JE: 'Europe/Jersey', IM: 'Europe/Isle_of_Man', AX: 'Europe/Mariehamn', SJ: 'Arctic/Longyearbyen',
  TR: 'Europe/Istanbul',
  // Africa
  DZ: 'Africa/Algiers', AO: 'Africa/Luanda', BJ: 'Africa/Porto-Novo', BW: 'Africa/Gaborone',
  BF: 'Africa/Ouagadougou', BI: 'Africa/Bujumbura', CM: 'Africa/Douala', CV: 'Atlantic/Cape_Verde',
  CF: 'Africa/Bangui', TD: 'Africa/Ndjamena', KM: 'Indian/Comoro', CG: 'Africa/Brazzaville',
  CI: 'Africa/Abidjan', DJ: 'Africa/Djibouti', EG: 'Africa/Cairo', GQ: 'Africa/Malabo',
  ER: 'Africa/Asmara', SZ: 'Africa/Mbabane', ET: 'Africa/Addis_Ababa', GA: 'Africa/Libreville',
  GM: 'Africa/Banjul', GH: 'Africa/Accra', GN: 'Africa/Conakry', GW: 'Africa/Bissau',
  KE: 'Africa/Nairobi', LS: 'Africa/Maseru', LR: 'Africa/Monrovia', LY: 'Africa/Tripoli',
  MG: 'Indian/Antananarivo', MW: 'Africa/Blantyre', ML: 'Africa/Bamako', MR: 'Africa/Nouakchott',
  MU: 'Indian/Mauritius', MA: 'Africa/Casablanca', MZ: 'Africa/Maputo', NA: 'Africa/Windhoek',
  NE: 'Africa/Niamey', NG: 'Africa/Lagos', RW: 'Africa/Kigali', ST: 'Africa/Sao_Tome',
  SN: 'Africa/Dakar', SC: 'Indian/Mahe', SL: 'Africa/Freetown', SO: 'Africa/Mogadishu',
  ZA: 'Africa/Johannesburg', SS: 'Africa/Juba', SD: 'Africa/Khartoum', TZ: 'Africa/Dar_es_Salaam',
  TG: 'Africa/Lome', TN: 'Africa/Tunis', UG: 'Africa/Kampala', ZM: 'Africa/Lusaka',
  ZW: 'Africa/Harare', RE: 'Indian/Reunion', YT: 'Indian/Mayotte', EH: 'Africa/El_Aaiun',
  // Middle East & Asia
  AF: 'Asia/Kabul', AM: 'Asia/Yerevan', AZ: 'Asia/Baku', BH: 'Asia/Bahrain', BD: 'Asia/Dhaka',
  BT: 'Asia/Thimphu', BN: 'Asia/Brunei', KH: 'Asia/Phnom_Penh', CN: 'Asia/Shanghai',
  GE: 'Asia/Tbilisi', HK: 'Asia/Hong_Kong', IN: 'Asia/Kolkata', IR: 'Asia/Tehran',
  IQ: 'Asia/Baghdad', IL: 'Asia/Jerusalem', JP: 'Asia/Tokyo', JO: 'Asia/Amman', KW: 'Asia/Kuwait',
  KG: 'Asia/Bishkek', LA: 'Asia/Vientiane', LB: 'Asia/Beirut', MO: 'Asia/Macau',
  MY: 'Asia/Kuala_Lumpur', MV: 'Indian/Maldives', MM: 'Asia/Yangon', NP: 'Asia/Kathmandu',
  KP: 'Asia/Pyongyang', OM: 'Asia/Muscat', PK: 'Asia/Karachi', PS: 'Asia/Gaza', PH: 'Asia/Manila',
  QA: 'Asia/Qatar', SA: 'Asia/Riyadh', SG: 'Asia/Singapore', KR: 'Asia/Seoul', LK: 'Asia/Colombo',
  SY: 'Asia/Damascus', TW: 'Asia/Taipei', TJ: 'Asia/Dushanbe', TH: 'Asia/Bangkok', TL: 'Asia/Dili',
  TM: 'Asia/Ashgabat', AE: 'Asia/Dubai', UZ: 'Asia/Tashkent', VN: 'Asia/Ho_Chi_Minh', YE: 'Asia/Aden',
  // Americas
  AG: 'America/Antigua', AR: 'America/Argentina/Buenos_Aires', BS: 'America/Nassau',
  BB: 'America/Barbados', BZ: 'America/Belize', BO: 'America/La_Paz', CL: 'America/Santiago',
  CO: 'America/Bogota', CR: 'America/Costa_Rica', CU: 'America/Havana', DM: 'America/Dominica',
  DO: 'America/Santo_Domingo', EC: 'America/Guayaquil', SV: 'America/El_Salvador',
  GD: 'America/Grenada', GT: 'America/Guatemala', GY: 'America/Guyana', HT: 'America/Port-au-Prince',
  HN: 'America/Tegucigalpa', JM: 'America/Jamaica', NI: 'America/Managua', PA: 'America/Panama',
  PY: 'America/Asuncion', PE: 'America/Lima', PR: 'America/Puerto_Rico', KN: 'America/St_Kitts',
  LC: 'America/St_Lucia', VC: 'America/St_Vincent', SR: 'America/Paramaribo',
  TT: 'America/Port_of_Spain', UY: 'America/Montevideo', VE: 'America/Caracas', AW: 'America/Aruba',
  CW: 'America/Curacao', BM: 'Atlantic/Bermuda', GP: 'America/Guadeloupe', MQ: 'America/Martinique',
  GF: 'America/Cayenne', FK: 'Atlantic/Stanley', BQ: 'America/Kralendijk', VG: 'America/Tortola',
  VI: 'America/St_Thomas', KY: 'America/Cayman', TC: 'America/Grand_Turk', BL: 'America/St_Barthelemy',
  MF: 'America/Marigot', AI: 'America/Anguilla', MS: 'America/Montserrat',
  // Oceania
  FJ: 'Pacific/Fiji', PG: 'Pacific/Port_Moresby', NZ: 'Pacific/Auckland', WS: 'Pacific/Apia',
  TO: 'Pacific/Tongatapu', VU: 'Pacific/Efate', SB: 'Pacific/Guadalcanal', NC: 'Pacific/Noumea',
  PF: 'Pacific/Tahiti', GU: 'Pacific/Guam', NR: 'Pacific/Nauru', TV: 'Pacific/Funafuti',
  PW: 'Pacific/Palau', MH: 'Pacific/Majuro', CK: 'Pacific/Rarotonga', NU: 'Pacific/Niue',
  TK: 'Pacific/Fakaofo', WF: 'Pacific/Wallis', AS: 'Pacific/Pago_Pago', MP: 'Pacific/Saipan',
};

// Offset (minutes east of UTC) of an IANA zone at a given instant, via Intl's longOffset.
function offsetMinutesFromZone(zone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' });
  const part = dtf.formatToParts(date).find((p) => p.type === 'timeZoneName');
  if (!part) return null;
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part.value);
  if (!m) return 0; // bare "GMT"/"UTC" → zero offset
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));
}

// Format minutes east of UTC as "+HH:MM" / "-HH:MM".
function fmtOffset(min) {
  const sign = min < 0 ? '-' : '+';
  const abs = Math.abs(min);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `${sign}${h}:${m}`;
}

// Offset (minutes east of UTC) for a known IANA zone at a local wall-clock datetime.
// Reads the datetime as UTC only to pick the DST era (exact except within ~1h of a switch).
function offsetForZone(zone, datetime) {
  if (!zone) return null;
  const approx = new Date(String(datetime).replace(/Z?$/, '') + 'Z');
  if (Number.isNaN(approx.getTime())) return null;
  return offsetMinutesFromZone(zone, approx);
}

/**
 * resolveOffset(cc, datetime) →
 *   { zone, offsetMinutes }  when the country maps to one representative zone
 *   { multiZone: true }      when the country spans several populated offsets
 *   null                     when cc is unknown or datetime unparseable
 * datetime is local wall-clock; it's read as UTC only to pick the DST era, which is
 * exact except within ~1h of a transition.
 */
function resolveOffset(cc, datetime) {
  if (!cc) return null;
  const CC = String(cc).toUpperCase();
  if (MULTI_ZONE_CC.has(CC)) return { multiZone: true };
  const zone = IANA_BY_CC[CC];
  if (!zone) return null;
  const approx = new Date(String(datetime).replace(/Z?$/, '') + 'Z');
  if (Number.isNaN(approx.getTime())) return null;
  const offsetMinutes = offsetMinutesFromZone(zone, approx);
  if (offsetMinutes == null) return null;
  return { zone, offsetMinutes };
}

module.exports = { resolveOffset, offsetForZone, offsetMinutesFromZone, fmtOffset, IANA_BY_CC, MULTI_ZONE_CC };
