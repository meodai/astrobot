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

  // Two tarot cards, each with a plaque (role + name) above the image.
  function tarotCardsHtml(t) {
    if (!t || !A.cardSlug) return '';
    function card(name, role) {
      var slug = A.cardSlug(name);
      if (!slug) return '';
      return '<span class="tarot-card">' +
        '<span class="tarot-plaque"><span class="tarot-plaque__role">' + esc(role) + '</span>' +
        '<span class="tarot-plaque__name">' + esc(name) + '</span></span>' +
        '<img src="cards/' + slug + '.jpg" alt="' + esc(name) + '" loading="lazy"></span>';
    }
    var inner = card(t.birthCard, 'Birth Card') + card(t.decanCard, 'Decan');
    return inner ? '<span class="tarot-cards">' + inner + '</span>' : '';
  }
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

  function populateCitySelect(selectId, defaultCity) {
    var sel = $(selectId);
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
    sel.value = defaultCity;
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
      var name = (A.colorName && A.colorName(hex)) || hex.toUpperCase();
      return { name: name, hex: hex };
    }
    var ruler = RULER_COLORS[chart.ruler] || { name: 'Old Gold', hex: '#C9A227' };
    $('fav-color').value = ruler.hex;
    var rulerName = (A.colorName && A.colorName(ruler.hex)) || ruler.name;
    return { name: rulerName, hex: ruler.hex };
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
    { var _rd = $('pg-reading'); if (_rd) _rd.textContent = mood.reading || ''; }

    var pgTarot = A.tarotFor && A.tarotFor(chart);
    var pgTarotEl = $('pg-tarot');
    if (pgTarotEl) {
      if (pgTarot && pgTarot.birthCard) {
        pgTarotEl.innerHTML = tarotCardsHtml(pgTarot);
      } else {
        pgTarotEl.innerHTML = '';
      }
    }

    var profile = {
      chart: chart,
      color: color,
      persona: '(placeholder — a real persona is written by the model)',
      traits: [],
      havoc: $('pg-havoc') ? $('pg-havoc').checked : false
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
    if ($('pg-havoc')) $('pg-havoc').addEventListener('change', render);
    window.addEventListener('resize', function () {
      clearTimeout(pgResizeTimer);
      pgResizeTimer = setTimeout(function () {
        if (lastChart) drawWheel('pg-wheel', lastChart, pgWheelSize());
        if (myoChart) drawWheel('myo-wheel', myoChart, myoWheelSize());
      }, 180);
    });
  }

  /* ---- Compatibility (synastry) --------------------------------------- */

  var _citiesGeo = null;
  function loadCitiesGeo() {
    if (_citiesGeo) return _citiesGeo;
    _citiesGeo = fetch('cities-geo.json').then(function (r) { return r.json(); }).catch(function () { return []; });
    return _citiesGeo;
  }

  function attachTypeahead(input, list) {
    input.addEventListener('focus', function () { loadCitiesGeo(); });

    input.addEventListener('input', function () {
      delete input.dataset.lat;
      delete input.dataset.lon;
      var query = input.value.trim().toLowerCase();
      if (query.length < 2) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
      var captured = query;
      loadCitiesGeo().then(function (cities) {
        if (input.value.trim().toLowerCase() !== captured) return;
        var starts = [], includes = [];
        for (var i = 0; i < cities.length; i++) {
          var entry = cities[i];
          var nameLow = entry[0].toLowerCase();
          if (nameLow.startsWith(captured)) {
            starts.push(entry);
          } else if (nameLow.indexOf(captured) !== -1) {
            includes.push(entry);
          }
          if (starts.length >= 30 && includes.length >= 30) break;
        }
        var combined = starts.concat(includes).slice(0, 30);
        list.innerHTML = '';
        if (!combined.length) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
        combined.forEach(function (entry) {
          var li = document.createElement('li');
          li.setAttribute('role', 'option');
          li.textContent = entry[0] + ', ' + entry[1];
          li.dataset.lat = entry[2];
          li.dataset.lon = entry[3];
          li.addEventListener('mousedown', function (e) {
            e.preventDefault();
            input.value = entry[0] + ', ' + entry[1];
            input.dataset.lat = entry[2];
            input.dataset.lon = entry[3];
            list.hidden = true;
            input.setAttribute('aria-expanded', 'false');
          });
          list.appendChild(li);
        });
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      });
    });

    input.addEventListener('keydown', function (e) {
      var items = list.querySelectorAll('li');
      if (!items.length) return;
      var active = list.querySelector('.is-active');
      var idx = active ? Array.prototype.indexOf.call(items, active) : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (active) active.classList.remove('is-active');
        idx = (idx + 1) % items.length;
        items[idx].classList.add('is-active');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (active) active.classList.remove('is-active');
        idx = (idx - 1 + items.length) % items.length;
        items[idx].classList.add('is-active');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var target = active || items[0];
        if (target) {
          input.value = target.textContent;
          input.dataset.lat = target.dataset.lat;
          input.dataset.lon = target.dataset.lon;
          list.hidden = true;
          input.setAttribute('aria-expanded', 'false');
        }
      } else if (e.key === 'Escape') {
        list.hidden = true;
        input.setAttribute('aria-expanded', 'false');
      }
    });

    input.addEventListener('blur', function () {
      setTimeout(function () { list.hidden = true; input.setAttribute('aria-expanded', 'false'); }, 120);
    });
  }

  function compatCoords() {
    var el = $('compat-place');
    var lat = parseFloat(el.dataset.lat), lon = parseFloat(el.dataset.lon);
    return (isFinite(lat) && isFinite(lon)) ? { lat: lat, lon: lon } : null;
  }

  var TONE_CLASS = {
    harmonious: 'good', easy: 'good', intense: 'good',
    mild: 'neutral',
    tense: 'hard', awkward: 'hard', polarizing: 'hard'
  };

  function compatAspectChip(item) {
    var toneClass = TONE_CLASS[item.tone] || 'neutral';
    var div = document.createElement('div');
    div.className = 'compat-aspect compat-aspect--' + toneClass;

    var pair = document.createElement('span');
    pair.className = 'compat-aspect__pair';
    pair.textContent = item.pair;

    var row = document.createElement('span');
    row.className = 'compat-aspect__row';

    var sideAgent = document.createElement('span');
    sideAgent.className = 'compat-aspect__side';
    var glAgent = document.createElement('span');
    glAgent.className = 'compat-aspect__glyph compat-aspect__glyph--agent';
    glAgent.textContent = asText(A.glyphs.signGlyph(item.a));
    var whoAgent = document.createElement('span');
    whoAgent.className = 'compat-aspect__who';
    whoAgent.textContent = 'agent';
    sideAgent.appendChild(glAgent);
    sideAgent.appendChild(whoAgent);

    var linkSpan = document.createElement('span');
    linkSpan.className = 'compat-aspect__link';
    var glAsp = document.createElement('span');
    glAsp.className = 'compat-aspect__glyph compat-aspect__glyph--asp';
    glAsp.textContent = asText(A.glyphs.aspectGlyph(item.aspect));
    var whoAsp = document.createElement('span');
    whoAsp.className = 'compat-aspect__who';
    whoAsp.textContent = item.aspect;
    linkSpan.appendChild(glAsp);
    linkSpan.appendChild(whoAsp);

    var sideYou = document.createElement('span');
    sideYou.className = 'compat-aspect__side';
    var glYou = document.createElement('span');
    glYou.className = 'compat-aspect__glyph compat-aspect__glyph--you';
    glYou.textContent = asText(A.glyphs.signGlyph(item.b));
    var whoYou = document.createElement('span');
    whoYou.className = 'compat-aspect__who';
    whoYou.textContent = 'you';
    sideYou.appendChild(glYou);
    sideYou.appendChild(whoYou);

    row.appendChild(sideAgent);
    row.appendChild(linkSpan);
    row.appendChild(sideYou);

    var tone = document.createElement('span');
    tone.className = 'compat-aspect__tone';
    tone.textContent = item.tone;

    div.appendChild(pair);
    div.appendChild(row);
    div.appendChild(tone);
    return div;
  }

  function wireCompatibility() {
    attachTypeahead($('compat-place'), $('compat-place-list'));

    $('compat-go').addEventListener('click', function () {
      var hint = $('compat-hint');
      var dateVal = $('compat-date').value;
      if (!dateVal) {
        hint.textContent = 'Enter your birth date to compare.';
        hint.hidden = false;
        $('compat-date').focus();
        return;
      }
      var coords = compatCoords();
      if (!coords) {
        hint.textContent = 'Pick your birthplace from the list.';
        hint.hidden = false;
        $('compat-place').focus();
        return;
      }
      hint.hidden = true;

      var timeVal = $('compat-time').value;
      var hasTime = !!timeVal;
      var userBirth = {
        datetime: dateVal + 'T' + (timeVal || '12:00') + ':00',
        tzOffsetMinutes: 0,
        lat: coords.lat,
        lon: coords.lon
      };

      var userChart;
      try {
        userChart = A.computeChart(userBirth);
      } catch (err) {
        hint.textContent = 'Could not compute chart — check date and coordinates.';
        hint.hidden = false;
        return;
      }
      if (!hasTime) delete userChart.ascendant;

      var agentChart = A.computeChart(buildBirth());
      var syn = A.synastry(agentChart, userChart);

      /* score + verdict */
      $('compat-score').textContent = syn.score;
      $('compat-verdict').textContent = syn.verdict;

      /* meter */
      var meter = $('compat-meter');
      meter.style.width = syn.score + '%';
      meter.className = 'compat-meter__fill';
      if (syn.score >= 65) meter.classList.add('compat-meter__fill--high');
      else if (syn.score >= 45) meter.classList.add('compat-meter__fill--mid');
      else meter.classList.add('compat-meter__fill--low');

      /* summary */
      $('compat-summary').textContent =
        'Your ' + syn.elements.user + ' and their ' + syn.elements.agent +
        ' are ' + syn.elements.relation + '. ' +
        'Modality: ' + syn.modality.user + ' meets ' + syn.modality.agent +
        ' — ' + syn.modality.relation + '.';

      /* reading */
      $('compat-reading').textContent = syn.reading || '';

      /* aspect chips */
      var aspectsEl = $('compat-aspects');
      aspectsEl.innerHTML = '';
      syn.aspects.forEach(function (item) {
        aspectsEl.appendChild(compatAspectChip(item));
      });

      /* romance axis */
      var romanceEl = $('compat-romance');
      romanceEl.innerHTML = '';
      if (syn.romance && syn.romance.length) {
        var heading = document.createElement('p');
        heading.className = 'compat-romance__label';
        heading.textContent = 'Venus & Mars — the romance axis';
        romanceEl.appendChild(heading);
        syn.romance.forEach(function (item) {
          romanceEl.appendChild(compatAspectChip(item));
        });
        romanceEl.hidden = false;
      } else {
        romanceEl.hidden = true;
      }

      $('compat-result').hidden = false;
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
        var cards = tarotCardsHtml(t);
        return cards ? '<p class="tarot-line">' + cards + '</p>' : '';
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
        (mood.reading ? '<p class="reading-line">' + esc(mood.reading) + '</p>' : '') +
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
    var myoColorName = (A.colorName && A.colorName(colorHex)) || colorHex.toUpperCase();
    $('myo-swatch-name').textContent = myoColorName + '  ' + colorHex.toUpperCase();
    renderLore('myo-lore', colorHex);

    var myoTarot = A.tarotFor && A.tarotFor(chart);
    var myoTarotEl = $('myo-tarot');
    if (myoTarotEl) {
      if (myoTarot && myoTarot.birthCard) {
        myoTarotEl.innerHTML = tarotCardsHtml(myoTarot);
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
  // color.name is always auto-derived from the hex via colorName — any name in the JSON is ignored.
  function myoParseReply(raw, colorHex) {
    var data = JSON.parse(raw);                 // throws on bad JSON
    if (!data || typeof data !== 'object') throw new Error('not an object');

    var persona = typeof data.persona === 'string' ? data.persona.trim() : '';
    if (!persona) throw new Error('no persona');

    var name = (A.colorName && A.colorName(colorHex)) || colorHex.toUpperCase();

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
    var els = layers.map(function (cfg) {
      var el = field.querySelector(cfg[0]);
      if (el) {
        el.style.setProperty('--field-h', FIELD + 'px');
        el.style.setProperty('--star-shadows', buildStarShadows(cfg[1], W, FIELD));
      }
      return el;
    });

    // Subtle scroll-linked parallax ON TOP of the automatic drift. Uses the CSS
    // `translate` property (composed with the drift's `transform`) so it works on
    // iOS/Safari where scroll-timelines don't. Small per-layer factors give depth.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      var factors = [0.015, 0.03, 0.05]; // sm, md, lg — "just a bit"
      var ticking = false;
      var onScroll = function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY || window.pageYOffset || 0;
          els.forEach(function (el, i) {
            if (el) el.style.translate = '0px ' + (y * factors[i]).toFixed(1) + 'px';
          });
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /* ---- Boot ------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', function () {
    initStarfield();
    populateCitySelect('birth-city', 'Reykjavík');
    wireControls();
    updateScrubLabel();
    render();
    wireCompatibility();
    wireMakeYourOwn();
    renderGallery();
  });
})();
