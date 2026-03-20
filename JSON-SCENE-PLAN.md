# JSON/API-Driven Scene Definitions — Implementation Plan

## Goal

Enable defining Revideo scenes entirely via JSON, so videos can be generated
programmatically without writing TypeScript. A single "interpreter" scene reads
a JSON descriptor and constructs the node tree + animations at runtime.

## Architecture

```
JSON payload
    ↓
SceneBuilder (new package: @revideo/scene-builder)
    ↓
Universal makeScene2D generator
    ↓
Revideo engine → rendered video
```

The interpreter approach: one TypeScript scene that reads JSON at runtime and
dynamically constructs nodes and animations. No codegen.

---

## JSON Schema

### Top-Level Structure

```json
{
  "settings": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "background": "#000000"
  },
  "scenes": [
    {
      "id": "intro",
      "duration": 5,
      "background": "#1a1a2e",
      "transition": { "type": "fade", "duration": 0.6 },
      "nodes": [ ... ],
      "timeline": [ ... ]
    }
  ]
}
```

### Node Descriptor

Every node has a `type`, optional `id` (for animation targeting), `props`,
and optional `children`.

```json
{
  "id": "title",
  "type": "Txt",
  "props": {
    "text": "Hello World",
    "fontSize": 64,
    "fill": "#ffffff",
    "fontFamily": "Inter",
    "position": [0, -200],
    "opacity": 0
  },
  "children": []
}
```

### Supported Node Types

All from `@revideo/2d` except Rive:

| Type         | Key Props                                                        |
| ------------ | ---------------------------------------------------------------- |
| `Rect`       | `width`, `height`, `radius`, `fill`, `stroke`, `lineWidth`       |
| `Circle`     | `width`, `height`, `startAngle`, `endAngle`                      |
| `Txt`        | `text`, `fontSize`, `fontFamily`, `fontWeight`, `fill`            |
| `Img`        | `src`, `width`, `height`, `alpha`, `smoothing`                   |
| `Video`      | `src`, `width`, `height`, `loop`, `playbackRate`                 |
| `Audio`      | `src`, `loop`, `playbackRate`                                    |
| `Line`       | `points`, `radius`, `stroke`, `lineWidth`                        |
| `Polygon`    | `sides`, `radius`, `fill`, `stroke`                              |
| `Grid`       | `spacing`, `width`, `height`, `stroke`                           |
| `Ray`        | `from`, `to`, `stroke`, `lineWidth`                              |
| `Path`       | `data` (SVG path string), `fill`, `stroke`                       |
| `Spline`     | `points`, `smoothness`, `stroke`                                 |
| `CubicBezier`| `p0`, `p1`, `p2`, `p3`, `stroke`                                 |
| `QuadBezier` | `p0`, `p1`, `p2`, `stroke`                                       |
| `Knot`       | `startHandle`, `endHandle`, `auto`                               |
| `Latex`      | `tex`, `fill`, `width`, `height`                                 |
| `Code`       | `language`, `code`, `theme`, `fontSize`                          |
| `Icon`       | `icon`, `color`, `width`, `height`                               |
| `SVG`        | `svg` (SVG markup string), `width`, `height`                     |
| `Layout`     | `layout`, `direction`, `gap`, `justifyContent`, `alignItems`     |
| `Node`       | `position`, `rotation`, `scale`, `opacity` (grouping container)  |

All nodes inherit common props from Node/Layout/Shape:
- **Transform**: `x`, `y`, `position`, `rotation`, `scale`, `scaleX`, `scaleY`,
  `skew`, `skewX`, `skewY`
- **Appearance**: `opacity`, `zIndex`, `filters`, `shadowColor`, `shadowBlur`,
  `shadowOffset`
- **Layout**: `width`, `height`, `margin`, `padding`, `grow`, `shrink`, `basis`
- **Shape**: `fill`, `stroke`, `lineWidth`, `lineJoin`, `lineCap`, `lineDash`
- **Curve**: `start`, `end`, `startArrow`, `endArrow`, `arrowSize`

### Prop Value Encoding

| Revideo Type | JSON Encoding                          | Example                    |
| ------------ | -------------------------------------- | -------------------------- |
| `number`     | `number`                               | `48`                       |
| `string`     | `string`                               | `"Hello"`                  |
| `boolean`    | `boolean`                              | `true`                     |
| `Color`      | `string` (CSS color)                   | `"#ff0000"`, `"red"`       |
| `Vector2`    | `[x, y]`                               | `[100, -200]`              |
| `Spacing`    | `number` or `[all]` or `[v,h]` or `[t,r,b,l]` | `10`, `[10, 20]`  |
| `CodeRange`  | `[[startLine, startCol], [endLine, endCol]]` | `[[0,0],[2,10]]`    |

