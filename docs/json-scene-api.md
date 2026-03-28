# JSON Scene API

`@reelgen/scene-builder` lets you define entire videos as plain JSON — no TypeScript, no build step. You describe your nodes and their animation timeline; the library constructs the scene at runtime.

**When to use JSON over TypeScript:**
- AI-generated video (LLMs produce JSON more reliably than animation code)
- Server-side pipelines where you want data → video without a build step
- Simple template-based videos (title cards, lower-thirds, data visualizations)

**When to stick with TypeScript:**
- Complex programmatic logic (data fetching, conditional branching)
- Custom node subclasses or shader effects
- Full access to the signal and threading APIs

---

## Top-Level Structure

```json
{
  "settings": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "background": "#0f0f23"
  },
  "scenes": [ ...SceneDescriptor ]
}
```

`settings` is optional — all fields inside it are optional too. Defaults: 1920×1080, 30fps, black background.

---

## Scene Descriptor

```json
{
  "id": "intro",
  "background": "#1a1a2e",
  "transition": { "type": "fade", "duration": 0.5 },
  "nodes": [ ...NodeDescriptor ],
  "timeline": [ ...TimelineEntry ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique scene identifier |
| `background` | CSS color | no | Overrides the top-level background for this scene |
| `transition` | TransitionDescriptor | no | Transition played at the start of this scene |
| `nodes` | NodeDescriptor[] | yes | Nodes to add to the scene (can be `[]`) |
| `timeline` | TimelineEntry[] | yes | Animation steps (can be `[]`) |

---

## Node Descriptor

```json
{
  "id": "title",
  "type": "Txt",
  "props": {
    "text": "Hello World",
    "fontSize": 64,
    "fill": "#ffffff",
    "position": [0, -200],
    "opacity": 0
  },
  "children": [ ...NodeDescriptor ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | no | Used to target this node in the timeline |
| `type` | string | yes | Node type name — see [Node Types](./node-types.md) |
| `props` | object | no | Node properties |
| `children` | NodeDescriptor[] | no | Child nodes (nested inside this node) |

### Prop value encoding

| Reelgen type | JSON encoding | Example |
|---|---|---|
| number | number | `48` |
| string | string | `"Hello"` |
| boolean | boolean | `true` |
| Color | CSS color string | `"#ff0000"`, `"rgba(0,0,0,0.5)"` |
| Vector2 | `[x, y]` number tuple | `[100, -200]` |
| Spacing | number, `[v, h]`, or `[top, right, bottom, left]` | `10`, `[10, 20]`, `[4, 8, 4, 8]` |

**Example — Rect containing a Txt label:**

```json
{
  "id": "button",
  "type": "Rect",
  "props": { "width": 300, "height": 72, "radius": 12, "fill": "#3b82f6", "opacity": 0 },
  "children": [
    { "type": "Txt", "props": { "text": "Click me", "fontSize": 28, "fill": "#ffffff" } }
  ]
}
```

Children are centered inside the parent by default.

---

## Timeline

The timeline is an array of **sequential entries**. Each entry runs after the previous one finishes. There are three entry types:

### AnimationStep — tween a property

```json
{
  "target": "title",
  "prop": "opacity",
  "to": 1,
  "from": 0,
  "duration": 0.6,
  "easing": "easeOutCubic"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `target` | string | yes | The `id` of the node to animate |
| `prop` | string | yes | Property name. Use dot notation for nested: `"position.x"` |
| `to` | any | yes | Target value (same encoding as props) |
| `from` | any | no | Starting value — if omitted, uses the current value |
| `duration` | number | yes | Duration in seconds |
| `easing` | string | no | Easing function name (see table below). Default: `"linear"` |

**Dot-path notation** lets you animate sub-properties:

```json
{ "target": "box", "prop": "position.x", "to": 200, "duration": 0.5 }
{ "target": "box", "prop": "scale.x",    "to": 1.5, "duration": 0.3 }
```

### ParallelBlock — run animations concurrently

```json
{
  "parallel": [
    { "target": "title", "prop": "opacity", "to": 1, "duration": 0.4 },
    { "target": "box",   "prop": "x",       "to": 200, "duration": 0.6 }
  ]
}
```

All entries inside `parallel` start at the same time. The block waits for the **longest** one to finish before the next timeline entry starts.

### WaitStep — pause

```json
{ "type": "wait", "duration": 2 }
```

Pauses the timeline for `duration` seconds.

---

## Easing Functions

Pass an easing name as the `"easing"` field in an AnimationStep. Defaults to `"linear"`.

```
linear

easeInSine    easeOutSine    easeInOutSine
easeInQuad    easeOutQuad    easeInOutQuad
easeInCubic   easeOutCubic   easeInOutCubic
easeInQuart   easeOutQuart   easeInOutQuart
easeInQuint   easeOutQuint   easeInOutQuint
easeInExpo    easeOutExpo    easeInOutExpo
easeInCirc    easeOutCirc    easeInOutCirc
easeInBack    easeOutBack    easeInOutBack
easeInElastic easeOutElastic easeInOutElastic
easeInBounce  easeOutBounce  easeInOutBounce
```

**Quick guide:**
- `easeOut*` — fast start, slow finish. Good for elements entering the frame.
- `easeIn*` — slow start, fast finish. Good for elements leaving the frame.
- `easeInOut*` — slow at both ends. Good for elements moving within the frame.
- `easeOutBack` / `easeOutElastic` / `easeOutBounce` — overshoot and settle. Playful, attention-grabbing.

---

## Transitions

A transition plays at the start of a scene. Only one per scene is supported.

```json
{ "type": "fade",    "duration": 0.6 }
{ "type": "slide",   "duration": 0.5, "direction": "left" }
{ "type": "zoomIn",  "duration": 0.6, "area": [0, 0, 400, 300] }
{ "type": "zoomOut", "duration": 0.6, "area": [0, 0, 400, 300] }
```

- **fade** — cross-fade between scenes
- **slide** — slide in from a direction. `direction`: `"top"` | `"right"` | `"bottom"` | `"left"`
- **zoomIn** — zoom in from an area `[x, y, width, height]`
- **zoomOut** — zoom out to an area `[x, y, width, height]`

---

## Full Example — Quiz Video

This scene shows a question, reveals answer options one by one, then highlights the correct answer.

```json
{
  "settings": { "width": 1920, "height": 1080, "fps": 30, "background": "#0f0f23" },
  "scenes": [
    {
      "id": "question",
      "background": "#0f0f23",
      "nodes": [
        {
          "id": "questionText",
          "type": "Txt",
          "props": {
            "text": "What is the capital of France?",
            "fontSize": 52, "fill": "#ffffff", "fontWeight": 700,
            "position": [0, -280], "opacity": 0
          }
        },
        {
          "id": "optionA",
          "type": "Rect",
          "props": { "width": 700, "height": 80, "radius": 14,
            "fill": "#1e293b", "stroke": "#334155", "lineWidth": 2,
            "position": [0, -120], "opacity": 0 },
          "children": [{ "type": "Txt", "props": { "text": "A)  London", "fontSize": 30, "fill": "#e2e8f0" } }]
        },
        {
          "id": "optionB",
          "type": "Rect",
          "props": { "width": 700, "height": 80, "radius": 14,
            "fill": "#1e293b", "stroke": "#334155", "lineWidth": 2,
            "position": [0, 0], "opacity": 0 },
          "children": [{ "type": "Txt", "props": { "text": "B)  Paris", "fontSize": 30, "fill": "#e2e8f0" } }]
        },
        {
          "id": "optionC",
          "type": "Rect",
          "props": { "width": 700, "height": 80, "radius": 14,
            "fill": "#1e293b", "stroke": "#334155", "lineWidth": 2,
            "position": [0, 120], "opacity": 0 },
          "children": [{ "type": "Txt", "props": { "text": "C)  Berlin", "fontSize": 30, "fill": "#e2e8f0" } }]
        },
        {
          "id": "optionD",
          "type": "Rect",
          "props": { "width": 700, "height": 80, "radius": 14,
            "fill": "#1e293b", "stroke": "#334155", "lineWidth": 2,
            "position": [0, 240], "opacity": 0 },
          "children": [{ "type": "Txt", "props": { "text": "D)  Madrid", "fontSize": 30, "fill": "#e2e8f0" } }]
        },
        {
          "id": "highlight",
          "type": "Rect",
          "props": { "width": 720, "height": 90, "radius": 18,
            "fill": "rgba(0,0,0,0)", "stroke": "#22c55e", "lineWidth": 3,
            "position": [0, 0], "opacity": 0 }
        },
        {
          "id": "answerLabel",
          "type": "Txt",
          "props": { "text": "✓  Correct answer: Paris", "fontSize": 34,
            "fill": "#22c55e", "fontWeight": 600, "position": [0, 380], "opacity": 0 }
        }
      ],
      "timeline": [
        { "target": "questionText", "prop": "opacity", "to": 1, "duration": 0.7, "easing": "easeOutCubic" },
        { "type": "wait", "duration": 0.3 },
        { "target": "optionA", "prop": "opacity", "to": 1, "duration": 0.4, "easing": "easeOutQuad" },
        { "target": "optionB", "prop": "opacity", "to": 1, "duration": 0.4, "easing": "easeOutQuad" },
        { "target": "optionC", "prop": "opacity", "to": 1, "duration": 0.4, "easing": "easeOutQuad" },
        { "target": "optionD", "prop": "opacity", "to": 1, "duration": 0.4, "easing": "easeOutQuad" },
        { "type": "wait", "duration": 2 },
        {
          "parallel": [
            { "target": "highlight",    "prop": "opacity", "to": 1,        "duration": 0.4 },
            { "target": "optionB",      "prop": "stroke",  "to": "#22c55e","duration": 0.4 },
            { "target": "answerLabel",  "prop": "opacity", "to": 1,        "duration": 0.5 }
          ]
        },
        { "type": "wait", "duration": 2 },
        {
          "parallel": [
            { "target": "questionText", "prop": "opacity", "to": 0, "duration": 0.4 },
            { "target": "optionA",      "prop": "opacity", "to": 0, "duration": 0.4 },
            { "target": "optionB",      "prop": "opacity", "to": 0, "duration": 0.4 },
            { "target": "optionC",      "prop": "opacity", "to": 0, "duration": 0.4 },
            { "target": "optionD",      "prop": "opacity", "to": 0, "duration": 0.4 },
            { "target": "highlight",    "prop": "opacity", "to": 0, "duration": 0.4 },
            { "target": "answerLabel",  "prop": "opacity", "to": 0, "duration": 0.4 }
          ]
        }
      ]
    }
  ]
}
```

**What's happening:**
1. Question fades in (`easeOutCubic`)
2. 0.3s pause, then options A–D fade in sequentially
3. 2s pause (audience reads the question)
4. Correct answer highlighted in parallel: green border on option B, green outline, answer label
5. 2s pause, then everything fades out in parallel

---

## Using with `@reelgen/renderer`

```ts
import { createScenesFromJSON } from '@reelgen/scene-builder';
import { makeProject } from '@reelgen/core';
import { renderVideo } from '@reelgen/renderer';

const json = { /* your scene definition */ };

const { scenes, settings } = createScenesFromJSON(json);

const project = makeProject({
  name: 'my-video',
  scenes,
  settings: {
    shared: {
      size: settings?.width && settings?.height
        ? { x: settings.width, y: settings.height }
        : { x: 1920, y: 1080 },
    },
    rendering: {
      fps: settings?.fps ?? 30,
    },
  },
});
```

Or use `renderScene` from `@reelgen/mcp` for a one-call API:

```ts
import { renderScene } from '@reelgen/mcp/lib/tools/render-scene.js';

const { videoPath } = await renderScene({
  definition: json,
  outDir: './out',
  outFile: 'quiz.mp4',
});
```

---

## Standalone Validation

Validate a scene definition without rendering — useful for cheap pre-flight checks:

```ts
import { validateSceneDefinition } from '@reelgen/scene-builder/validation';

try {
  validateSceneDefinition(json);
  console.log('valid');
} catch (err) {
  console.error(err.message); // Zod error listing all issues
}
```

Or use the `validateScene` helper from `@reelgen/mcp`:

```ts
import { validateScene } from '@reelgen/mcp/lib/tools/validate-scene.js';

const result = validateScene({ definition: json });
// { valid: true } or { valid: false, errors: ['...'] }
```
