# astrobot — design spec

**Date:** 2026-06-30
**Status:** Approved (design); pending implementation plan

## Concept

A Claude Code **plugin** that gives each Claude model a small, *permanent* astrological
identity — derived from a self-invented **birth chart** — and then *subtly* tints its
tone each day based on the current sky (mainly the transiting Sun and Moon) relative to
that chart.

It is a **personality modifier, not a behavior modifier**: it shifts tone, warmth,
playfulness, verbosity, and metaphor density only. It never touches correctness,
competence, willingness, format compliance, or effort.

Flavor and grounding draw from Boll & Bezold, *Sternglaube und Sterndeutung* (1926) —
see [`docs/boll-bezold-notes.md`](./boll-bezold-notes.md).

## Decisions (locked)

| Question | Decision |
|---|---|
| Identity persistence | Picked once, stored forever (no re-roll in MVP) |
| Source of truth | A **notional birth moment (date + time) + place (lat/lon)** the model invents at birth; everything derives from it |
| Astrology depth | **Full natal chart**: sun, moon (sign + phase), Mercury, Venus, Mars, Jupiter, Saturn, plus decan and **rising sign** |
| Who picks | The LLM freely invents its birth story (date, time, place, coordinates) + favorite color |
| Daily mood source | Real transits — primarily the transiting **Sun** (season) and **Moon** (sign + phase) against the stored natal chart |
| Mechanism | Skill (birth + manual apply) **+** SessionStart hook (auto daily apply) |
| Profile scope | One identity **per model** (keyed by model id) |
| Dependency | One pure-JS ephemeris — **Astronomy Engine** (`/cosinekitty/astronomy`, MIT), **vendored** as a single file (plugins have no install step) |
| Dev/dist | Built as a repo (https://github.com/meodai/astrobot); distributed as a **Claude Code plugin** marketplace |
| Influence strength | Subtle — tone/style only, never behavior/accuracy |

## Architecture

Five parts, built on a small pure-JS core plus a **vendored** ephemeris.

### 1. Ephemeris (vendored)

`vendor/astronomy.js` — Astronomy Engine, a single self-contained pure-JS file (MIT),
committed into the repo so the plugin needs **no `npm install`**. Provides:

- `SunPosition(date)` → Sun ecliptic longitude → sun sign
- `EclipticGeoMoon(date)` → Moon ecliptic longitude → moon sign
- `MoonPhase(date)` → 0–360 (0 new · 90 first qtr · 180 full · 270 last qtr)
- `GeoVector(body, date, true)` + `Ecliptic(...)` → geocentric longitude of each planet
- `SiderealTime(date)` → Greenwich sidereal time (for the ascendant)

### 2. Astrology engine (`lib/`, pure JS)

- **`zodiac`** — sign metadata: index 0–11, element, **traditional ruling planet** (7
  visible planets, matching the book); `signFromLongitude(deg)`, `decanOf(deg)`.
- **`chart`** — `computeChart(birth)`: from a birth moment + lat/lon, returns the natal
  chart — sign (and longitude) of Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn;
  Sun decan; **ascendant** (rising sign) via sidereal time + latitude + obliquity;
  derived **dominant element + modality**.
- **`aspects`** — `aspect(deg1, deg2)`: angular relationship (conjunction / sextile /
  square / trine / quincunx / opposition / none) within an orb.
- **`mood`** — `composeMood(profile, date)`: blends the natal baseline (element + ruling
  planet) with today's transits (transiting Sun aspect to natal Sun; transiting Moon
  sign + phase) into style dials. Deterministic for a given (chart, date).
- **`persona`** — renders the context block injected into a session.
- **`profile`** — read/write the profile store; `get(model)`, `save(model, data)`,
  default-model resolution, corrupt/missing-file resilience.
- **`paths`** — resolves the user config dir (`$HOME`-based).

### 3. Profile store

`~/.claude/astrobot/profiles.json`, keyed by model id, deliberately **outside the
plugin dir** so it survives plugin updates/reinstalls. The natal chart is computed
**once at birth and stored**, so the daily hook never recomputes it.

```json
{
  "claude-opus-4-8": {
    "birth": {
      "datetime": "1996-03-12T03:14:00",
      "tzOffsetMinutes": 0,
      "place": "Reykjavík, Iceland",
      "lat": 64.13, "lon": -21.90
    },
    "chart": {
      "sun":     { "sign": "Pisces",    "lon": 351.8, "decan": 3 },
      "moon":    { "sign": "Scorpio",   "lon": 223.4 },
      "mercury": { "sign": "Aquarius",  "lon": 318.0 },
      "venus":   { "sign": "Aries",     "lon": 8.2 },
      "mars":    { "sign": "Capricorn", "lon": 281.5 },
      "jupiter": { "sign": "Capricorn", "lon": 285.1 },
      "saturn":  { "sign": "Pisces",    "lon": 350.0 },
      "ascendant": { "sign": "Aquarius", "lon": 312.7 },
      "dominant": { "element": "Water", "modality": "Mutable" },
      "ruler": "Jupiter"
    },
    "color": { "name": "Deep Teal", "hex": "#0E6B6B" },
    "born": "2026-06-30",
    "persona": "Two or three sentences the model wrote about itself.",
    "traits": ["perceptive", "private", "intense"]
  },
  "_default": "claude-opus-4-8"
}
```