### Animation Timeline

Animations use sequential blocks. Each block runs its items in order.
Within a block, `"parallel"` groups run concurrently.

```json
{
  "timeline": [
    {
      "target": "title",
      "prop": "opacity",
      "to": 1,
      "duration": 0.6,
      "easing": "easeOutCubic"
    },
    {
      "parallel": [
        {
          "target": "title",
          "prop": "position.y",
          "to": -100,
          "duration": 0.8,
          "easing": "easeOutBack"
        },
        {
          "target": "subtitle",
          "prop": "opacity",
          "to": 1,
          "duration": 0.6,
          "easing": "easeInOutQuad"
        }
      ]
    },
    {
      "type": "wait",
      "duration": 2
    },
    {
      "target": "title",
      "prop": "opacity",
      "to": 0,
      "duration": 0.4
    }
  ]
}
```

### Animation Descriptor

```typescript
interface AnimationStep {
  target: string;        // node id
  prop: string;          // property name, dot notation for nested (e.g. "position.x")
  to: any;               // target value
  from?: any;            // optional start value (defaults to current)
  duration: number;      // seconds
  easing?: string;       // easing function name, defaults to "linear"
}

interface ParallelBlock {
  parallel: AnimationStep[];
}

interface WaitStep {
  type: "wait";
  duration: number;
}

type TimelineEntry = AnimationStep | ParallelBlock | WaitStep;
```

### Supported Easing Names

All Revideo easings mapped by string name:

```
linear, sin, cos,
easeInQuad, easeOutQuad, easeInOutQuad,
easeInCubic, easeOutCubic, easeInOutCubic,
easeInQuart, easeOutQuart, easeInOutQuart,
easeInQuint, easeOutQuint, easeInOutQuint,
easeInSine, easeOutSine, easeInOutSine,
easeInExpo, easeOutExpo, easeInOutExpo,
easeInCirc, easeOutCirc, easeInOutCirc,
easeInBack, easeOutBack, easeInOutBack,
easeInElastic, easeOutElastic, easeInOutElastic,
easeInBounce, easeOutBounce, easeInOutBounce
```

### Scene Transitions

```json
{
  "transition": {
    "type": "fade",
    "duration": 0.6
  }
}
```

| Type       | Extra Params                              |
| ---------- | ----------------------------------------- |
| `fade`     | `duration`                                |
| `slide`    | `direction` (`top`/`right`/`bottom`/`left`), `duration` |
| `zoomIn`   | `area` `[x, y, width, height]`, `duration` |
| `zoomOut`  | `area` `[x, y, width, height]`, `duration` |

---

## Package Structure

New package: `packages/scene-builder/`

```
packages/scene-builder/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Public API exports
│   ├── types.ts              # TypeScript interfaces for the JSON schema
│   ├── schema.ts             # Zod schema for validation
│   ├── node-factory.ts       # Maps type strings → Revideo node constructors
│   ├── prop-resolver.ts      # Converts JSON prop values → Revideo types
│   ├── easing-map.ts         # Maps easing name strings → easing functions
│   ├── transition-map.ts     # Maps transition descriptors → generator functions
│   ├── timeline-runner.ts    # Executes timeline entries as yield* sequences
│   └── scene-generator.ts    # The universal makeScene2D function
```

---

## Implementation Steps

### Phase 1: Core Types & Schema

**Files**: `types.ts`, `schema.ts`

1. Define TypeScript interfaces: `SceneDefinition`, `NodeDescriptor`,
   `AnimationStep`, `ParallelBlock`, `WaitStep`, `TransitionDescriptor`,
   `SceneSettings`
2. Create Zod validation schema matching these interfaces (clear error messages
   for invalid JSON)
3. Export a `validateSceneDefinition(json: unknown): SceneDefinition` function

### Phase 2: Node Factory

**Files**: `node-factory.ts`, `prop-resolver.ts`

1. Build a `nodeMap: Record<string, ComponentConstructor>` mapping all 22 node
   types (everything except Rive, View2D, and abstract bases)
2. `propResolver` handles type coercion:
   - `[x, y]` arrays → `new Vector2(x, y)`
   - CSS color strings → Revideo `Color` (or pass through, since Revideo
     accepts strings)
   - Spacing arrays → appropriate format
