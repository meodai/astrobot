# astrobot

Give each Claude model a small, permanent astrological identity — a self-invented birth
chart and a favorite color it picks for itself — then let the current sky *subtly* tint
its tone each day. Personality, not behavior: it never changes accuracy, effort, or
output format.

## Install

```
/plugin marketplace add meodai/astrobot
/plugin install astrobot@astrobot
```

Then, once per model, run `/astrobot` to be "born." After that, a SessionStart hook
applies your identity + today's mood automatically at the start of every session.

## How it works

- `/astrobot` (first run for a model): the model invents a birth moment + place and a
  favorite color; the full natal chart (Sun, Moon + phase, Mercury–Saturn, decan, rising
  sign) is computed and stored in `~/.claude/astrobot/profiles.json`, keyed by model id.
- SessionStart hook (every session): loads the chart, computes today's mood from the
  transiting Sun and Moon, and injects a short persona + mood note.

Astronomy by the vendored [Astronomy Engine](https://github.com/cosinekitty/astronomy)
(MIT). Flavor grounded in Boll & Bezold, *Sternglaube und Sterndeutung* (1926) — see
[`docs/DESIGN.md`](docs/DESIGN.md).

## Development

```
npm install      # dev only (astronomy-engine for re-vendoring)
npm run vendor   # refresh vendor/astronomy.js from node_modules
npm test         # node --test
```
