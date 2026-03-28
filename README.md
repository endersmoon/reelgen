<br/>
<p align="center">
  <img width="360" alt="Reelgen logo" src="./logo.svg">
</p>
<p align="center">
  <a href="https://lerna.js.org"><img src="https://img.shields.io/badge/published%20with-lerna-c084fc?style=flat" alt="published with lerna"></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/powered%20by-vite-646cff?style=flat" alt="powered by vite"></a>
  <a href="https://www.npmjs.com/package/@reelgen/core"><img src="https://img.shields.io/npm/v/@reelgen/core?style=flat" alt="npm version"></a>
</p>
<br/>

# Reelgen

Reelgen is an open-source TypeScript framework for creating and rendering programmatic videos. Scenes are defined as TypeScript generator functions with a signal-based reactivity system — then rendered headlessly via Puppeteer and exported to MP4 with FFmpeg.

It is a maintained fork of [Revideo](https://github.com/redotvideo/revideo), which itself was forked from [Motion Canvas](https://motioncanvas.io/). Key additions in Reelgen:

- **JSON scene API** — define entire videos as plain JSON, no TypeScript required
- **MCP server** — lets LLMs (Claude, GPT-4, etc.) render videos directly via tool calls
- Active maintenance and bug fixes on top of the Revideo base

> **Node.js 20+ required.**

---

## Quick Start

Scaffold a new project:

```bash
npm init @reelgen@latest
```

Or install manually:

```bash
npm install @reelgen/core @reelgen/2d @reelgen/renderer
```

---

## TypeScript Scenes

Scenes are TypeScript generator functions. The `yield*` syntax sequences animations; `yield` adds nodes to the view without waiting.

```tsx
import { makeScene2D, Rect, Txt } from '@reelgen/2d';
import { all, waitFor } from '@reelgen/core';

export default makeScene2D('intro', function* (view) {
  const box = new Rect({
    width: 400,
    height: 200,
    radius: 16,
    fill: '#3b82f6',
    opacity: 0,
  });

  view.add(box);

  // Fade in
  yield* box.opacity(1, 0.6);
  yield* waitFor(1);

  // Animate out
  yield* all(
    box.scale(1.2, 0.4),
    box.opacity(0, 0.4),
  );
});
```

Start the visual editor:

```bash
npx revideo dev
```

Render headlessly:

```bash
npx revideo render
```

Or render programmatically:

```ts
import { renderVideo } from '@reelgen/renderer';

await renderVideo({
  projectFile: './src/project.ts',
  settings: { outFile: 'output.mp4', outDir: './out' },
});
```

---

## JSON Scene API

The `@reelgen/scene-builder` package lets you define videos as plain JSON — no TypeScript, no build step. This is the foundation for AI-generated video.

```json
{
  "settings": { "width": 1920, "height": 1080, "fps": 30, "background": "#0f172a" },
  "scenes": [
    {
      "id": "intro",
      "nodes": [
        {
          "id": "title",
          "type": "Txt",
          "props": { "text": "Hello World", "fontSize": 64, "fill": "#ffffff", "opacity": 0 }
        }
      ],
      "timeline": [
        { "target": "title", "prop": "opacity", "to": 1, "duration": 0.8, "easing": "easeOutCubic" },
        { "type": "wait", "duration": 2 },
        { "target": "title", "prop": "opacity", "to": 0, "duration": 0.4 }
      ]
    }
  ]
}
```

Use it in code:

```ts
import { createScenesFromJSON } from '@reelgen/scene-builder';
import { renderVideo } from '@reelgen/renderer';
import { makeProject } from '@reelgen/core';

const { scenes, settings } = createScenesFromJSON(json);

const project = makeProject({
  name: 'my-video',
  scenes,
  settings: {
    shared: { size: { x: settings.width, y: settings.height } },
    rendering: { fps: settings.fps },
  },
});
```

**Supported node types (21):** `Rect`, `Circle`, `Txt`, `Img`, `Video`, `Audio`, `Line`, `Polygon`, `Grid`, `Ray`, `Path`, `Spline`, `CubicBezier`, `QuadBezier`, `Knot`, `Latex`, `Code`, `Icon`, `SVG`, `Layout`, `Node`

**Timeline features:** sequential steps, `parallel` blocks, `wait` steps, 31 easing functions, dot-path property access (`position.x`), transitions (`fade`, `slideLeft`, `zoomIn`, …)

---

## MCP Server (AI / Claude Integration)

`@reelgen/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes Reelgen's rendering pipeline as tools for LLMs. With it, Claude (or any MCP-compatible model) can generate and render videos directly from a conversation.

### Tools

| Tool | Description |
|---|---|
| `get_schema` | Returns the full JSON scene schema reference. Call this first. |
| `validate_scene` | Validates a scene definition without rendering — fast, cheap feedback loop. |
| `list_node_types` | Lists all 21 node types and their props. |
| `render_scene` | Renders a JSON scene to MP4. Accepts `outDir`, `outFile`, `workers`. |

A `reelgen://schema` MCP resource is also available for clients that support resource reading.

### Setup — Claude Code

Add to `~/.claude.json` or your project's `.claude/settings.json`:

```json
{
  "mcpServers": {
    "reelgen": {
      "command": "npx",
      "args": ["reelgen-mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### Setup — Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reelgen": {
      "command": "npx",
      "args": ["reelgen-mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

`cwd` controls where rendered videos are saved (as `<cwd>/out/video.mp4` by default).

### Typical workflow

1. Claude calls `get_schema` to learn the JSON format
2. You describe what you want: *"Make a 15-second product demo with a logo fade-in and animated bullet points"*
3. Claude calls `validate_scene` to catch errors cheaply
4. Claude iterates until valid, then calls `render_scene`
5. Video appears at `out/video.mp4`

### Example prompt

> Using the reelgen MCP, create a quiz video that shows a question, reveals four answer options one by one, then highlights the correct answer in green.

Claude will call `get_schema`, draft the JSON, validate it, and render — no code required on your end.

---

## Packages

| Package | Description |
|---|---|
| `@reelgen/core` | Animation engine: generators, signals, tweening, threading |
| `@reelgen/2d` | 2D renderer with 21 node types (shapes, text, media, SVG, layout) |
| `@reelgen/renderer` | Headless rendering via Puppeteer |
| `@reelgen/ffmpeg` | FFmpeg utilities for video export |
| `@reelgen/vite-plugin` | Vite plugin + standalone backend server |
| `@reelgen/scene-builder` | JSON-to-scene compiler |
| `@reelgen/mcp` | MCP server for LLM integration |
| `@reelgen/cli` | `revideo` CLI — dev server, render, serve |
| `@reelgen/ui` | Visual editor (Preact) |
| `@reelgen/player` | Vanilla JS custom element for previewing animations |
| `@reelgen/player-react` | React wrapper for the player |
| `@reelgen/create` | Project scaffolding (`npm init @reelgen@latest`) |

---

## Development

```bash
# Install dependencies
npm install

# Build all packages
npx lerna run build

# Start the template dev server
npm run template:dev

# Run tests
npm run core:test
npm run 2d:test
npm run e2e:test

# Lint & format
npx eslint --fix "**/*.ts?(x)"
npx prettier --write .
```

See [CLAUDE.md](./CLAUDE.md) for full build and architecture documentation.

---

## Telemetry

Anonymous render counts are tracked via [PostHog](https://github.com/PostHog/posthog). To opt out:

```bash
DISABLE_TELEMETRY=true
```

---

## License

MIT
