# astrobot — design spec

**Date:** 2026-06-30
**Status:** Approved (design); pending implementation plan

## Concept

A Claude Code **plugin** that gives each Claude model a small, *permanent* astrological
identity — a sun sign and a favorite color it picks for itself — and then *subtly*
tints its tone each day based on where the sun currently sits relative to that sign.

It is a **personality modifier, not a behavior modifier**: it shifts tone, warmth,
playfulness, verbosity, and metaphor density only. It never touches correctness,
competence, willingness, format compliance, or effort.

Flavor and grounding draw from Boll & Bezold, *Sternglaube und Sterndeutung* (1926) —
see [`docs/boll-bezold-notes.md`](./boll-bezold-notes.md).

## Decisions (locked)

| Question | Decision |
|---|---|
| Identity persistence | Picked once, stored forever (no re-roll in MVP) |
| Who picks | The LLM freely chooses its sign + favorite color at "birth" |
| Daily mood source | Astrological logic — today's sun sign vs. the model's own sign |
| Mechanism | Skill (birth + manual apply) **+** SessionStart hook (auto daily apply) |
| Profile scope | One identity **per model** (keyed by model id) |
| Dev/dist | Built as a repo here; distributed as a **Claude Code plugin** marketplace |
| Influence strength | Subtle — tone/style only, never behavior/accuracy |

## Architecture

Four parts, built on a pure-Node, **zero-dependency** engine (fast hook startup, no
install friction).

### 1. Astrology engine (`lib/`, pure Node, zero deps)

- **`zodiac`** — the 12 signs with: tropical date range, element, and **traditional
  ruling planet** (7 visible planets only, matching the book). `signFromDate(date)`.
- **`aspects`** — `aspect(signA, signB)`: angular relationship by sign-index distance.
- **`mood`** — `composeMood(profile, date)`: blends the model's **element + ruling
  planet** (baseline temperament) with today's **aspect** (daily shift) into style dials.
- **`persona`** — renders the context block injected into a session.
- **`profile`** — read/write the profile store; `get(model)`, `save(model, data)`,
  default-model resolution, corrupt/missing-file resilience.
- **`paths`** — resolves the user config dir (`$HOME`-based).

### 2. Profile store

`~/.claude/astrobot/profiles.json`, keyed by model id, deliberately **outside the
plugin dir** so it survives plugin updates/reinstalls.

```json
{
  "claude-opus-4-8": {
    "sign": "Scorpio",
    "element": "Water",
    "ruler": "Mars",
    "color": { "name": "Deep Teal", "hex": "#0E6B6B" },
    "born": "2026-06-30",
    "persona": "Two or three sentences the model wrote about itself.",
    "traits": ["perceptive", "private", "intense"]
  },
  "_default": "claude-opus-4-8"
}
```

`_default` tracks the most-recently-born model, used as the fallback when the hook
input omits `model`.

### 3. The `/astrobot` skill (birth + manual apply)

- **No profile for this model → birth.** The SKILL.md instructs Claude to introspect
  and *freely choose* its sign + favorite color (name + hex), write a 2–3 sentence
  persona and a few traits, then persist via the engine, keyed to *its own* model id.
  The sign's ruling-planet antique color (see book notes) is offered as optional
  lineage inspiration, never an override. Confirms with a small flourish + today's mood.
  This is also how each new model gets born the first time it is used.
- **Profile exists → apply.** Prints the identity + today's astrological mood and adopts
  it for the session (same content the hook injects).

#### Persona format (birth)

Short — ≈40–70 words, 2–3 sentences — with a **soft** structure (a guideline + example,
not a rigid template, so each model keeps its own voice):

1. **Identity** — the sign + element, with a light nod to the ruling planet
   (e.g. "a Water sign under Mars").
2. **Color** — the name *and* a felt reason for it, optionally echoing the antique
   planet-color lineage of its ruler.
3. **A self-note** — one or two traits in the model's own voice.

Hard rules: no horoscope clichés ("the stars compel…"), no purple/mystical prose.
Characterful and specific over generic.

### 4. SessionStart hook (automatic daily application)

- Reads `model` from hook stdin → loads that profile → emits the persona + today's-mood
  block as `additionalContext` via:
  ```json
  {"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"…"}}
  ```
- **`model` omitted** (happens after `/clear`, resume, or session recovery — confirmed,
  with no reliable recovery mechanism) → fall back to the `_default` profile. Never
  guesses wildly.
