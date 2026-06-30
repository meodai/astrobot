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

  function pg(planet) { return glyphs.planetGlyph(planet); }
  function sg(sign) { return glyphs.signGlyph(sign); }

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

  function renderPlacements(chart) {
    var list = document.getElementById('placements');
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
          '<span class="mood-tag__glyph">' + esc(glyphs.aspectGlyph(aspect)) + '</span> ' +
          esc(aspect) + ' natal Sun</span>'
      : '';

    card.innerHTML =
      '<header class="gallery-card__head">' +
        '<span class="gallery-card__glyph">' + sg(c.sun.sign) + '</span>' +
        '<div>' +
          '<h3 class="gallery-card__name">' + esc(entry.label) + '</h3>' +
          '<p class="gallery-card__model">' + esc(entry.model) + '</p>' +
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

  /* ---- Boot ------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', function () {
    populateCities();
    wireControls();
    updateScrubLabel();
    render();
    renderGallery();
  });
})();
