# CLI Reference

The Reelgen CLI is provided by `@reelgen/cli`. The binary is named `reelgen` for historical compatibility with the upstream Revideo project.

```bash
npx reelgen <command> [options]
```

---

## `reelgen editor`

Starts the Vite dev server with the visual editor UI.

```bash
npx reelgen editor
npx reelgen editor --projectFile ./src/project.ts
npx reelgen editor --port 9001
```

| Option | Default | Description |
|---|---|---|
| `--projectFile` | `./src/project.ts` | Path to the project file |
| `--port` | `9000` | Port for the Vite dev server |

Opens `http://localhost:<port>` in the browser. Supports HMR — scene changes reload instantly in the editor.

---

## `reelgen render`

Renders the project headlessly to MP4 via Puppeteer + FFmpeg.

```bash
npx reelgen render
npx reelgen render --projectFile ./src/project.ts
```

| Option | Default | Description |
|---|---|---|
| `--projectFile` | `./src/project.ts` | Path to the project file |

Output: `./output/<filename>.mp4`

For programmatic rendering with more options (workers, variables, progress callback), use `renderVideo` from `@reelgen/renderer` directly — see [Rendering](./rendering.md).

---

## `reelgen serve`

Starts an Express HTTP server that exposes a `POST /render` endpoint. Useful for backend integrations and render queues.

```bash
npx reelgen serve
npx reelgen serve --projectFile ./src/project.ts --port 4000
```

| Option | Default | Description |
|---|---|---|
| `--projectFile` | `./src/project.ts` | Path to the project file |
| `--port` | `4000` | Port for the HTTP server |

**Endpoints:**
- `POST /render` — trigger a render (sync, callback, or SSE streaming modes)
- `GET /download/:filename` — download a completed video

See [Rendering — HTTP Render Server](./rendering.md#http-render-server) for full request/response documentation.

---

## Global Options

| Option | Description |
|---|---|
| `--version` | Print the CLI version |
| `--help` | Print help for any command |

---

## Environment Variables

| Variable | Description |
|---|---|
| `PROJECT_FILE` | Project file path override (used internally by `reelgen serve`) |
| `REVIDEO_PORT` | Server port override (used internally by `reelgen serve`) |

---

