import {describe, expect, test, vi, beforeEach, afterEach} from 'vitest';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod/v3';
import {SCHEMA_DOC} from './schema-doc';
import {validateScene} from './tools/validate-scene';
import {listNodeTypes} from './tools/list-node-types';

// Mock renderVideo so integration tests never launch Puppeteer
vi.mock('@reelgen/renderer', () => ({
  renderVideo: vi.fn().mockResolvedValue('out/video.mp4'),
}));

// Build a test server that mirrors the real one but is isolated per test
function buildTestServer(): McpServer {
  const server = new McpServer({name: 'reelgen-test', version: '0.0.0'});

  server.tool('get_schema', 'Returns schema reference.', {}, async () => ({
    content: [{type: 'text' as const, text: SCHEMA_DOC}],
  }));

  server.tool(
    'validate_scene',
    'Validate a JSON scene definition.',
    {definition: z.record(z.unknown())},
    async (input) => {
      const result = validateScene(input as {definition: Record<string, unknown>});
      return {content: [{type: 'text' as const, text: JSON.stringify(result)}]};
    },
  );

  server.tool('list_node_types', 'List node types.', {}, async () => {
    const result = listNodeTypes();
    return {content: [{type: 'text' as const, text: JSON.stringify(result)}]};
  });

  server.tool(
    'render_scene',
    'Render a scene.',
    {
      definition: z.record(z.unknown()),
      outDir: z.string().optional(),
      outFile: z.string().optional(),
      workers: z.number().int().min(1).optional(),
    },
    async (input) => {
      const {renderScene} = await import('./tools/render-scene');
      try {
        const result = await renderScene(input as Parameters<typeof renderScene>[0]);
        return {content: [{type: 'text' as const, text: JSON.stringify(result)}]};
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {content: [{type: 'text' as const, text: `Error: ${message}`}], isError: true};
      }
    },
  );

  server.resource(
    'schema',
    'reelgen://schema',
    {mimeType: 'text/markdown'},
    async () => ({
      contents: [{uri: 'reelgen://schema', mimeType: 'text/markdown', text: SCHEMA_DOC}],
    }),
  );

  return server;
}

async function createClientServerPair(): Promise<{
  client: Client;
  server: McpServer;
  cleanup: () => Promise<void>;
}> {
  const server = buildTestServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({name: 'test-client', version: '0.0.0'});
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    server,
    cleanup: async () => {
      await client.close();
    },
  };
}

describe('MCP server — tool registration', () => {
  test('registers all four tools', async () => {
    const {client, cleanup} = await createClientServerPair();
    try {
      const {tools} = await client.listTools();
      const names = tools.map(t => t.name);
      expect(names).toContain('render_scene');
      expect(names).toContain('validate_scene');
      expect(names).toContain('get_schema');
      expect(names).toContain('list_node_types');
    } finally {
      await cleanup();
    }
  });

  test('registers the reelgen://schema resource', async () => {
    const {client, cleanup} = await createClientServerPair();
    try {
      const {resources} = await client.listResources();
      const uris = resources.map(r => r.uri);
      expect(uris).toContain('reelgen://schema');
    } finally {
      await cleanup();
    }
  });
});

describe('MCP server — get_schema tool', () => {
  test('returns the full schema markdown', async () => {
    const {client, cleanup} = await createClientServerPair();
    try {
      const result = await client.callTool({name: 'get_schema', arguments: {}});
      const text = (result.content as Array<{type: string; text: string}>)[0].text;
      expect(text).toContain('# Reelgen JSON Scene Schema');
      expect(text).toContain('AnimationStep');
      expect(text).toContain('easeOutCubic');
    } finally {
      await cleanup();
    }
  });
});

describe('MCP server — reelgen://schema resource', () => {
  test('returns the schema as markdown', async () => {
    const {client, cleanup} = await createClientServerPair();
    try {
      const result = await client.readResource({uri: 'reelgen://schema'});
      const content = result.contents[0];
      expect(content.mimeType).toBe('text/markdown');
      expect('text' in content && content.text).toBeTruthy();
      if ('text' in content) {
        expect(content.text).toContain('# Reelgen JSON Scene Schema');
      }
    } finally {
      await cleanup();
    }
  });
});

describe('MCP server — validate_scene tool', () => {
  test('returns valid:true for a correct definition', async () => {
    const {client, cleanup} = await createClientServerPair();
    try {
      const result = await client.callTool({
        name: 'validate_scene',
        arguments: {
          definition: {scenes: [{id: 's', nodes: [], timeline: []}]},
        },
      });
      const text = (result.content as Array<{type: string; text: string}>)[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.valid).toBe(true);
    } finally {
      await cleanup();
    }
  });

  test('returns valid:false with errors for bad input', async () => {
    const {client, cleanup} = await createClientServerPair();
    try {
      const result = await client.callTool({
        name: 'validate_scene',
        arguments: {definition: {}},
      });
      const text = (result.content as Array<{type: string; text: string}>)[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors.length).toBeGreaterThan(0);
    } finally {
      await cleanup();
    }
  });
});

describe('MCP server — list_node_types tool', () => {
  test('returns 21 node types', async () => {
    const {client, cleanup} = await createClientServerPair();
    try {
      const result = await client.callTool({
        name: 'list_node_types',
        arguments: {},
      });
      const text = (result.content as Array<{type: string; text: string}>)[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.nodeTypes).toHaveLength(21);
    } finally {
      await cleanup();
    }
  });

  test('includes commonProps', async () => {
    const {client, cleanup} = await createClientServerPair();
    try {
      const result = await client.callTool({
        name: 'list_node_types',
        arguments: {},
      });
      const text = (result.content as Array<{type: string; text: string}>)[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.commonProps).toBeDefined();
      expect(parsed.commonProps.appearance).toContain('opacity');
    } finally {
      await cleanup();
    }
  });
});

describe('MCP server — render_scene tool', () => {
  beforeEach(() => vi.clearAllMocks());

  test('returns videoPath and absolutePath on success', async () => {
    const {client, cleanup} = await createClientServerPair();
    try {
      const result = await client.callTool({
        name: 'render_scene',
        arguments: {
          definition: {scenes: [{id: 's', nodes: [], timeline: []}]},
        },
      });
      const text = (result.content as Array<{type: string; text: string}>)[0].text;
      const parsed = JSON.parse(text);
      expect(parsed.videoPath).toBe('out/video.mp4');
      expect(typeof parsed.absolutePath).toBe('string');
    } finally {
      await cleanup();
    }
  });

  test('returns isError:true for invalid definition', async () => {
    const {client, cleanup} = await createClientServerPair();
    try {
      const result = await client.callTool({
        name: 'render_scene',
        arguments: {definition: {scenes: 'bad'}},
      });
      expect(result.isError).toBe(true);
      const text = (result.content as Array<{type: string; text: string}>)[0].text;
      expect(text).toMatch(/Error:/);
    } finally {
      await cleanup();
    }
  });

  test('forwards outDir and outFile arguments', async () => {
    const {renderVideo} = await import('@reelgen/renderer');
    const {client, cleanup} = await createClientServerPair();
    try {
      await client.callTool({
        name: 'render_scene',
        arguments: {
          definition: {scenes: [{id: 's', nodes: [], timeline: []}]},
          outDir: 'my-output',
          outFile: 'result.mp4',
        },
      });
      expect(renderVideo).toHaveBeenCalledOnce();
      const call = vi.mocked(renderVideo).mock.calls[0][0];
      expect(call.settings?.outDir).toBe('my-output');
      expect(call.settings?.outFile).toBe('result.mp4');
    } finally {
      await cleanup();
    }
  });
});
