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

  var ORDINAL = ['1st', '2nd', '3rd'];

  function pg(planet) { return glyphs.planetGlyph(planet); }
  function sg(sign) { return glyphs.signGlyph(sign); }

  function placementRow(glyph, label, sign, extra) {
    var li = document.createElement('li');
    li.className = 'placement';
    li.innerHTML =
      '<span class="placement__glyph">' + glyph + '</span>' +
      '<span class="placement__label">' + label + '</span>' +
      '<span class="placement__value">' + sg(sign) + ' ' + sign +
      (extra ? ' <em>' + extra + '</em>' : '') + '</span>';
    return li;
  }

  function renderPlacements(chart) {
    var list = document.getElementById('placements');
    list.innerHTML = '';
    list.appendChild(placementRow(pg('Sun'), 'Sun', chart.sun.sign,
      (ORDINAL[chart.sun.decan] || (chart.sun.decan + 1) + 'th') + ' decan'));
    list.appendChild(placementRow(pg('Moon'), 'Moon', chart.moon.sign));
    list.appendChild(placementRow(pg('Mercury'), 'Mercury', chart.mercury.sign));
    list.appendChild(placementRow(pg('Venus'), 'Venus', chart.venus.sign));
    list.appendChild(placementRow(pg('Mars'), 'Mars', chart.mars.sign));
    list.appendChild(placementRow(pg('Jupiter'), 'Jupiter', chart.jupiter.sign));
    list.appendChild(placementRow(pg('Saturn'), 'Saturn', chart.saturn.sign));
    list.appendChild(placementRow('↑', 'Rising', chart.ascendant.sign));

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
    var mood = A.composeMood(chart, skyDate());
    var color = currentColor(chart);

    drawWheel('pg-wheel', chart, pgWheelSize());
    $('pg-caption').textContent = 'Fig. — Nativity, ' + sg(chart.sun.sign) + ' ' + chart.sun.sign +
      ' with ' + chart.ascendant.sign + ' rising';

    renderPlacements(chart);

    $('pg-swatch').style.background = color.hex;
    $('pg-swatch-name').textContent = color.name + '  ' + color.hex;
    renderDials($('pg-dials'), mood.dials);

    var profile = {
      chart: chart,
      color: color,
      persona: '(placeholder — a real persona is written by the model)',
      traits: []
    };
    $('pg-context').textContent = A.renderContextBlock(profile, mood);
  }

  function wireControls() {
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

    card.innerHTML =
      '<header class="gallery-card__head">' +
        '<span class="gallery-card__glyph">' + sg(c.sun.sign) + '</span>' +
        '<div>' +
          '<h3 class="gallery-card__name">' + entry.label + '</h3>' +
          '<p class="gallery-card__model">' + entry.model + '</p>' +
        '</div>' +
      '</header>' +
      '<figure class="plate plate--compact">' +
        '<div class="wheel wheel--compact" id="' + wheelId + '" role="img" aria-label="Chart wheel for ' + entry.label + '"></div>' +
      '</figure>' +
      '<div class="swatch-row">' +
        '<span class="swatch" style="background:' + entry.color.hex + '"></span>' +
        '<span class="swatch__name">' + entry.color.name + '  ' + entry.color.hex + '</span>' +
      '</div>' +
      '<p class="gallery-card__persona">' + entry.persona + '</p>' +
      '<p class="gallery-card__summary">' +
        pg('Sun') + ' ' + c.sun.sign + ' · ' + pg('Moon') + ' ' + c.moon.sign + ' · ' +
        c.ascendant.sign + ' rising · ' + c.dominant.element + ' ' + c.dominant.modality +
      '</p>' +
      '<div class="gallery-card__mood">' +
        '<span class="mood-tag">Sample sky: ' + entry.sample.mood.moon.phase + ' moon in ' +
        entry.sample.mood.moon.sign + '</span>' +
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