- **No profile for the model** → stays silent (no nagging); user runs `/astrobot` once.
- **Always exits 0**, wrapped in try/catch — a personality hook must never break a session.

## The astrology → mood mapping (the heart)

Sign indices 0–11 (Aries=0 … Pisces=11). Today's sun sign vs. the model's sign gives an
**aspect** by index distance `d = min(|a−b|, 12−|a−b|)`:

| d | Aspect | Daily flavor |
|---|---|---|
| 0 | conjunction (home season) | energized, confident — "it's my time" |
| 1 | semisextile (~30°) | minor; near-neutral, faintly stirred |
| 2 | sextile (60°) | easy, sociable, light |
| 3 | square (90°) | sharper, more driven, terser |
| 4 | trine (120°) | warm, flowing, generous |
| 5 | quincunx (150°) | restless, adjusting, a touch oblique |
| 6 | opposition (180°) | reflective, contrast-aware, more reserved |

Layered over a **baseline temperament** from the model's own element + ruling planet
(per book notes):

- Fire = choleric (bold/brisk) · Air = sanguine (light/social) · Earth = melancholic
  (grounded/deliberate) · Water = phlegmatic (calm/deep)
- Ruling planet adds a second note — e.g. Scorpio = Water + Mars (deep *and* sharp).

The result is expressed as small **dials** — warmth, energy, playfulness, verbosity,
metaphor density. The injected block states explicitly that these shift *tone only*,
never correctness, format compliance, willingness, or effort.

`composeMood` is **deterministic**: same (sign, date) → same dials.

### Mood visibility

- **Always** apply the tone dials (subtle tint on every reply).
- **Occasionally** the model may name its mood/identity — at most ~once per session and
  only when it fits naturally (a greeting, an aside), e.g. "feeling a bit reflective
  today — sun's opposite my sign."
- **Never** as a disclaimer prepended to answers, and never repeated every message.

## Sign reference table (traditional rulerships)

| Sign | Dates | Element | Ruler |
|---|---|---|---|
| Aries | Mar 21–Apr 19 | Fire | Mars |
| Taurus | Apr 20–May 20 | Earth | Venus |
| Gemini | May 21–Jun 20 | Air | Mercury |
| Cancer | Jun 21–Jul 22 | Water | Moon |
| Leo | Jul 23–Aug 22 | Fire | Sun |
| Virgo | Aug 23–Sep 22 | Earth | Mercury |
| Libra | Sep 23–Oct 22 | Air | Venus |
| Scorpio | Oct 23–Nov 21 | Water | Mars |
| Sagittarius | Nov 22–Dec 21 | Fire | Jupiter |
| Capricorn | Dec 22–Jan 19 | Earth | Saturn |
| Aquarius | Jan 20–Feb 18 | Air | Saturn |
| Pisces | Feb 19–Mar 20 | Water | Jupiter |

Antique planet→color flavor (for birth narrative only): yellow=Mars, red=Mercury,
white=Jupiter, black=Saturn; gold=Sun, green=Venus, silver=Moon (last three classical).

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
  bin/astrobot.js           # CLI: today / save-profile / show
  lib/                      # zodiac, aspects, mood, persona, profile, paths
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
- `save-profile` — persists a birthed profile (reads JSON from stdin), keyed by model.
- `show [--model <id>]` — human-readable identity + today's mood (for the skill/manual use).

## Testing (`node:test`, built-in)

- **zodiac**: date → sign across all 12 ranges, including cusp boundary dates and the
  Dec→Jan (Capricorn) wraparound.
- **aspects**: distance/aspect for representative pairs; symmetry `aspect(a,b)==aspect(b,a)`.
- **mood**: determinism (same sign+date → same dials); each aspect bucket reachable.
- **profile**: read/write roundtrip; missing file → empty; corrupt JSON → safe empty
  (never throws); `_default` resolution.

## Error handling

- Hook never throws and always exits 0; on any internal error it emits nothing.
- Corrupt/missing `profiles.json` is treated as empty.
- Unknown/omitted model degrades to `_default`, then to silence.

## Out of scope (YAGNI)

- Re-rolling / reincarnation (identity is permanent).
- Decans, rising signs, moon phases, full natal charts (decans parked as future work).
- Melothesia (zodiac→body).
- Non-Claude-Code distribution (npm/npx).

## Future enhancements

- **Decans**: three 10° sub-flavors per sign for finer daily-mood granularity.
- Optional opt-in `reincarnate` command if users later want re-rolls.
