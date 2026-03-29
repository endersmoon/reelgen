# Rendering

Reelgen supports three rendering modes: CLI, programmatic Node.js API, and an HTTP server for remote/queue-based rendering.

---

## CLI Render

```bash
npx reelgen render
# or with a custom project file:
npx reelgen render --projectFile ./src/project.ts
```

Output lands at `./output/<filename>.mp4`. The filename comes from the `outFile` in your project settings, or a generated UUID.

---

## Programmatic Render

Use `renderVideo` from `@reelgen/renderer` for full control:

```ts
import { renderVideo } from '@reelgen/renderer';

const videoPath = await renderVideo({
  projectFile: './src/project.ts',
  settings: {
    outFile: 'my-video.mp4',   // output filename
    outDir: './output',         // output directory (default: ./output)
    workers: 2,                 // parallel Puppeteer workers (default: 1)
    logProgress: true,          // print frame progress to stdout
    progressCallback: (worker, progress) => {
      console.log(`Worker ${worker}: ${(progress * 100).toFixed(0)}%`);
    },
  },
});

console.log('Rendered to', videoPath);
```

### All `settings` options

| Option | Type | Default | Description |
|---|---|---|---|
| `outFile` | string | `"video.mp4"` | Output filename |
| `outDir` | string | `"./output"` | Output directory |
| `workers` | number | `1` | Parallel Puppeteer instances |
| `logProgress` | boolean | `false` | Log frame progress to stdout |
| `progressCallback` | function | — | Called with `(workerId, 0–1)` as each worker progresses |

---

## Variables at Render Time

Pass dynamic data into your scenes without changing the project file:

```ts
await renderVideo({
  projectFile: './src/project.ts',
  variables: {
    title: 'Q3 Earnings Report',
    revenue: 4200000,
    highlight: '#22c55e',
  },
  settings: { outFile: 'q3-report.mp4' },
});
```

Read them in the scene with `useScene().variables.get('key', defaultValue)`. See [TypeScript Scenes — Variables](./typescript-scenes.md#scene-variables).

---

## Parallel Workers

The `workers` option splits the video's frame range across multiple Puppeteer browser instances that render concurrently. The FFmpeg step then merges the chunks.

```ts
await renderVideo({
  projectFile: './src/project.ts',
  settings: {
    workers: 4,  // render on 4 parallel Puppeteer instances
    outFile: 'output.mp4',
  },
});
```

**Guidance:**
- A good starting point is `workers = CPU core count / 2`
- Each worker spawns a full Chromium process — memory usage scales linearly
- For short videos (< 30s), a single worker is usually fastest due to startup overhead
- For long videos or batch rendering, 4–8 workers typically give the best throughput

---

## HTTP Render Server

`reelgen serve` exposes a REST endpoint so external systems can trigger renders. This is useful for SaaS backends, render queues, and webhook-driven workflows.

```bash
npx reelgen serve --projectFile ./src/project.ts --port 4000
```

The server exposes two endpoints:

- `POST /render` — trigger a render
- `GET /download/:filename` — download a completed video

### Mode 1 — Synchronous

No `callbackUrl` or `streamProgress` in the request body. The HTTP request blocks until rendering completes.

**Request:**
```json
{
  "variables": { "title": "My Video" },
  "settings": { "outFile": "custom.mp4" }
}
```

**Response (200):**
```json
{
  "status": "success",
  "downloadLink": "http://localhost:4000/download/custom.mp4"
}
```

**Error response (500):**
```json
{
  "status": "error",
  "message": "Error message here"
}
```

---

### Mode 2 — Callback (async)

Include a `callbackUrl` in the request. The server responds immediately with a job ID, then POSTs the result to your callback URL when rendering finishes.

**Request:**
```json
{
  "variables": { "title": "My Video" },
  "callbackUrl": "https://myapp.com/webhooks/render-complete"
}
```

**Immediate response (200):**
```json
{ "tempProjectName": "a1b2c3d4-..." }
```

**Callback POST to your `callbackUrl` on success:**
```json
{
  "tempProjectName": "a1b2c3d4-...",
  "status": "success",
  "downloadLink": "http://localhost:4000/download/a1b2c3d4-.mp4"
}
```

**Callback POST on error:**
```json
{
  "tempProjectName": "a1b2c3d4-...",
  "status": "error",
  "error": "Error message here"
}
```

---

### Mode 3 — SSE streaming progress

Include `"streamProgress": true`. The response is a `text/event-stream` (Server-Sent Events) stream. You receive frame-by-frame progress, then a final `completed` event.

**Request:**
```json
{
  "variables": { "title": "My Video" },
  "streamProgress": true
}
```

**Response — event stream:**
```
event: progress
data: {"worker": 0, "progress": 0.12}

event: progress
data: {"worker": 0, "progress": 0.45}

event: progress
data: {"worker": 0, "progress": 1.0}

event: completed
data: {"status": "success", "downloadLink": "http://localhost:4000/download/abc.mp4"}
```

**Error event:**
```
event: error
data: {"status": "error", "message": "Error message here"}
```

**Client example (Node.js with `eventsource`):**
```ts
import EventSource from 'eventsource';

const es = new EventSource('http://localhost:4000/render-stream'); // not a real endpoint
// In practice, SSE is initiated via POST — use fetch with ReadableStream or a library
```

For most use cases, the callback mode is simpler to implement than SSE.

---

## Downloading Completed Videos

```
GET /download/:filename
```

Downloads the file from `./output/:filename`. The server schedules cleanup of the file shortly after it is downloaded.

```bash
curl -O http://localhost:4000/download/my-video.mp4
```

---

## Output Formats

The default output is H.264 MP4 via the built-in WASM exporter. To change the format, configure the `exporter` in your project settings:

```ts
export default makeProject({
  settings: {
    rendering: {
      exporter: {
        name: '@reelgen/core/wasm',
        // Additional exporter options here when available
      },
    },
  },
});
```

WebM/VP9 output is on the roadmap (see [ROADMAP.md](../ROADMAP.md)).

---

## Environment Variables

| Variable | Description |
|---|---|
| `DISABLE_TELEMETRY` | Set to `"true"` to opt out of anonymous render-count tracking |
| `PROJECT_FILE` | Project file path (used internally by `reelgen serve`) |
| `REVIDEO_PORT` | Server port override (used internally by `reelgen serve`) |
