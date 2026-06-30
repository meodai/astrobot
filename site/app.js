/* astrobot microsite — playground + gallery.
 * All astrology comes from the bundled engine (globalThis.Astrobot).
 * The only chart math here is wheelData(): whole-sign houses from the ascendant,
 * shaped for the AstroChart SVG library (globalThis.astrology).
 */
(function () {
  'use strict';

  var A = window.Astrobot;
  var glyphs = A.glyphs;

  /* ---- Chart wheel ------------------------------------------------------ */

  // Whole-sign houses from the ascendant; no fabricated MC.
  function wheelData(chart) {
    var ascSignStart = Math.floor(chart.ascendant.lon / 30) * 30;
    var cusps = Array.from({ length: 12 }, function (_, i) {
      return (ascSignStart + 30 * i) % 360;
    });
    return {
      planets: {
        Sun: [chart.sun.lon], Moon: [chart.moon.lon], Mercury: [chart.mercury.lon],
        Venus: [chart.venus.lon], Mars: [chart.mars.lon], Jupiter: [chart.jupiter.lon],
        Saturn: [chart.saturn.lon]
      },
      cusps: cusps
    };
  }

  // Gold-on-dark engraved-plate theme, sized for the requested px.
  function wheelSettings(size) {
    var scale = Math.max(0.5, size / 440);
    return {
      COLOR_BACKGROUND: 'transparent',
      POINTS_COLOR: '#E7CE84',            // planet glyphs — gilt
      POINTS_TEXT_SIZE: Math.round(8 * scale),
      SIGNS_COLOR: '#C9A24B',             // sign glyphs + degree text — leaf gold
      CIRCLE_COLOR: '#7d6a37',            // ring strokes — tarnished gold
      LINE_COLOR: '#6c5b30',             // spokes
      CUSPS_FONT_COLOR: '#C9A24B',
      SYMBOL_AXIS_FONT_COLOR: '#E7CE84',
      SYMBOL_SCALE: scale,
      MARGIN: Math.round(size * 0.1),
      PADDING: Math.round(size * 0.03),
      STROKE_ONLY: false,
      SHOW_DIGNITIES_TEXT: false,
      COLORS_SIGNS: [
        '#D9A441', '#A9863F', '#C9B071', '#8FA39A', // Aries Taurus Gemini Cancer
        '#D9A441', '#A9863F', '#C9B071', '#8FA39A', // Leo Virgo Libra Scorpio
        '#D9A441', '#A9863F', '#C9B071', '#8FA39A'  // Sag Cap Aqu Pisces
      ],
      ASPECTS: {
        conjunction: { degree: 0, orbit: 8, color: 'transparent' },
        sextile: { degree: 60, orbit: 5, color: '#8FA39A' },
        square: { degree: 90, orbit: 6, color: '#9E4636' },
        trine: { degree: 120, orbit: 6, color: '#C9A24B' },
        opposition: { degree: 180, orbit: 8, color: '#B08A3A' }
      }
    };
  }

  function drawWheel(elementId, chart, size) {
    var el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '';
    var data = wheelData(chart);
    var radix = new astrology.Chart(elementId, size, size, wheelSettings(size)).radix(data);
    radix.addPointsOfInterest({ As: [data.cusps[0]], Ds: [data.cusps[6]] });
    radix.aspects();
  }

  /* ---- Antique pigments suggested per chart ruler ----------------------- */

  var RULER_COLORS = {
    Sun: { name: 'Old Gold', hex: '#C9A227' },
    Moon: { name: 'Pewter Silver', hex: '#AEB6BF' },
    Mercury: { name: 'Quicksilver', hex: '#9AA7AE' },
    Venus: { name: 'Verdigris Rose', hex: '#7FA08A' },
    Mars: { name: 'Sealing-Wax Red', hex: '#9E4636' },
    Jupiter: { name: 'Indigo Dusk', hex: '#3F4C8C' },
    Saturn: { name: 'Slate', hex: '#3A4750' }
  };

  /* ---- Small formatting helpers (presentation only) -------------------- */

  // Escape strings that originate in gallery.json before any innerHTML use.
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // English ordinal for 1..12 (and beyond): 1st, 2nd, 3rd, 4th…
  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // U+FE0E (text variation selector) forces monochrome text presentation instead
  // of color emoji — CSS font-variant-emoji isn't honored in all browsers (Safari).
  var VS_TEXT = String.fromCharCode(0xFE0E);
  function asText(g) { return g ? g + VS_TEXT : ''; }
  function pg(planet) { return asText(glyphs.planetGlyph(planet)); }
  function sg(sign) { return asText(glyphs.signGlyph(sign)); }

  // glyph/label/sign/extra are engine-derived (safe). house is a number.
  function placementRow(glyph, label, sign, house, extra) {
    var li = document.createElement('li');
    li.className = 'placement';
    li.innerHTML =
      '<span class="placement__glyph">' + glyph + '</span>' +
      '<span class="placement__label">' + label + '</span>' +
      '<span class="placement__value">' + sg(sign) + ' ' + sign +
      (house ? ' · ' + ordinal(house) + ' house' : '') +
      (extra ? ' <em>' + extra + '</em>' : '') + '</span>';
    return li;
  }

  function renderPlacements(chart, list) {
    list = list || document.getElementById('placements');
    list.innerHTML = '';
    list.appendChild(placementRow(pg('Sun'), 'Sun', chart.sun.sign, chart.sun.house,
      ordinal(chart.sun.decan + 1) + ' decan'));
    list.appendChild(placementRow(pg('Moon'), 'Moon', chart.moon.sign, chart.moon.house));
    list.appendChild(placementRow(pg('Mercury'), 'Mercury', chart.mercury.sign, chart.mercury.house));
    list.appendChild(placementRow(pg('Venus'), 'Venus', chart.venus.sign, chart.venus.house));
    list.appendChild(placementRow(pg('Mars'), 'Mars', chart.mars.sign, chart.mars.house));
    list.appendChild(placementRow(pg('Jupiter'), 'Jupiter', chart.jupiter.sign, chart.jupiter.house));
    list.appendChild(placementRow(pg('Saturn'), 'Saturn', chart.saturn.sign, chart.saturn.house));
    list.appendChild(placementRow('↑', 'Rising', chart.ascendant.sign, 1));

    var dom = document.createElement('li');
    dom.className = 'placement placement--summary';
    dom.innerHTML =
      '<span class="placement__glyph">✦</span>' +
      '<span class="placement__label">Dominant</span>' +
      '<span class="placement__value">' + chart.dominant.element + ' · ' +
      chart.dominant.modality + ' · ruled by ' + pg(chart.ruler) + ' ' + chart.ruler + '</span>';
    list.appendChild(dom);
  }

  function renderDials(container, dials) {
    container.innerHTML = '';
    Object.keys(dials).forEach(function (key) {
      var v = dials[key];
      var row = document.createElement('div');
      row.className = 'dial';
      var pips = '';
      for (var i = 0; i < 4; i++) {
        pips += '<span class="pip' + (i < v ? ' pip--on' : '') + '"></span>';
      }
      row.innerHTML =
        '<dt class="dial__name">' + key + '</dt>' +
        '<dd class="dial__gauge" aria-label="' + v + ' of 4">' + pips + '</dd>';
      container.appendChild(row);
    });
  }

  /* ---- Playground ------------------------------------------------------ */

  var colorTouched = false;
  var pgResizeTimer = null;
  var lastChart = null;

  function $(id) { return document.getElementById(id); }

  function populateCities() {
    var sel = $('birth-city');
    var custom = document.createElement('option');
    custom.value = '__custom__';
    custom.textContent = 'Custom coordinates…';
    sel.appendChild(custom);
    Object.keys(A.CITIES).forEach(function (name) {
      var o = document.createElement('option');
      o.value = name;
      o.textContent = name;
      sel.appendChild(o);
    });
    sel.value = 'Reykjavík';
  }

  function currentCoords() {
    var city = $('birth-city').value;
    if (city === '__custom__') {
      return { lat: parseFloat($('birth-lat').value), lon: parseFloat($('birth-lon').value) };
    }
    var c = A.CITIES[city];
    return { lat: c.lat, lon: c.lon };
  }

  function buildBirth() {
    var date = $('birth-date').value || '1996-11-08';
    var time = $('birth-time').value || '12:00';
    var coords = currentCoords();
    return {
      datetime: date + 'T' + time + ':00',
      tzOffsetMinutes: 0,
      lat: coords.lat,
      lon: coords.lon
    };
  }

  function skyDate() {
    var offset = parseInt($('scrub').value, 10) || 0;
    var d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  }

  function updateScrubLabel() {
    var d = skyDate();
    var offset = parseInt($('scrub').value, 10) || 0;
    var label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    $('scrub-date').textContent = offset === 0 ? 'today (' + label + ')' : label;
  }

  function currentColor(chart) {
    if (colorTouched) {
      var hex = $('fav-color').value;
      return { name: hex.toUpperCase(), hex: hex };
    }
    var ruler = RULER_COLORS[chart.ruler] || { name: 'Old Gold', hex: '#C9A227' };
    $('fav-color').value = ruler.hex;
    return ruler;
  }

  function pgWheelSize() {
    var plate = document.querySelector('#playground .wheel');
    var w = plate ? plate.clientWidth : 380;
    return Math.max(280, Math.min(440, Math.round(w)));
  }

  var HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
  function safeHex(hex) { return HEX_RE.test(hex) ? hex : '#888888'; }

  function renderLore(containerId, hex) {
    var el = $(containerId);
    if (!el) return;
    var lore = A.colorLore && A.colorLore(hex);
    if (!lore) { el.textContent = ''; return; }
    el.textContent = lore.warmCool + ' · ' + lore.vividMuted + ' · ' +
      lore.planet + ' · ' + lore.chakra.name + ' chakra (' + lore.chakra.theme + ') · ' + lore.theosophy;
  }

  function render() {
    var birth, chart;
    try {
      birth = buildBirth();
      chart = A.computeChart(birth);
    } catch (err) {
      $('placements').innerHTML = '<li class="placement">Enter a valid date, time, and coordinates.</li>';
      return;
    }
    lastChart = chart;
    var color = currentColor(chart);
    var mood = A.composeMood(chart, skyDate(), color.hex);

    drawWheel('pg-wheel', chart, pgWheelSize());
    $('pg-caption').textContent = 'Fig. — Nativity, ' + sg(chart.sun.sign) + ' ' + chart.sun.sign +
      ' with ' + chart.ascendant.sign + ' rising';

    renderPlacements(chart);

    var validHex = safeHex(color.hex);
    $('pg-swatch').style.setProperty('background', validHex);
    $('pg-swatch-name').textContent = color.name + '  ' + color.hex;
    renderLore('pg-lore', color.hex);
    renderDials($('pg-dials'), mood.dials);

    var pgTarot = A.tarotFor && A.tarotFor(chart);
    var pgTarotEl = $('pg-tarot');
    if (pgTarotEl) {
      if (pgTarot && pgTarot.birthCard) {
        var pgImgs = '';
        if (A.cardSlug && A.cardSlug(pgTarot.birthCard)) {
          pgImgs += '<span class="tarot-card"><img src="cards/' + A.cardSlug(pgTarot.birthCard) + '.jpg" alt="' + esc(pgTarot.birthCard) + '" loading="lazy"></span>';
        }
        if (A.cardSlug && A.cardSlug(pgTarot.decanCard)) {
          pgImgs += '<span class="tarot-card"><img src="cards/' + A.cardSlug(pgTarot.decanCard) + '.jpg" alt="' + esc(pgTarot.decanCard) + '" loading="lazy"></span>';
        }
        pgTarotEl.innerHTML =
          (pgImgs ? '<span class="tarot-cards">' + pgImgs + '</span>' : '') +
          '<span class="tarot-caption">Birth card: ' + esc(pgTarot.birthCard) + ' · Decan: ' + esc(pgTarot.decanCard) + '</span>';
      } else {
        pgTarotEl.innerHTML = '';
      }
    }

    var profile = {
      chart: chart,
      color: color,
      persona: '(placeholder — a real persona is written by the model)',
      traits: []
    };
    $('pg-context').textContent = A.renderContextBlock(profile, mood);
  }

  /* ---- Roll a random identity (pure input randomization) --------------- */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function rollIdentity() {
    // Plausible birth window; day capped at 28 to stay valid for every month.
    $('birth-date').value =
      randInt(1940, 2012) + '-' + pad2(randInt(1, 12)) + '-' + pad2(randInt(1, 28));
    $('birth-time').value = pad2(randInt(0, 23)) + ':' + pad2(randInt(0, 59));

    var cities = Object.keys(A.CITIES);
    $('birth-city').value = cities[randInt(0, cities.length - 1)];
    $('manual-coords').hidden = true;

    var hex = '#' + ('000000' + randInt(0, 0xffffff).toString(16)).slice(-6);
    $('fav-color').value = hex;
    colorTouched = true;
    $('color-hint').textContent = 'Rolled a random color. Reload to return to the suggested pigment.';

    render();
  }

  function wireControls() {
    $('roll').addEventListener('click', rollIdentity);
    ['birth-date', 'birth-time', 'birth-lat', 'birth-lon'].forEach(function (id) {
      $(id).addEventListener('input', render);
    });
    $('birth-city').addEventListener('change', function () {
      $('manual-coords').hidden = $('birth-city').value !== '__custom__';
      render();
    });
    $('fav-color').addEventListener('input', function () {
      colorTouched = true;
      $('color-hint').textContent = 'Custom color set. Reload to return to the suggested pigment.';
      render();
    });
    $('scrub').addEventListener('input', function () {
      updateScrubLabel();
      render();
    });
    window.addEventListener('resize', function () {
      clearTimeout(pgResizeTimer);
      pgResizeTimer = setTimeout(function () {
        if (lastChart) drawWheel('pg-wheel', lastChart, pgWheelSize());
        if (myoChart) drawWheel('myo-wheel', myoChart, myoWheelSize());
      }, 180);
    });
  }

  /* ---- Gallery --------------------------------------------------------- */

  function galleryCard(entry, index) {
    var card = document.createElement('article');
    card.className = 'gallery-card plate-frame';
    var wheelId = 'gw-' + index;
    var c = entry.chart;
    var dialsId = 'gd-' + index;

    var mood = entry.sample.mood;
    var aspect = mood.sunAspect;
    var aspectTag = aspect
      ? '<span class="mood-tag mood-tag--aspect">Transiting Sun ' +
          '<span class="mood-tag__glyph">' + esc(asText(glyphs.aspectGlyph(aspect))) + '</span> ' +
          esc(aspect) + ' natal Sun</span>'
      : '';

    card.innerHTML =
      '<header class="gallery-card__head">' +
        '<span class="gallery-card__glyph">' + sg(c.sun.sign) + '</span>' +
        '<div>' +
          '<h3 class="gallery-card__name">' + esc(entry.label) + '</h3>' +
        '</div>' +
      '</header>' +
      '<figure class="plate plate--compact">' +
        '<div class="wheel wheel--compact" id="' + wheelId + '" role="img" aria-label="Chart wheel for ' + esc(entry.label) + '"></div>' +
      '</figure>' +
      '<div class="swatch-row">' +
        '<span class="swatch" style="background:' + (HEX_RE.test(entry.color.hex) ? esc(entry.color.hex) : '#888888') + '"></span>' +
        '<span class="swatch__name">' + esc(entry.color.name) + '  ' + esc(entry.color.hex) + '</span>' +
      '</div>' +
      (function () {
        var lore = A.colorLore && A.colorLore(entry.color.hex);
        return lore
          ? '<p class="color-lore">' + esc(lore.warmCool) + ' · ' + esc(lore.vividMuted) + ' · ' +
            esc(lore.planet) + ' · ' + esc(lore.chakra.name) + ' chakra (' + esc(lore.chakra.theme) + ') · ' +
            esc(lore.theosophy) + '</p>'
          : '';
      }()) +
      (function () {
        var t = A.tarotFor && A.tarotFor(c);
        if (!(t && t.birthCard)) return '';
        var imgs = '';
        if (A.cardSlug && A.cardSlug(t.birthCard)) {
          imgs += '<span class="tarot-card"><img src="cards/' + A.cardSlug(t.birthCard) + '.jpg" alt="' + esc(t.birthCard) + '" loading="lazy"></span>';
        }
        if (A.cardSlug && A.cardSlug(t.decanCard)) {
          imgs += '<span class="tarot-card"><img src="cards/' + A.cardSlug(t.decanCard) + '.jpg" alt="' + esc(t.decanCard) + '" loading="lazy"></span>';
        }
        return '<p class="tarot-line">' +
          (imgs ? '<span class="tarot-cards">' + imgs + '</span>' : '') +
          '<span class="tarot-caption">Birth card: ' + esc(t.birthCard) + ' · Decan: ' + esc(t.decanCard) + '</span>' +
          '</p>';
      }()) +
      '<p class="gallery-card__persona">' + esc(entry.persona) + '</p>' +
      '<p class="gallery-card__summary">' +
        pg('Sun') + ' ' + c.sun.sign + ' (' + ordinal(c.sun.house) + ') · ' +
        pg('Moon') + ' ' + c.moon.sign + ' (' + ordinal(c.moon.house) + ') · ' +
        c.ascendant.sign + ' rising · ' + c.dominant.element + ' ' + c.dominant.modality +
      '</p>' +
      '<div class="gallery-card__mood">' +
        '<span class="mood-tag">Sample sky: ' + esc(mood.moon.phase) + ' moon in ' +
        esc(mood.moon.sign) + '</span>' +
        aspectTag +
        '<dl class="dials dials--compact" id="' + dialsId + '"></dl>' +
      '</div>';

    return { card: card, wheelId: wheelId, dialsId: dialsId, chart: c, dials: entry.sample.mood.dials };
  }

  function renderGallery() {
    var grid = document.getElementById('gallery-grid');
    fetch('gallery.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (entries) {
        grid.innerHTML = '';
        var built = entries.map(galleryCard);
        built.forEach(function (b) { grid.appendChild(b.card); });
        // Draw after the cards are in the DOM so AstroChart can size them.
        built.forEach(function (b) {
          drawWheel(b.wheelId, b.chart, 240);
          renderDials(document.getElementById(b.dialsId), b.dials);
        });
      })
      .catch(function (err) {
        grid.innerHTML =
          '<p class="gallery-error">The cabinet could not be opened (' + err.message +
          '). Serve this page over HTTP — for example <code>python3 -m http.server</code> from the <code>site/</code> folder — so the gallery data can load.</p>';
      });
  }

  /* ---- Make your own (mint an identity for any LLM) -------------------- */

  var MYO_KEY = 'astrobot:identity';
  var myoState = null;   // { birth, colorHex, chart } from the latest roll
  var myoChart = null;   // chart currently drawn in the myo wheel (for resize)

  function myoWheelSize() {
    var plate = document.querySelector('#make-your-own .wheel');
    var w = plate ? plate.clientWidth : 300;
    return Math.max(240, Math.min(380, Math.round(w)));
  }

  // Show a step <li> and, optionally, scroll it into view.
  function myoShow(id, reveal) {
    var el = $(id);
    if (el) el.hidden = !reveal;
  }

  function myoRenderRolled(chart, birth, colorHex) {
    // Reveal BEFORE drawing: AstroChart needs a laid-out (non-display:none)
    // container, or the SVG/text measures at zero and the wheel renders blank.
    $('myo-rolled').hidden = false;

    var born = $('myo-born');
    born.textContent = 'Born ' + birth.datetime.replace('T', ' ').slice(0, 16) +
      ' · ' + birth.place + ' (' + birth.lat + ', ' + birth.lon + ')';

    myoChart = chart;
    drawWheel('myo-wheel', chart, myoWheelSize());
    $('myo-caption').textContent = 'Fig. — Nativity, ' + sg(chart.sun.sign) + ' ' +
      chart.sun.sign + ' with ' + chart.ascendant.sign + ' rising';

    renderPlacements(chart, $('myo-placements'));

    var validHex = safeHex(colorHex);
    $('myo-swatch').style.setProperty('background', validHex);
    $('myo-swatch-name').textContent = colorHex.toUpperCase();
    renderLore('myo-lore', colorHex);

    var myoTarot = A.tarotFor && A.tarotFor(chart);
    var myoTarotEl = $('myo-tarot');
    if (myoTarotEl) {
      if (myoTarot && myoTarot.birthCard) {
        var myoImgs = '';
        if (A.cardSlug && A.cardSlug(myoTarot.birthCard)) {
          myoImgs += '<span class="tarot-card"><img src="cards/' + A.cardSlug(myoTarot.birthCard) + '.jpg" alt="' + esc(myoTarot.birthCard) + '" loading="lazy"></span>';
        }
        if (A.cardSlug && A.cardSlug(myoTarot.decanCard)) {
          myoImgs += '<span class="tarot-card"><img src="cards/' + A.cardSlug(myoTarot.decanCard) + '.jpg" alt="' + esc(myoTarot.decanCard) + '" loading="lazy"></span>';
        }
        myoTarotEl.innerHTML =
          (myoImgs ? '<span class="tarot-cards">' + myoImgs + '</span>' : '') +
          '<span class="tarot-caption">Birth card: ' + esc(myoTarot.birthCard) + ' · Decan: ' + esc(myoTarot.decanCard) + '</span>';
      } else {
        myoTarotEl.innerHTML = '';
      }
    }
  }

  function myoRoll() {
    var date = randInt(1940, 2012) + '-' + pad2(randInt(1, 12)) + '-' + pad2(randInt(1, 28));
    var time = pad2(randInt(0, 23)) + ':' + pad2(randInt(0, 59));
    var cities = Object.keys(A.CITIES);
    var cityName = cities[randInt(0, cities.length - 1)];
    var c = A.CITIES[cityName];
    var colorHex = '#' + ('000000' + randInt(0, 0xffffff).toString(16)).slice(-6);

    var birth = {
      datetime: date + 'T' + time + ':00',
      tzOffsetMinutes: 0,
      place: cityName,
      lat: c.lat,
      lon: c.lon
    };

    var chart;
    try {
      chart = A.computeChart(birth);
    } catch (err) {
      $('myo-born').textContent = 'The ephemeris stumbled on that roll — try rolling again.';
      $('myo-rolled').hidden = false;
      return;
    }

    myoState = { birth: birth, colorHex: colorHex, chart: chart };
    myoRenderRolled(chart, birth, colorHex);

    $('myo-prompt').value = A.renderBirthPrompt({ birth: birth, colorHex: colorHex, chart: chart, closing: 'Return only the filled-in JSON object — no other text.' });
    $('myo-reply').value = '';
    myoHideError();

    myoShow('myo-step-prompt', true);
    myoShow('myo-step-reply', true);
    myoShow('myo-step-result', false);
  }

  function myoHideError() {
    var e = $('myo-reply-error');
    e.hidden = true;
    e.textContent = '';
  }

  function myoShowError(msg) {
    var e = $('myo-reply-error');
    e.textContent = msg;
    e.hidden = false;
  }

  // Accept the full birth object or a bare { persona, color, traits } reply.
  function myoParseReply(raw, colorHex) {
    var data = JSON.parse(raw);                 // throws on bad JSON
    if (!data || typeof data !== 'object') throw new Error('not an object');

    var persona = typeof data.persona === 'string' ? data.persona.trim() : '';
    if (!persona) throw new Error('no persona');

    var name = '';
    if (data.color && typeof data.color === 'object' && data.color.name) name = String(data.color.name);
    else if (typeof data.color === 'string') name = data.color;
    if (!name) name = colorHex.toUpperCase();

    var traits = Array.isArray(data.traits)
      ? data.traits.filter(function (t) { return typeof t === 'string' && t.trim(); })
      : [];

    return { persona: persona, name: name, traits: traits };
  }

  function myoAssemble() {
    if (!myoState) return;
    var raw = $('myo-reply').value.trim();
    if (!raw) { myoShowError('Paste the JSON block the model returned.'); return; }

    var parsed;
    try {
      parsed = myoParseReply(raw, myoState.colorHex);
    } catch (err) {
      myoShowError('Couldn’t read that — paste the JSON block the model returned (it needs at least a "persona").');
      return;
    }
    myoHideError();

    var profile = {
      birth: myoState.birth,
      chart: myoState.chart,
      color: { name: parsed.name, hex: myoState.colorHex },
      persona: parsed.persona,
      traits: parsed.traits
    };

    try {
      localStorage.setItem(MYO_KEY, JSON.stringify(profile));
    } catch (err) { /* private mode / quota — non-fatal */ }

    myoRenderResult(profile);
    myoShow('myo-step-result', true);
  }

  function myoRenderResult(profile) {
    var mood = A.composeMood(profile.chart, new Date(), profile.color.hex);
    $('myo-block').value = A.renderPortableBlock(profile, mood);
  }

  function myoStartOver() {
    try { localStorage.removeItem(MYO_KEY); } catch (err) { /* ignore */ }
    myoState = null;
    myoChart = null;
    $('myo-rolled').hidden = true;
    $('myo-prompt').value = '';
    $('myo-reply').value = '';
    $('myo-block').value = '';
    myoHideError();
    myoShow('myo-step-prompt', false);
    myoShow('myo-step-reply', false);
    myoShow('myo-step-result', false);
  }

  function myoCopy(textareaId, btn) {
    var ta = $(textareaId);
    var label = btn.textContent;
    function done() {
      btn.textContent = 'Copied ✓';
      setTimeout(function () { btn.textContent = label; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); done(); });
    } else {
      ta.select();
      try { document.execCommand('copy'); } catch (err) { /* ignore */ }
      done();
    }
  }

  // Restore a saved identity: show the rolled chart and today's portable block.
  function myoRestore() {
    var raw;
    try { raw = localStorage.getItem(MYO_KEY); } catch (err) { return; }
    if (!raw) return;

    var profile;
    try { profile = JSON.parse(raw); } catch (err) { return; }
    if (!profile || !profile.chart || !profile.color) return;

    var birth = profile.birth || { datetime: '', place: '', lat: '', lon: '' };
    myoState = { birth: birth, colorHex: profile.color.hex, chart: profile.chart };

    myoRenderRolled(profile.chart, birth, profile.color.hex);
    if (birth.datetime) {
      $('myo-prompt').value = A.renderBirthPrompt({
        birth: birth, colorHex: profile.color.hex, chart: profile.chart,
        closing: 'Return only the filled-in JSON object — no other text.'
      });
    }
    $('myo-reply').value = '';
    myoRenderResult(profile);
    myoShow('myo-step-result', true);
  }

  function wireMakeYourOwn() {
    $('myo-roll').addEventListener('click', myoRoll);
    $('myo-reply-submit').addEventListener('click', myoAssemble);
    $('myo-startover').addEventListener('click', myoStartOver);
    $('myo-prompt-copy').addEventListener('click', function () { myoCopy('myo-prompt', this); });
    $('myo-block-copy').addEventListener('click', function () { myoCopy('myo-block', this); });
    myoRestore();
  }

  /* ---- Starfield (vintage parallax, generated at runtime) -------------- */

  // Build a CSS box-shadow list of `count` faint stars scattered across a
  // `size`×`size` px field. Tints are parchment/gold at low, varied alpha so
  // the field whispers rather than glares. No animation here: the slow drift
  // and seamless loop live in CSS (and are disabled by prefers-reduced-motion),
  // so a static field is rendered when motion is reduced.
  function buildStarShadows(count, w, h) {
    // Weighted toward warm parchment, with a minority of leaf/gilt gold.
    var tones = [
      '233,224,203', '233,224,203', '233,224,203', // parchment (common)
      '201,162,75', '201,162,75',                   // leaf gold
      '231,206,132'                                 // gilt highlight (rare)
    ];
    var parts = new Array(count);
    for (var i = 0; i < count; i++) {
      var x = (Math.random() * w) | 0;
      var y = (Math.random() * h) | 0;
      var tone = tones[(Math.random() * tones.length) | 0];
      var alpha = (0.18 + Math.random() * 0.42).toFixed(2); // 0.18–0.60, varied brightness
      parts[i] = x + 'px ' + y + 'px 0 0 rgba(' + tone + ',' + alpha + ')';
    }
    return parts.join(',');
  }

  function initStarfield() {
    var field = document.querySelector('.starfield');
    if (!field) return;
    var FIELD = 2000;                                     // vertical loop height
    var W = Math.max(FIELD, window.innerWidth || FIELD);  // cover ultrawide screens
    // Modest counts for mobile perf; CSS gives each layer its size and speed.
    var layers = [
      ['.starfield__layer--sm', 500],
      ['.starfield__layer--md', 250],
      ['.starfield__layer--lg', 120]
    ];
    layers.forEach(function (cfg) {
      var el = field.querySelector(cfg[0]);
      if (!el) return;
      el.style.setProperty('--field-h', FIELD + 'px');
      el.style.setProperty('--star-shadows', buildStarShadows(cfg[1], W, FIELD));
    });
  }

  /* ---- Boot ------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', function () {
    initStarfield();
    populateCities();
    wireControls();
    updateScrubLabel();
    render();
    wireMakeYourOwn();
    renderGallery();
  });
})();
