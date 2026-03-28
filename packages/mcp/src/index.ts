import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {z} from 'zod/v3';
import {renderScene} from './tools/render-scene';
import {validateScene} from './tools/validate-scene';
import {listNodeTypes} from './tools/list-node-types';
import {SCHEMA_DOC} from './schema-doc';

const server = new McpServer({
  name: 'reelgen',
  version: '0.10.6',
});

// ─── Tool: render_scene ──────────────────────────────────────────────────────

server.tool(
  'render_scene',
  'Render a JSON scene definition to an MP4 video. Returns the path to the rendered file. Call get_schema first if you are unsure of the JSON format.',
  {
    definition: z
      .record(z.unknown())
      .describe('The full JSON scene definition to render.'),
    outDir: z
      .string()
      .optional()
      .describe('Output directory for the rendered video. Defaults to ./out'),
    outFile: z
      .string()
      .optional()
      .describe(
        'Output filename (must end in .mp4, .webm, or .mov). Defaults to video.mp4',
      ),
    workers: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Number of parallel render workers. Defaults to 1.'),
  },
  async (input) => {
    try {
      const result = await renderScene(input);
      return {
        content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{type: 'text' as const, text: `Error: ${message}`}],
        isError: true,
      };
    }
  },
);

// ─── Tool: validate_scene ────────────────────────────────────────────────────

server.tool(
  'validate_scene',
  'Validate a JSON scene definition without rendering. Returns validation errors if any. Use this before render_scene to catch mistakes cheaply.',
  {
    definition: z
      .record(z.unknown())
      .describe('The JSON scene definition to validate.'),
  },
  async (input) => {
    const result = validateScene(input);
    return {
      content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
    };
  },
);

// ─── Tool: list_node_types ───────────────────────────────────────────────────

server.tool(
  'list_node_types',
  'List all supported node types and their key props. Call this to understand what nodes are available when building a scene definition.',
  {},
  async () => {
    const result = listNodeTypes();
    return {
      content: [{type: 'text' as const, text: JSON.stringify(result, null, 2)}],
    };
  },
);

// ─── Tool: get_schema ────────────────────────────────────────────────────────

server.tool(
  'get_schema',
  [
    'Returns the complete Reelgen JSON scene schema reference.',
    'Call this FIRST before building any scene definition.',
    'Covers: top-level structure, all node types, prop encoding (Vector2 as [x,y], colors as CSS strings),',
    'timeline format (sequential steps, parallel blocks, wait), all easing names, transition types,',
    'and a full working example.',
  ].join(' '),
  {},
  async () => ({
    content: [{type: 'text' as const, text: SCHEMA_DOC}],
  }),
);

// ─── Resource: reelgen://schema ──────────────────────────────────────────────

server.resource(
  'schema',
  'reelgen://schema',
  {mimeType: 'text/markdown', description: 'Reelgen JSON scene schema reference'},
  async () => ({
    contents: [{uri: 'reelgen://schema', mimeType: 'text/markdown', text: SCHEMA_DOC}],
  }),
);

// ─── Start ───────────────────────────────────────────────────────────────────

export async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
