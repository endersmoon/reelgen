import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod/v3';

import {validateScene} from '@reelgen/mcp/lib/tools/validate-scene.js';
import {renderScene} from '@reelgen/mcp/lib/tools/render-scene.js';
import {listNodeTypes} from '@reelgen/mcp/lib/tools/list-node-types.js';
import {SCHEMA_DOC} from '@reelgen/mcp/lib/schema-doc.js';

// ── Quiz video JSON scene definition ─────────────────────────────────────────
const quizScene = {
  settings: {
    width: 1920,
    height: 1080,
    fps: 30,
    background: '#0f0f23',
  },
  scenes: [
    {
      id: 'question',
      background: '#0f0f23',
      transition: {type: 'fade', duration: 0.5},
      nodes: [
        {
          id: 'questionText',
          type: 'Txt',
          props: {
            text: 'What is the capital of France?',
            fontSize: 52,
            fill: '#ffffff',
            fontWeight: 700,
            position: [0, -280],
            opacity: 0,
          },
        },
        {
          id: 'optionA',
          type: 'Rect',
          props: {width: 700, height: 80, radius: 14, fill: '#1e293b', stroke: '#334155', lineWidth: 2, position: [0, -120], opacity: 0},
          children: [{type: 'Txt', props: {text: 'A)  London', fontSize: 30, fill: '#e2e8f0'}}],
        },
        {
          id: 'optionB',
          type: 'Rect',
          props: {width: 700, height: 80, radius: 14, fill: '#1e293b', stroke: '#334155', lineWidth: 2, position: [0, 0], opacity: 0},
          children: [{type: 'Txt', props: {text: 'B)  Paris', fontSize: 30, fill: '#e2e8f0'}}],
        },
        {
          id: 'optionC',
          type: 'Rect',
          props: {width: 700, height: 80, radius: 14, fill: '#1e293b', stroke: '#334155', lineWidth: 2, position: [0, 120], opacity: 0},
          children: [{type: 'Txt', props: {text: 'C)  Berlin', fontSize: 30, fill: '#e2e8f0'}}],
        },
        {
          id: 'optionD',
          type: 'Rect',
          props: {width: 700, height: 80, radius: 14, fill: '#1e293b', stroke: '#334155', lineWidth: 2, position: [0, 240], opacity: 0},
          children: [{type: 'Txt', props: {text: 'D)  Madrid', fontSize: 30, fill: '#e2e8f0'}}],
        },
        {
          id: 'highlight',
          type: 'Rect',
          props: {width: 720, height: 90, radius: 18, fill: 'rgba(0,0,0,0)', stroke: '#22c55e', lineWidth: 3, position: [0, 0], opacity: 0},
        },
        {
          id: 'answerLabel',
          type: 'Txt',
          props: {text: '✓  Correct answer: Paris', fontSize: 34, fill: '#22c55e', fontWeight: 600, position: [0, 380], opacity: 0},
        },
      ],
      timeline: [
        {target: 'questionText', prop: 'opacity', to: 1, duration: 0.7, easing: 'easeOutCubic'},
        {type: 'wait', duration: 0.3},
        {target: 'optionA', prop: 'opacity', to: 1, duration: 0.4, easing: 'easeOutQuad'},
        {target: 'optionB', prop: 'opacity', to: 1, duration: 0.4, easing: 'easeOutQuad'},
        {target: 'optionC', prop: 'opacity', to: 1, duration: 0.4, easing: 'easeOutQuad'},
        {target: 'optionD', prop: 'opacity', to: 1, duration: 0.4, easing: 'easeOutQuad'},
        {type: 'wait', duration: 2},
        {
          parallel: [
            {target: 'highlight', prop: 'opacity', to: 1, duration: 0.4, easing: 'easeOutCubic'},
            {target: 'optionB', prop: 'stroke', to: '#22c55e', duration: 0.4},
            {target: 'answerLabel', prop: 'opacity', to: 1, duration: 0.5, easing: 'easeOutCubic'},
          ],
        },
        {type: 'wait', duration: 2},
        {
          parallel: [
            {target: 'questionText', prop: 'opacity', to: 0, duration: 0.4},
            {target: 'optionA', prop: 'opacity', to: 0, duration: 0.4},
            {target: 'optionB', prop: 'opacity', to: 0, duration: 0.4},
            {target: 'optionC', prop: 'opacity', to: 0, duration: 0.4},
            {target: 'optionD', prop: 'opacity', to: 0, duration: 0.4},
            {target: 'highlight', prop: 'opacity', to: 0, duration: 0.4},
            {target: 'answerLabel', prop: 'opacity', to: 0, duration: 0.4},
          ],
        },
      ],
    },
  ],
};

