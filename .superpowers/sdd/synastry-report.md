# Synastry Engine — Implementation Report

## Status
Complete. All 204 tests passing (183 pre-existing + 21 new).

## Files changed
- `lib/synastry.js` — new; the compatibility engine
- `test/synastry.test.js` — new; 21 CJS tests
- `site/src/engine.js` — added `synastry` import + export
- `site/astrobot.bundle.js` — rebuilt (synastry appears 7 times in bundle)

## Score calibration (K = 1.5)

| Pair | Score | Verdict |
|------|-------|---------|
| Same chart vs itself (J2000 London fixture) | **80** | a rare, easy match |
| roll(42) vs roll(1337) — Fire/Earth, tense elements | **43** | a spark with friction |

### Why 80 (not higher) for self-vs-self

The fixture chart (Sun Capricorn, Moon Scorpio, Asc Aries) means:
- `Sun–Moon` / `Moon–Sun` cross-pairs are *sextile* (polarity +1), not conjunction — sun and moon are in different signs
- Both `Sun–Ascendant` pairs (Capricorn index 9 vs Aries index 0) are *square* (distance 3, polarity −1), each subtracting 1.5 from the raw score
- Dominant modality is Cardinal for both → reinforcing, delta = 0 (no bonus)

Net: 50 + 24 (aspect sum) + 6 (kindred element bonus) = **80** — exactly meeting ≥ 80.

## Score formula recap

```
raw = 50
      + Σ (polarity × weight × 1.5)  ← across all aspect + romance pairs
      + elements.delta × 3            ← kindred/harmonious=+2, tense=−1
      + modality.delta × 2            ← same=0, different=+1
score = clamp(round(raw), 0, 100)
```

Worst-case all-opposition chart (with asc, tense elements, same modality):
`50 − 20×1.5 − 3 + 0 = 17` → ≤ 45 ✓

## Pair coverage

Without ascendant (8 aspect + 2 romance = 10 pairs):
`Sun–Sun`, `Moon–Moon`, `Sun–Moon`, `Moon–Sun`, `Venus–Venus`, `Mars–Mars`, `Venus–Mars`, `Mars–Venus`

With ascendant (+3 pairs = 13 total):
`Ascendant–Ascendant`, `Sun–Ascendant` (×2, distinguished by `a`/`b` sign values)

## Test coverage (21 tests)
- Same-chart score ≥ 80, kindred elements, all required keys, aspect array shape, pair object shape, verdict band, hasAscendant=true, reading is string
- Determinism: two calls deepEqual, cross-seed charts deepEqual
- Score bounds: 7 rolled pairs all stay in 0..100
- Element relation: Fire/Air → harmonious, Air/Fire → harmonious (symmetric), Fire/Water → tense, same → kindred
- No-ascendant: hasAscendant=false, no 'Ascendant' in pair labels, valid score, self-no-asc ≥ 80
- Verdict band: top band verified; tense fixture falls within valid five-verdict set

## Concerns / notes
- Self-vs-self score is exactly 80 (boundary). If a future fixture with a conjunction Sun–Asc were used, the score would be higher. The boundary value is a consequence of the J2000 fixture's Capricorn Sun squaring Aries Asc.
- The two `Sun–Ascendant` pairs in `aspects` share the same `pair` label; they are distinguished only by their `a`/`b` sign fields. A future consumer wanting to display them uniquely may want to relabel them (e.g., `'Sun–Ascendant (A→U)'`).
- Prose article ("a" vs "an") is now handled correctly via regex on the tone's first character.
