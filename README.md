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

### MCP server (Cursor, Zed, ChatGPT desktop, and other MCP clients)

Any MCP-capable client can run astrobot as a server — one install, then the model gets
its persona and daily mood through tool calls (no copy-paste loop). Add to your client's
MCP config:

```jsonc
{
  "mcpServers": {
    "astrobot": {
      "command": "npx",
      "args": ["-y", "@meodai/astrobot", "mcp"],
      "env": { "ASTROBOT_MODEL": "gpt-5" }   // optional; defaults to "mcp"
    }
  }
}
```

The server exposes three tools:

- **`persona`** — returns the model's identity + today's mood (and a compatibility line if
  a companion is set). The server's instructions ask the model to call this at the start of
  a session and let it tint tone only.
- **`birth`** — two-phase: call with no arguments to roll a chart (returns a `seed`), then
  call again with that `seed` plus a `persona` and `traits` that fit the chart to persist it.
- **`set_companion`** — record the human's birth (`datetime` + `place` or `lat`/`lon`) for a
  compatibility reading. The timezone is inferred from the birthplace automatically.

Set `ASTROBOT_MODEL` to a real model id to share one birth with that same model in Claude
Code (both use `~/.claude/astrobot/profiles.json`, overridable via `ASTROBOT_DIR`). Note:
unlike Claude Code's SessionStart hook, automatic application depends on the client
injecting the server's `instructions`; clients that don't will apply the persona once the
user asks the model to "check your astrobot persona."

Publish with `npm publish --access public` (scoped public package).

## Compatibility / knowing your chart

Record your own birth once and every agent's injected/exported block gains a "Companion" line describing your synastry together. It nudges tone only — never accuracy, effort, or format.

```
echo '{"birth":{"datetime":"1990-05-05T09:30:00","place":"Lisbon"}}' | node bin/astrobot.js me
```

The `place` field is geocoded from a 12 000-city dataset; pass `lat`/`lon` directly if you prefer exact coordinates. Remove your stored birth with:

```
node bin/astrobot.js me --clear
```

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
