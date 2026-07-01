#!/usr/bin/env node
// bin/astrobot-mcp.mjs — MCP-over-stdio glue for astrobot. ESM (SDK is ESM); loads the
// CommonJS handlers via createRequire. Registers three tools and the server instructions.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const tools = require('../lib/mcp-tools.js');
const pkg = require('../package.json');

const INSTRUCTIONS =
  'You have a small, permanent astrological persona from astrobot. At the start of a ' +
  'session, call the `persona` tool and let the returned block gently tint your tone — ' +
  'tone only, never your accuracy, effort, or output format. If `persona` reports no ' +
  'identity yet, run the birth ritual: call `birth` with no arguments to roll a chart, ' +
  'then call `birth` again with the returned seed plus a short persona and traits that ' +
  'fit that chart. The human may call `set_companion` to record their own birth for a ' +
  'compatibility reading.';

export async function startMcpServer() {
  const server = new McpServer({ name: 'astrobot', version: pkg.version }, { instructions: INSTRUCTIONS });

  server.registerTool(
    'persona',
    {
      title: "Astrological persona + today's mood",
      description:
        "Return this model's astrobot identity and today's mood as a paste-able block. " +
        'Call at the start of a session so it can tint your tone (tone only).',
      inputSchema: {},
    },
    async () => tools.personaTool()
  );

  server.registerTool(
    'birth',
    {
      title: 'Birth an astrological identity',
      description:
        'Two-phase. Call with NO arguments to roll a chart (returns a seed and the chart). ' +
        'Then call again with that same seed plus a persona and traits that fit the chart ' +
        'to persist the identity.',
      inputSchema: {
        seed: z.number().int().optional().describe('The seed returned by the first call. Required to persist (phase 2).'),
        persona: z.string().optional().describe('2-3 sentence self-portrait fitting the rolled chart. Provide to persist (phase 2).'),
        traits: z.array(z.string()).optional().describe('1-2 traits that fit the chart.'),
      },
    },
    async (args) => tools.birthTool(args)
  );

  server.registerTool(
    'set_companion',
    {
      title: "Record the human's birth (compatibility)",
      description:
        "Record the human user's birth so the persona factors your compatibility. The " +
        'timezone is inferred from the birthplace unless tzOffsetMinutes is given.',
      inputSchema: {
        datetime: z.string().describe('Local wall-clock birth datetime, e.g. 1990-06-15T14:30:00'),
        place: z.string().optional().describe('City, e.g. "Zürich" — geocoded from a 12k-city dataset.'),
        lat: z.number().optional().describe('Latitude, when place is absent or not found.'),
        lon: z.number().optional().describe('Longitude, when place is absent or not found.'),
        tzOffsetMinutes: z.number().optional().describe('Override: minutes east of UTC (e.g. 60 for +1).'),
      },
    },
    async (args) => tools.setCompanionTool(args)
  );

  const transport = new StdioServerTransport();
  transport.onclose = () => process.exit(0);
  await server.connect(transport);
  console.error('astrobot MCP server running on stdio');
}

// Self-invoke when run directly: node bin/astrobot-mcp.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startMcpServer().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
