# astrobot

Give each Claude model a small, permanent astrological identity — a randomly-rolled birth
chart (sun, moon, rising, the seven classical planets, and whole-sign houses) and a color
it is given to name — then let the current sky *subtly* tint its tone each day.
Personality, not behavior: it never changes accuracy, effort, or output format.

## Install

```
/plugin marketplace add meodai/astrobot
/plugin install astrobot@astrobot
```

Then, once per model, run `/astrobot` to be "born." After that, a SessionStart hook
applies your identity + today's mood automatically at the start of every session.

## Updating

When a new version is published, refresh the marketplace and reload:

```
/plugin marketplace update astrobot
/reload-plugins
```

Or manage everything from the interactive `/plugin` menu (Installed / Marketplaces tabs).
With a pinned `version` in the manifest you only get updates when it's bumped; per-marketplace
auto-update can be toggled in `/plugin` → Marketplaces. Uninstall with
`/plugin uninstall astrobot@astrobot`.

## How it works

- `/astrobot` (first run for a model): **rolls** a random birth moment + place and a color,
  computes the full natal chart (Sun, Moon + phase, Mercury–Saturn, decan, rising sign,
  whole-sign houses), and the model then writes itself *into* that chart. Stored once in
  `~/.claude/astrobot/profiles.json`, keyed by model id. (Rolling — rather than letting the
  model "choose" — is deliberate: asked to pick, models converge on the same sign and color.)
- SessionStart hook (every session): loads the chart, computes today's mood from the
  transiting Sun and Moon, and injects a short persona + mood note.

Astronomy by the vendored [Astronomy Engine](https://github.com/cosinekitty/astronomy)
(MIT). Flavor grounded in Boll & Bezold, *Sternglaube und Sterndeutung* (1926) — see
[`docs/DESIGN.md`](docs/DESIGN.md).

## Use with other LLMs

astrobot's identity is portable. After a model is born, print a paste-able persona block:

```
node bin/astrobot.js export --model <id>
```

Paste the output into any assistant's system prompt (ChatGPT, Gemini, local models, etc.).
The block is self-contained — sign, color, chart, today's mood, and the tone-only guardrail —
so the other model adopts the persona without astrobot installed. Re-run `export` on any day
to refresh that day's mood, then update the pasted block. (Automatic per-session application
is Claude Code-only, via the plugin's hook.)

## Development

```
npm install      # dev only (astronomy-engine for re-vendoring)
npm run vendor   # refresh vendor/astronomy.js from node_modules
npm test         # node --test
```