3. `createNode(descriptor: NodeDescriptor): Node` — instantiates a node with
   resolved props, recursively creates children
4. Build the full node tree from the `nodes` array and return a map of
   `id → nodeRef` for the timeline to target

### Phase 3: Easing & Transition Maps

**Files**: `easing-map.ts`, `transition-map.ts`

1. `easingMap: Record<string, TimingFunction>` — map all 34 easing names to
   imported functions from `@revideo/core`
2. `getEasing(name?: string): TimingFunction` — lookup with fallback to `linear`
3. `runTransition(descriptor: TransitionDescriptor): ThreadGenerator` — maps
   transition type + params to the appropriate `fadeTransition()`,
   `slideTransition()`, etc.

### Phase 4: Timeline Runner

**File**: `timeline-runner.ts`

The core animation engine. Given a timeline array and a node ref map:

```typescript
function* runTimeline(
  timeline: TimelineEntry[],
  nodeMap: Map<string, Reference<Node>>,
): ThreadGenerator {
  for (const entry of timeline) {
    if (isWait(entry)) {
      yield* waitFor(entry.duration);
    } else if (isParallel(entry)) {
      yield* all(
        ...entry.parallel.map(step => animateStep(step, nodeMap))
      );
    } else {
      yield* animateStep(entry, nodeMap);
    }
  }
}
```

`animateStep` resolves the target node, navigates the dot-path property, and
calls the signal's tween method:

```typescript
function* animateStep(step: AnimationStep, nodeMap) {
  const node = nodeMap.get(step.target);
  const signal = resolveProperty(node, step.prop);
  const easing = getEasing(step.easing);
  if (step.from !== undefined) signal(step.from);
  yield* signal(step.to, step.duration, easing);
}
```

Key detail: `resolveProperty("position.y", node)` must traverse to the nested
signal. Revideo signals for compound props (like `position`) have sub-signals
(`.x`, `.y`), so dot notation maps naturally.

### Phase 5: Scene Generator

**File**: `scene-generator.ts`

The universal scene factory:

```typescript
export function buildScene(sceneData: SceneDescriptor) {
  return makeScene2D(function* (view) {
    // 1. Apply scene-level background
    if (sceneData.background) {
      view.fill(sceneData.background);
    }

    // 2. Run transition if specified
    if (sceneData.transition) {
      yield* runTransition(sceneData.transition);
    }

    // 3. Build node tree, collect id→ref map
    const { rootNodes, refMap } = buildNodeTree(sceneData.nodes);
    for (const node of rootNodes) {
      view.add(node);
    }

    // 4. Execute timeline
    yield* runTimeline(sceneData.timeline, refMap);
  });
}
```

### Phase 6: Public API & Integration

**File**: `index.ts`

```typescript
// Main entry point
export function createScenesFromJSON(json: unknown): Scene[] {
  const definition = validateSceneDefinition(json);
  return definition.scenes.map(sceneData => buildScene(sceneData));
}

// For use with renderVideo()
export function createProjectFromJSON(json: unknown): {
  scenes: Scene[];
  settings: Partial<RenderVideoUserProjectSettings>;
}
```

Integration with the renderer:

```typescript
import { createProjectFromJSON } from '@revideo/scene-builder';
import { renderVideo } from '@revideo/renderer';

const json = await fetch('/api/scene').then(r => r.json());
const { scenes, settings } = createProjectFromJSON(json);

// Pass to renderVideo or use in a project file
```

### Phase 7: HTTP API Endpoint (Optional)

Add an endpoint to the standalone server or as a separate Express app:

```
POST /api/render
Content-Type: application/json

{ "settings": {...}, "scenes": [...] }

→ 200 { "videoUrl": "/output/render-abc123.mp4" }
```

This would:
1. Validate the JSON
2. Write a temporary project file that imports `createScenesFromJSON`
3. Call `renderVideo()` with pool support
4. Return the output path

---

## Example: Full JSON Scene

