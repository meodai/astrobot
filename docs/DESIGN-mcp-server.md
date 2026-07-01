# astrobot MCP server — design

**Date:** 2026-07-01
**Status:** Approved (design)
**Branch:** `feat/mcp-server`

## Goal

Let non-Claude MCP clients (Cursor, Zed, ChatGPT desktop, and other MCP-capable
assistants) install astrobot once and get an astrological identity plus daily mood,
approximating the Claude Code SessionStart-hook experience — without the manual
`birth-prompt → paste → birth → export` copy-paste loop that the `npx` path requires today.

## Non-goals

- A true silent per-session hook. MCP has no SessionStart equivalent; the closest is the
  server's `instructions` string, which many (not all) clients inject into context.
- New astrology features. The server is a thin wrapper over the existing `lib/` engine.
- `roll` / `havoc` / `clear` tools. Out of scope for a "tiny" surface (revisit later).

## Decisions (locked)

1. **Foundation:** official `@modelcontextprotocol/sdk` (not a hand-rolled JSON-RPC layer).
   This adds the project's first runtime dependencies: `@modelcontextprotocol/sdk` and
   `zod` (for tool input schemas). The SDK is ESM; the existing `lib/` is CommonJS.
2. **Tools:** three — `birth`, `persona`, `set_companion` (the core lifecycle).
3. **Identity key:** one identity per install. The model key resolves from
   `process.env.ASTROBOT_MODEL`, defaulting to `"mcp"` when unset. Tools take no `model`
   argument. Setting `ASTROBOT_MODEL` to a real model id shares the birth with that same
   model in Claude Code (same on-disk store).
4. **Birth flow:** two-phase, seed round-tripped through the model (3 tools preserved).

## Invocation

Launched as an `mcp` subcommand of the existing CLI so the client config is one line:

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

The store location still honors `ASTROBOT_DIR` (existing behavior), so identities persist
across restarts and are shared with the Claude Code plugin.

## Server instructions string

Advertised via the SDK server `instructions` field (the honest substitute for the hook):

> You have a small, permanent astrological persona from astrobot. At the start of a
> session, call the `persona` tool and let the returned block gently tint your tone —
> tone only, never your accuracy, effort, or output format. If `persona` reports no
> identity yet, run the birth ritual: call `birth` with no arguments to roll a chart,
> then call `birth` again with the returned `seed` plus a short `persona` and `traits`
> that fit that chart. The human may call `set_companion` to record their own birth for a
> compatibility reading.

Clients that do not inject `instructions` still work — the user asks the model once to
"check your astrobot persona," which triggers the same tool call.

## Tools

### `persona`
- **Input:** none.
- **Behavior:** resolves the env-keyed identity. Computes today's mood
  (`composeMood(chart, new Date(), colorHex)`) and, if a companion is stored,
  `synastry(agentChart, userChart)`. Returns `renderPortableBlock(profile, mood, syn)`.
- **No identity yet:** returns guidance text telling the model to run the birth ritual
  (not an error — `isError` false).

### `birth` (two-phase)
A tool call cannot show the chart to the model mid-call, so birth is split, with a
deterministic `seed` carried by the model between calls.
- **Phase 1 — `{}` (no persona):** server picks a seed, runs `roll(seed)`, computes the
  chart, and returns `{ chart, colorHex, seed, next: "call birth again with this seed plus
  a persona and traits that fit this chart" }`. Nothing is persisted yet.
- **Phase 2 — `{ seed, persona, traits }`:** server replays `roll(seed)` (mulberry32 PRNG
  → identical chart), computes the chart, snaps the color name from `colorHex`, and saves
  via `profile.save(modelKey, data)`. Returns a confirmation (sign, rising, color).
- **Trade-off (documented):** a seeded roll uses the seed for time-of-day too, so the
  rising sign/houses are reproducible rather than tied to the real clock instant. This is
  a deliberate deviation from the Claude flow, required for the two-call handshake.