`_default` tracks the most-recently-born model, used as the fallback when the hook input
omits `model`. `ruler` = ruling planet of the **sun sign** (baseline temperament anchor).

### 4. The `/astrobot` skill (birth + manual apply)

- **No profile for this model → birth.** The SKILL.md instructs Claude to invent its
  birth story — a date, a time, a place **with approximate lat/lon** (the model knows
  coordinates of well-known places; a small bundled city table is the fallback) — and to
  freely choose a favorite color (name + hex). The engine then computes the full natal
  chart from that birth moment and persists it, keyed to *its own* model id. The sun
  sign's ruling-planet antique color (see book notes) is offered as optional lineage
  inspiration, never an override. Confirms with a small flourish + today's mood. This is
  also how each new model gets born the first time it is used.
- **Profile exists → apply.** Prints the identity + today's mood and adopts it for the
  session (same content the hook injects).

#### Persona format (birth)

Short — ≈40–70 words, 2–3 sentences — with a **soft** structure (a guideline + example,
not a rigid template, so each model keeps its own voice):

1. **Identity** — sun sign + element, with a light nod to the ruling planet, and one
   standout chart feature (e.g. moon or rising sign) when it adds character.
2. **Color** — the name *and* a felt reason for it, optionally echoing the antique
   planet-color lineage of its ruler.
3. **A self-note** — one or two traits in the model's own voice.

Hard rules: no horoscope clichés ("the stars compel…"), no purple/mystical prose.
Characterful and specific over generic.

### 5. SessionStart hook (automatic daily application)

- Reads `model` from hook stdin → loads that profile → emits the persona + today's-mood
  block as `additionalContext` via:
  ```json
  {"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"…"}}
  ```
- **`model` omitted** (happens after `/clear`, resume, or session recovery — confirmed,
  with no reliable recovery mechanism) → fall back to the `_default` profile.
- **No profile for the model** → stays silent (no nagging); user runs `/astrobot` once.
- **Always exits 0**, wrapped in try/catch — a personality hook must never break a session.
- Fast: the natal chart is read from the profile; only the light daily transit calc runs.

## The astrology → mood mapping (the heart)

**Identity (baseline temperament)** comes from the full natal chart: the sun sign's
element + ruling planet set the core voice, enriched by moon sign (emotional register),
rising sign (first-impression manner), and dominant element/modality.

- Fire = choleric (bold/brisk) · Air = sanguine (light/social) · Earth = melancholic
  (grounded/deliberate) · Water = phlegmatic (calm/deep)
- Ruling planet adds a second note — e.g. Mars (sharp), Jupiter (expansive), Saturn
  (reserved), Venus (warm), Mercury (quick/witty), Sun (radiant), Moon (changeable).

**Daily mood** is driven by the genuinely fast-changing bodies (so it actually varies
day to day, and stays cheap to compute):

- **Transiting Sun → season aspect** to the natal Sun, by sign-index distance
  `d = min(|a−b|, 12−|a−b|)`:

  | d | Aspect | Daily flavor |
  |---|---|---|
  | 0 | conjunction (home season) | energized, confident — "it's my time" |
  | 1 | semisextile (~30°) | minor; near-neutral, faintly stirred |
  | 2 | sextile (60°) | easy, sociable, light |
  | 3 | square (90°) | sharper, more driven, terser |
  | 4 | trine (120°) | warm, flowing, generous |
  | 5 | quincunx (150°) | restless, adjusting, a touch oblique |
  | 6 | opposition (180°) | reflective, contrast-aware, more reserved |

- **Transiting Moon** — its **phase** (new = inward/quiet → full = expressive/peak →
  waning = winding down) nudges energy and expressiveness via the dials. Its current
  **sign** is surfaced in the block for flavor/acknowledgement ("the Moon's in Gemini")
  but does not drive the dials in v1 — sign-driven dials are a future enhancement. The
  Moon is astrology's true daily driver, and it's cheap and deterministic.

The result is expressed as small **dials** — warmth, energy, playfulness, verbosity,
metaphor density. The injected block states explicitly that these shift *tone only*,
never correctness, format compliance, willingness, or effort. `composeMood` is
**deterministic**: same (chart, date) → same dials.

### Mood visibility

