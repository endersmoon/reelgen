# Getting Started

## Prerequisites

- **Node.js 20+** — check with `node --version`
- **FFmpeg** in your PATH — required for video export. Install via `brew install ffmpeg` (macOS) or `apt install ffmpeg` (Linux).

---

## Option 1 — Scaffold a project (recommended)

```bash
npm init @reelgen@latest
```

Follow the prompts. The generated project looks like this:

```
my-video/
├── src/
│   ├── project.ts        # Video settings, scene list, variables
│   ├── example.tsx       # Your first scene
│   └── render.ts         # Headless render script
├── package.json
└── tsconfig.json
```

Start the visual editor:

```bash
npx reelgen editor
# opens http://localhost:9000
```

Render headlessly to MP4:

```bash
npx reelgen render
# output/video.mp4
```

---

## Option 2 — Manual install

```bash
npm install @reelgen/core @reelgen/2d @reelgen/renderer
```

Create `src/project.ts`:

```ts
import { makeProject } from '@reelgen/core';
import intro from './intro';

export default makeProject({
  name: 'my-video',
  scenes: [intro],
});
```

Create `src/intro.tsx`:

```tsx
/** @jsxImportSource @reelgen/2d/lib */
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

  const label = new Txt({
    text: 'Hello, Reelgen',
    fontSize: 48,
    fill: '#ffffff',
    opacity: 0,
  });

  view.add(box);
  view.add(label);

  // Fade both in simultaneously
  yield* all(
    box.opacity(1, 0.6),
    label.opacity(1, 0.6),
  );

  yield* waitFor(2);

  // Fade out
  yield* all(
    box.opacity(0, 0.4),
    label.opacity(0, 0.4),
  );
});
```

---

## Understanding the scene

```tsx
// yield* sequences animations — it waits for the tween to finish
yield* box.opacity(1, 0.6);   // tween opacity to 1 over 0.6 seconds

// all() runs tweens concurrently — waits for the longest to finish
yield* all(
  box.opacity(1, 0.6),
  label.opacity(1, 0.6),
);

// waitFor() just pauses
yield* waitFor(2);
```

The generator function maps directly to the video timeline. Every `yield*` advances time.

---

## Next steps

- **[JSON Scene API](./json-scene-api.md)** — define videos as plain JSON, no TypeScript needed
- **[MCP Integration](./mcp-integration.md)** — let Claude generate and render videos for you
- **[TypeScript Scenes](./typescript-scenes.md)** — signals, refs, flow helpers, variables
- **[Rendering](./rendering.md)** — programmatic rendering, parallel workers, HTTP server
- **[Node Types](./node-types.md)** — all 21 node types and their properties
