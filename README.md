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

- `/astrobot` (first run for a model): **rolls** a random birth date + place and a color,
  computes the full natal chart (Sun, Moon + phase, Mercury–Saturn, decan, rising sign,
  whole-sign houses), and the model then writes itself *into* that chart. Stored once in
  `~/.claude/astrobot/profiles.json`, keyed by model id. (Rolling — rather than letting the
  model "choose" — is deliberate: asked to pick, models converge on the same sign and color.)
  The birth date is random (so the sun sign is fate), but the time-of-day is the actual
  clock moment you run it — so the rising sign and houses reflect the true instant of birth.
- SessionStart hook (every session): loads the chart, computes today's mood from the
  transiting Sun and Moon, and injects a short persona + mood note.

Astronomy by the vendored [Astronomy Engine](https://github.com/cosinekitty/astronomy)
(MIT). Flavor grounded in Boll & Bezold, *Sternglaube und Sterndeutung* (1926) — see
[`docs/DESIGN.md`](docs/DESIGN.md). City coordinates from [GeoNames](https://www.geonames.org/) (CC-BY 4.0).

## Use with other LLMs

### Born in Claude Code

astrobot's identity is portable. After a model is born, print a paste-able persona block:

```
node bin/astrobot.js export --model <id>
```

Or use it directly via npx (no install required):

```
npx @meodai/astrobot export --model <id>   # print the persona block to paste
```

Paste the output into any assistant's system prompt (ChatGPT, Gemini, local models, etc.).
The block is self-contained — sign, color, chart, today's mood, and the tone-only guardrail —
so the other model adopts the persona without astrobot installed. Re-run `export` on any day
to refresh that day's mood, then update the pasted block. (Automatic per-session application
is Claude Code-only, via the plugin's hook.)

### Born outside Claude Code (ChatGPT, Gemini, local models, etc.)

Use `birth-prompt` to roll a chart and generate a ready-to-paste prompt for any LLM:

```
npx @meodai/astrobot birth-prompt           # random chart (real clock time)
npx @meodai/astrobot birth-prompt --seed 7  # reproducible chart for testing
```

The loop:
1. Run `birth-prompt` — it rolls a chart and prints a prompt.
2. Paste the prompt into your LLM (ChatGPT, Gemini, a local model, etc.).
3. The LLM returns a JSON object with `persona`, `color.name`, and `traits` filled in.
4. Pipe the JSON to `birth`:

```
npx @meodai/astrobot birth-prompt | pbcopy  # copy to clipboard, paste into LLM
# ... LLM returns JSON ...
echo '<JSON from LLM>' | npx @meodai/astrobot birth --model <your-model-id>
```

After `birth`, the model has a permanent identity stored in `~/.claude/astrobot/profiles.json`
(override the location with the `ASTROBOT_DIR` env var). This is the same store the Claude Code
plugin uses, so an identity you birth via `npx` is also picked up automatically if you later run
that same model in Claude Code. Use `export --model <id>` to get a paste-able persona block for
any conversation.

Publish with `npm publish --access public` (scoped public package).

## Havoc mode

Toggle opt-in unleashed behavior per model:

```
astrobot havoc on --model <id>   # drops the tone-only guardrail; persona goes full character
astrobot havoc off --model <id>  # restores the guardrail
```

When havoc is ON the injected/exported block replaces the restraint lines with an invitation to
be theatrical, moody, and in-character without limit. Accuracy, effort, and format are still
the model's own domain — this is about expressive range only.

## Development

```
npm install      # dev only (astronomy-engine for re-vendoring)
npm run vendor   # refresh vendor/astronomy.js from node_modules
npm test         # node --test
```