// ── Build MCP server + in-memory client ──────────────────────────────────────
// Note: render_scene is called directly (not via MCP) because InMemoryTransport
// is synchronous and can't handle long-running async operations like video rendering.
function buildServer() {
  const server = new McpServer({name: 'reelgen', version: '0.10.6'});

  server.tool('get_schema', 'Returns schema doc.', {}, async () => ({
    content: [{type: 'text', text: SCHEMA_DOC}],
  }));

  server.tool(
    'validate_scene',
    'Validates a scene definition.',
    {definition: z.record(z.unknown())},
    async (input) => {
      const result = validateScene(input);
      return {content: [{type: 'text', text: JSON.stringify(result, null, 2)}]};
    },
  );

  server.tool('list_node_types', 'Lists node types.', {}, async () => ({
    content: [{type: 'text', text: JSON.stringify(listNodeTypes(), null, 2)}],
  }));

  return server;
}

async function main() {
  console.log('🎬  Reelgen MCP quiz-video test\n');

  // Connect client ↔ server via in-memory transport
  const server = buildServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({name: 'quiz-test', version: '1.0.0'});
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  // ── Step 1: list tools ────────────────────────────────────────────────────
  console.log('📋  Available tools:');
  const {tools} = await client.listTools();
  for (const t of tools) console.log(`    • ${t.name} — ${t.description}`);
  console.log();

  // ── Step 2: get_schema ────────────────────────────────────────────────────
  console.log('📖  Fetching schema reference via MCP...');
  const schemaResult = await client.callTool({name: 'get_schema', arguments: {}});
  const schemaText = schemaResult.content[0].text;
  console.log(`    Schema length: ${schemaText.length} chars`);
  console.log(`    First line: ${schemaText.split('\n')[0]}\n`);

  // ── Step 3: validate_scene via MCP ────────────────────────────────────────
  console.log('✅  Validating quiz scene via MCP...');
  const validateResult = await client.callTool({
    name: 'validate_scene',
    arguments: {definition: quizScene},
  });
  const validation = JSON.parse(validateResult.content[0].text);
  if (!validation.valid) {
    console.error('❌  Validation failed:', validation.errors);
    process.exit(1);
  }
  console.log('    Valid: ✓\n');

  // ── Step 4: list_node_types via MCP ──────────────────────────────────────
  console.log('🧩  Listing node types via MCP...');
  const typesResult = await client.callTool({name: 'list_node_types', arguments: {}});
  const {nodeTypes} = JSON.parse(typesResult.content[0].text);
  console.log(`    ${nodeTypes.length} node types available\n`);

  await client.close();

  // ── Step 5: render_scene (called directly — InMemoryTransport is sync-only)
  console.log('🎞   Rendering quiz video (calling renderScene directly)...');
  console.log('    This may take a minute...\n');

  const rendered = await renderScene({
    definition: quizScene,
    outDir: './out',
    outFile: 'quiz.mp4',
  });

  console.log('🎉  Done!');
  console.log(`    Video path:    ${rendered.videoPath}`);
  console.log(`    Absolute path: ${rendered.absolutePath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