```json
{
  "settings": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "background": "#0f0f23"
  },
  "scenes": [
    {
      "id": "question",
      "duration": 8,
      "transition": { "type": "fade", "duration": 0.5 },
      "nodes": [
        {
          "id": "questionText",
          "type": "Txt",
          "props": {
            "text": "What is the capital of France?",
            "fontSize": 48,
            "fill": "#ffffff",
            "fontFamily": "Inter",
            "position": [0, -300],
            "opacity": 0
          }
        },
        {
          "id": "optionA",
          "type": "Rect",
          "props": {
            "width": 600,
            "height": 70,
            "radius": 12,
            "fill": "#1e293b",
            "stroke": "#334155",
            "lineWidth": 2,
            "position": [0, -80],
            "opacity": 0
          },
          "children": [
            {
              "type": "Txt",
              "props": {
                "text": "A) London",
                "fontSize": 28,
                "fill": "#e2e8f0"
              }
            }
          ]
        },
        {
          "id": "optionB",
          "type": "Rect",
          "props": {
            "width": 600,
            "height": 70,
            "radius": 12,
            "fill": "#1e293b",
            "stroke": "#334155",
            "lineWidth": 2,
            "position": [0, 10],
            "opacity": 0
          },
          "children": [
            {
              "type": "Txt",
              "props": {
                "text": "B) Paris",
                "fontSize": 28,
                "fill": "#e2e8f0"
              }
            }
          ]
        },
        {
          "id": "optionC",
          "type": "Rect",
          "props": {
            "width": 600,
            "height": 70,
            "radius": 12,
            "fill": "#1e293b",
            "stroke": "#334155",
            "lineWidth": 2,
            "position": [0, 100],
            "opacity": 0
          },
          "children": [
            {
              "type": "Txt",
              "props": {
                "text": "C) Berlin",
                "fontSize": 28,
                "fill": "#e2e8f0"
              }
            }
          ]
        },
        {
          "id": "highlight",
          "type": "Rect",
          "props": {
            "width": 620,
            "height": 80,
            "radius": 16,
            "fill": "rgba(0,0,0,0)",
            "stroke": "#22c55e",
            "lineWidth": 3,
            "position": [0, 10],
            "opacity": 0
          }
        }
      ],
      "timeline": [
        {
          "target": "questionText",
          "prop": "opacity",
          "to": 1,
          "duration": 0.6,
          "easing": "easeOutCubic"
        },
        {
          "type": "wait",
          "duration": 0.3
        },
        {
          "target": "optionA",
          "prop": "opacity",
          "to": 1,
          "duration": 0.4,
          "easing": "easeOutQuad"
        },
        {
          "target": "optionB",
          "prop": "opacity",
          "to": 1,
          "duration": 0.4,
          "easing": "easeOutQuad"
        },
        {
          "target": "optionC",
          "prop": "opacity",
          "to": 1,
          "duration": 0.4,
          "easing": "easeOutQuad"
        },
        {
          "type": "wait",
          "duration": 2
        },
        {
          "parallel": [
            {
              "target": "highlight",
              "prop": "opacity",
              "to": 1,
              "duration": 0.3,
              "easing": "easeOutCubic"
            },
            {
              "target": "optionB",
              "prop": "stroke",
              "to": "#22c55e",
              "duration": 0.4,
              "easing": "easeOutCubic"
            }
          ]
        },
        {
          "type": "wait",
          "duration": 2
        }
      ]
    }
  ]
}
```

---

## Dependencies

- `@revideo/core` — signals, tweening, easing, transitions, threading (`all`,
  `waitFor`)
- `@revideo/2d` — all node constructors, `makeScene2D`
- `zod` — JSON validation (new dependency, ~13KB gzipped)

## Open Questions

1. **How to deliver JSON to the scene at runtime?** Options:
   - Via `variables` (existing mechanism, passed through render settings)
   - Via a virtual module that the Vite plugin injects
   - Via `fetch()` from an API at scene load time
   Recommendation: Use `variables` — it's already supported and passed through
   the render pipeline.

2. **Media assets (images/videos)**: `src` props need URLs or file paths.
   The standalone server already serves assets. JSON would reference paths
   relative to the project or absolute URLs.

3. **Scene project file**: The renderer expects a `.ts` project file. We need
   either:
   - A built-in "json-project" entry point in the package
   - A generated temp file that imports `createScenesFromJSON`
   Recommendation: Ship a default project file in the package that reads JSON
   from variables.

4. **Code node themes & Latex rendering**: These depend on external resources
   (CodeMirror themes, MathJax). Need to ensure they work without explicit
   imports — they should, since `@revideo/2d` handles this internally.

## Estimated Scope

- Phase 1 (Types + Schema): ~150 lines
- Phase 2 (Node Factory): ~200 lines
- Phase 3 (Easing/Transition Maps): ~80 lines
- Phase 4 (Timeline Runner): ~120 lines
- Phase 5 (Scene Generator): ~60 lines
- Phase 6 (Public API): ~50 lines
- Phase 7 (HTTP endpoint): ~100 lines (optional)
- **Total**: ~660-760 lines of implementation code
