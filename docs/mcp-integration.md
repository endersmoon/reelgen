# MCP Integration

`@reelgen/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes Reelgen's rendering pipeline as tools. With it, Claude (or any MCP-compatible model) can generate and render videos directly inside a conversation — no code required on your end.

---

## How it works

The MCP server runs as a subprocess with a stdio transport. The model calls tools to:

1. Read the schema (so it knows what JSON to produce)
2. Validate a draft scene (cheap, no Puppeteer)
3. Render the final scene (spawns Vite + Puppeteer + FFmpeg)

The output video lands at `<cwd>/out/video.mp4` by default.

---

## Setup

### Claude Code

Add to `~/.claude.json` (global) or `.claude/settings.json` (per-project):

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

### Claude Desktop

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

**About `cwd`:** This is where the rendered video will be saved (as `out/video.mp4`). Set it to any writable directory — your project root, a dedicated `~/videos/` folder, etc. When `@reelgen/mcp` is installed from npm, there is no other path constraint.

---

## Available Tools

| Tool | Description |
|---|---|
| `get_schema` | Returns the full JSON scene schema as markdown. **Call this first.** |
| `list_node_types` | Lists all 21 node types with their key props and common props. |
| `validate_scene` | Validates a scene definition without rendering — fast, no Puppeteer. |
| `render_scene` | Renders a JSON scene to MP4. Returns `videoPath` and `absolutePath`. |

### `render_scene` parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `definition` | object | required | Full JSON scene definition |
| `outDir` | string | `"./out"` | Output directory |
| `outFile` | string | `"video.mp4"` | Output filename (must end in `.mp4`, `.webm`, or `.mov`) |
| `workers` | number | `1` | Parallel render workers |

---

## MCP Resource

The schema is also available as an MCP resource for clients that support resource reading:

```
reelgen://schema
```

MIME type: `text/markdown`. Identical content to `get_schema`.

---

## Recommended Workflow

1. **Claude calls `get_schema`** to load the full JSON format reference
2. **You describe what you want** — be specific about timing, colors, content
3. **Claude drafts scene JSON** and calls `validate_scene`
4. **Claude iterates** until `valid: true`, fixing any errors
5. **Claude calls `render_scene`** — video appears at `out/video.mp4`

The validate → render split is intentional: validation is cheap (milliseconds), rendering takes 30–120 seconds. This loop lets Claude fix schema mistakes before spending render time.

---

## Example Prompts

These types of requests work particularly well:

**Quiz/trivia video:**
> Using reelgen, make a 12-second quiz card: question fades in, then four answer options appear one by one, then the correct answer highlights in green.

**Explainer with bullet points:**
> Create a 20-second explainer video with a title at the top and three bullet points that slide in from the left one at a time.

**Lower-third / title card:**
> Generate a 5-second animated lower-third: name on one line, title below it, both slide up from the bottom with a subtle fade.

**Tips for better results:**
- Specify exact durations: "fade in over 0.6 seconds"
- Specify colors with hex values when you have a brand palette
- Ask Claude to call `validate_scene` before rendering
- For complex scenes, ask Claude to build and validate one section at a time

---

## Direct-Import Usage (Node.js scripts)

For server-side pipelines you can bypass the MCP transport entirely and call the tools directly:

```js
import { validateScene } from '@reelgen/mcp/lib/tools/validate-scene.js';
import { renderScene }   from '@reelgen/mcp/lib/tools/render-scene.js';

const definition = { /* your JSON scene */ };

// Validate first
const check = validateScene({ definition });
if (!check.valid) {
  console.error('Validation errors:', check.errors);
  process.exit(1);
}

// Render
const { videoPath, absolutePath } = await renderScene({
  definition,
  outDir: './out',
  outFile: 'my-video.mp4',
});

console.log('Rendered to', absolutePath);
```

This is the same code path the MCP server uses internally — no MCP client or transport needed.

**Note on long renders:** The MCP InMemoryTransport has a 60-second default timeout. For scenes longer than ~30 seconds, call `renderScene` directly rather than through an in-process MCP client. See `quiz-video-test/render.mjs` for a hybrid approach (MCP for schema/validate, direct call for render).

---

## Telemetry

Reelgen tracks anonymous render counts via PostHog. To opt out:

```bash
DISABLE_TELEMETRY=true npx reelgen-mcp
```

Or set the environment variable in the MCP server config:

```json
{
  "mcpServers": {
    "reelgen": {
      "command": "npx",
      "args": ["reelgen-mcp"],
      "cwd": "/path/to/project",
      "env": { "DISABLE_TELEMETRY": "true" }
    }
  }
}
```