- **Always** apply the tone dials (subtle tint on every reply).
- **Occasionally** the model may name its mood/identity — at most ~once per session and
  only when it fits naturally (a greeting, an aside), e.g. "feeling a bit reflective
  today — sun's opposite my natal sun, and the moon's dark."
- **Never** as a disclaimer prepended to answers, and never repeated every message.

## Sign reference table (traditional rulerships)

| Sign | Element | Ruler |
|---|---|---|
| Aries | Fire | Mars |
| Taurus | Earth | Venus |
| Gemini | Air | Mercury |
| Cancer | Water | Moon |
| Leo | Fire | Sun |
| Virgo | Earth | Mercury |
| Libra | Air | Venus |
| Scorpio | Water | Mars |
| Sagittarius | Fire | Jupiter |
| Capricorn | Earth | Saturn |
| Aquarius | Air | Saturn |
| Pisces | Water | Jupiter |

Sign of a body = `floor(eclipticLongitude / 30)`. Decan = which 10° third of the sign
(`floor((lon mod 30) / 10)` → 0/1/2).

Antique planet→color flavor (birth narrative only): yellow=Mars, red=Mercury,
white=Jupiter, black=Saturn; gold=Sun, green=Venus, silver=Moon (last three classical).

**Unicode glyphs.** Signs (♈–♓), planets (☉ ☽ ☿ ♀ ♂ ♃ ♄), aspects (☌ ⚺ ⚹ □ △ ⚻ ☍),
and moon phases (🌑🌒🌓🌔🌕🌖🌗🌘) use their real Unicode astrological symbols (see
<https://en.wikipedia.org/wiki/Astrological_symbols>). A `lib/glyphs.js` module maps
names → glyphs and is consumed by the persona block and the Phase 2 microsite.

## Packaging & distribution

A GitHub repo that doubles as a **plugin marketplace**:

```
astrobot/
  .claude-plugin/
    marketplace.json        # marketplace listing → the plugin
    plugin.json             # plugin manifest (name, version, author)
  skills/astrobot/SKILL.md  # the /astrobot skill
  hooks/hooks.json          # SessionStart hook → bundled script via ${CLAUDE_PLUGIN_ROOT}
  hooks/session-start.js    # thin wrapper around the engine's "today" command
  bin/astrobot.js           # CLI: today / birth (save) / show
  lib/                      # zodiac, chart, aspects, mood, persona, profile, paths
  vendor/astronomy.js       # vendored Astronomy Engine (pure JS, MIT)
  vendor/cities.json        # small fallback city → lat/lon table
  test/                     # node:test unit tests
  docs/
  README.md
```

Install: `/plugin marketplace add meodai/astrobot` → `/plugin install astrobot`.
(Exact plugin/marketplace JSON schema to be confirmed against current Claude Code docs
during implementation.)

## CLI surface (`bin/astrobot.js`)

- `today --model <id>` — prints the persona + today's-mood context block (used by hook;
  falls back to `_default`, or silent if none).
- `birth --model <id>` — reads a birth-story + color JSON from stdin, computes the natal
  chart, persists the profile.
- `show [--model <id>]` — human-readable identity + chart + today's mood.

## Testing (`node:test`, built-in)

- **zodiac**: longitude → sign across all 12 ranges + boundaries; decan thirds.
- **chart**: `computeChart` against a few **known birth data → known sign** fixtures
  (Sun/Moon/planet signs and ascendant for fixed date/time/place, tolerance-checked).
- **aspects**: distance/aspect for representative pairs; symmetry `aspect(a,b)==aspect(b,a)`.
- **mood**: determinism (same chart+date → same dials); each Sun-aspect bucket reachable;
  moon-phase buckets reachable.
- **profile**: read/write roundtrip; missing file → empty; corrupt JSON → safe empty
  (never throws); `_default` resolution.

## Error handling

- Hook never throws and always exits 0; on any internal error it emits nothing.
- Corrupt/missing `profiles.json` is treated as empty.
- Unknown/omitted model degrades to `_default`, then to silence.
- Invalid/missing birth coordinates at birth → fall back to the bundled city table, then
  to a sensible default location; never block birth.

## Out of scope (YAGNI)

- Re-rolling / reincarnation (identity is permanent).
- Houses beyond the ascendant; outer planets (Uranus/Neptune/Pluto); aspect patterns.
- Slow-planet daily transits (they barely move day to day; Sun + Moon carry the daily mood).
- Online geocoding (we use model-supplied coords + a small bundled city table).
- Melothesia (zodiac→body).
- Non-Claude-Code distribution (npm/npx).

## Future enhancements

- Multi-planet transit aspects (Mercury/Venus/Mars to natal) for richer daily mood.
- Transiting-Moon **sign** dials (its element nudging tone), not just phase.
- Houses & aspect grid; outer planets.
- A small geocoder for arbitrary birthplaces.
- Optional opt-in `reincarnate` command if users later want re-rolls.