- **Validation:** phase 2 requires `seed` (number) and `persona` (non-empty string);
  `traits` optional array. Missing/invalid → `isError` with a corrective message.

### `set_companion`
- **Input:** `{ datetime: string, place?: string, lat?: number, lon?: number,
  tzOffsetMinutes?: number }`.
- **Behavior:** mirrors the CLI `me` command — geocode `place` or use `lat`/`lon`
  (inferring the country via `nearestCity` when only coordinates are given), infer the
  timezone from the birthplace unless `tzOffsetMinutes` is supplied (multi-zone countries
  return an error asking for an explicit offset), compute the chart, store via
  `profile.setUser`. Returns a confirmation plus a one-line synastry summary against the
  current identity (if one exists).

## Architecture & files

- **`lib/mcp-tools.js`** (CommonJS, new) — the three handlers as pure functions:
  `birthTool(input)`, `personaTool()`, `setCompanionTool(input)`, each returning
  `{ content: [{ type: 'text', text }], isError?: boolean }`. Resolves the model key from
  `process.env.ASTROBOT_MODEL || 'mcp'`. Reuses `profile`, `roll`, `chart`, `mood`,
  `persona`, `synastry`, `geocode`, `timezone`. All real logic and error handling lives
  here — framework-agnostic and unit-testable without stdio.
- **`bin/astrobot-mcp.mjs`** (ESM, new) — thin glue: import the SDK, load
  `lib/mcp-tools.js` via `module.createRequire(import.meta.url)`, register the three tools
  (zod input schemas) and the `instructions` string on an `McpServer`, connect a
  `StdioServerTransport`. Contains no astrology logic.
- **`bin/astrobot.js`** (existing) — add an `mcp` subcommand branch that
  `await import('../bin/astrobot-mcp.mjs')` (dynamic import from CJS into ESM), so
  `npx @meodai/astrobot mcp` starts the server. All other commands unchanged.
- **`package.json`** — add `dependencies`: `@modelcontextprotocol/sdk`, `zod`; add
  `bin/astrobot-mcp.mjs` and `lib/mcp-tools.js` to `files[]`.
- **`README.md`** — new MCP section (config snippet, the three tools, the birth ritual,
  the `ASTROBOT_MODEL` note, and the honest note about `instructions` injection).

## Error handling

- Unknown/absent identity in `persona`: informational guidance, not an error.
- `birth` phase 2 with a missing/invalid seed or persona: `isError` with the exact fields
  needed.
- `set_companion` for a multi-zone country without `tzOffsetMinutes`: `isError` reusing the
  CLI's message ("… spans several time zones — add tzOffsetMinutes …").
- Unparseable datetime / unknown place: `isError` with a corrective message.
- Handlers never throw across the tool boundary; they catch and return `isError` so the
  client sees a usable message.

## Testing

- **`test/mcp-tools.test.js`** (`node:test`, primary coverage) — run against a temp
  `ASTROBOT_DIR`:
  - `persona` before birth → guidance, not error.
  - `birth` phase 1 → returns chart + seed, persists nothing.
  - `birth` phase 2 with that seed → persists; `persona` then returns a block naming the
    sun/rising/color; a second birth with the same seed reproduces the same chart.
  - `birth` phase 2 with missing seed/persona → `isError`.
  - `set_companion` with a place → timezone inferred; `persona` gains a Companion line.
  - `set_companion` for a multi-zone country without offset → `isError`.
- **`test/mcp-smoke.test.js`** — spawn `astrobot mcp`, perform the `initialize` handshake
  and `tools/list` over stdio, assert the three tools are advertised. Keeps the ESM/SDK
  glue honest without over-testing the framework.

## Rollout

Independent, additive feature. When published, the README MCP section is the entry point;
`npm publish --access public` ships it. No migration; existing CLI/plugin behavior
unchanged.
