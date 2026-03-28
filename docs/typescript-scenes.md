# TypeScript Scenes

Reelgen scenes are TypeScript generator functions. The generator maps directly to the video timeline: each `yield*` advances the playhead. This page covers the full animation API.

For a code-free alternative, see the [JSON Scene API](./json-scene-api.md).

---

## Scene Anatomy

```tsx
/** @jsxImportSource @reelgen/2d/lib */
import { makeScene2D, Rect } from '@reelgen/2d';
import { waitFor } from '@reelgen/core';

export default makeScene2D('intro', function* (view) {
  // `view` is the root node. Add children to it.
  const box = new Rect({ width: 400, height: 200, fill: '#3b82f6', opacity: 0 });
  view.add(box);

  // yield* — run this tween and WAIT for it to finish before continuing
  yield* box.opacity(1, 0.6);

  // waitFor — pause for N seconds
  yield* waitFor(2);

  yield* box.opacity(0, 0.4);
});
```

**`yield` vs `yield*`:**
- `yield*` — runs the animation and **waits** for it to finish (sequencing)
- `yield` — fires the animation **without waiting** (fire-and-forget)

Most of the time you want `yield*`.

---

## Adding Nodes

**Constructor style:**
```tsx
const box = new Rect({ width: 300, height: 80, fill: '#3b82f6' });
view.add(box);
```

**JSX style** (requires the `@jsxImportSource` pragma):
```tsx
/** @jsxImportSource @reelgen/2d/lib */

view.add(
  <Rect width={300} height={80} fill="#3b82f6">
    <Txt text="Hello" fontSize={24} fill="#fff" />
  </Rect>
);
```

Both styles are equivalent. JSX is more natural for nested hierarchies; constructor style is more common for programmatically created nodes.

---

## Animating Properties

All node properties are **signals** — callable as getter and setter:

```ts
// Tween to a value over time
yield* box.opacity(1, 0.6);            // opacity → 1 over 0.6s
yield* box.opacity(1, 0.6, easeOutCubic); // with easing

// Set immediately (no animation)
box.opacity(0.5);

// Read current value
const current = box.opacity();
```

The tween method signature is: `node.prop(targetValue, duration?, easing?)`

---

## Refs

Use refs to access nodes created via JSX after `yield`:

```tsx
import { createRef } from '@reelgen/core';

const box = createRef<Rect>();

view.add(<Rect ref={box} width={300} height={80} fill="#3b82f6" opacity={0} />);

// Now animate it
yield* box().opacity(1, 0.6);     // note: box() — call it to dereference
yield* box().position.x(200, 0.5);
```

---

## Flow Helpers

Import from `@reelgen/core`.

### `waitFor(seconds)`

```ts
yield* waitFor(1.5);
```

### `all(...tasks)` — concurrent

Runs all tasks at the same time. Waits for the **longest** to finish.

```ts
yield* all(
  box.opacity(1, 0.6),
  title.opacity(1, 0.8),
  box.x(200, 0.6),
);
```

### `sequence(delay, ...tasks)` — staggered

Starts each task `delay` seconds after the previous one begins. All overlap.

```ts
// Each card starts 0.1s after the previous, but they can run concurrently
yield* sequence(0.1,
  cards[0].opacity(1, 0.4),
  cards[1].opacity(1, 0.4),
  cards[2].opacity(1, 0.4),
);
```

### `loop(count, factory)` — repeat

```ts
// Pulse 3 times
yield* loop(3, () => all(
  dot.scale(1.4, 0.3),
  dot.scale(1.0, 0.3),
));

// Infinite loop (use spawn to not block the timeline)
spawn(loop(() => all(
  cursor.opacity(0, 0.5),
  cursor.opacity(1, 0.5),
)));
```

### `spawn(task)` — fire-and-forget

Runs a task concurrently without blocking the timeline. The spawned task continues even after the current `yield*` resolves.

```ts
// Start a background pulsing animation, then continue with other steps
spawn(loop(() => all(
  glow.opacity(0.3, 0.8),
  glow.opacity(1.0, 0.8),
)));

yield* waitFor(0.5);
yield* title.opacity(1, 0.6); // runs while glow pulses in background
```

---

## Signals

Signals are reactive values with automatic dependency tracking.

```ts
import { createSignal } from '@reelgen/core';

const count = createSignal(0);

// Read
console.log(count()); // 0

// Write
count(42);

// Computed signal — auto-updates when count changes
import { createComputed } from '@reelgen/core';
const doubled = createComputed(() => count() * 2);
```

In node props, you can pass a signal directly — the node will re-render whenever the signal changes:

```ts
const fill = createSignal('#3b82f6');
view.add(<Rect width={200} height={200} fill={fill} />);

// Later — the rect will visually update on the next frame
fill('#f43f5e');
```

---

## Scene Variables

Variables let you pass dynamic data into a scene at render time — useful for data-driven videos (charts, personalized content, etc.).

**In the scene:**
```ts
import { useScene } from '@reelgen/core';

export default makeScene2D('chart', function* (view) {
  const vars = useScene().variables;

  // Second arg is the default value
  const title = vars.get('title', 'My Chart');
  const value = vars.get('percentage', 75);

  view.add(<Txt text={title()} fontSize={48} fill="#fff" />);
  // ...
});
```

**In `project.ts`:**
```ts
export default makeProject({
  name: 'chart',
  scenes: [chartScene],
  variables: {
    title: 'Q4 Results',
    percentage: 92,
  },
});
```

**At render time:**
```ts
import { renderVideo } from '@reelgen/renderer';

await renderVideo({
  projectFile: './src/project.ts',
  variables: {
    title: 'Q1 Results',
    percentage: 68,
  },
  settings: { outFile: 'q1.mp4' },
});
```

---

## Project Configuration

`project.ts` wires scenes and settings together:

```ts
import { Color, makeProject, Vector2 } from '@reelgen/core';
import intro from './intro';
import outro from './outro';

export default makeProject({
  name: 'my-video',

  // Scenes play in order
  scenes: [intro, outro],

  // Default variable values (overridable at render time)
  variables: {
    title: 'Default Title',
  },

  settings: {
    shared: {
      background: new Color('#0f172a'),
      size: new Vector2(1920, 1080),
    },
    preview: {
      fps: 60,
      resolutionScale: 1,
    },
    rendering: {
      fps: 60,
      resolutionScale: 1,
      colorSpace: 'srgb',
      exporter: {
        name: '@reelgen/core/wasm',  // built-in MP4 exporter
      },
    },
  },
});
```

---

## Combining Flow Helpers — Staggered Reveal

A common pattern: reveal a list of items with a staggered entrance, then fade everything out together.

```tsx
/** @jsxImportSource @reelgen/2d/lib */
import { makeScene2D, Rect, Txt } from '@reelgen/2d';
import { all, sequence, waitFor } from '@reelgen/core';

const items = ['Design', 'Build', 'Ship'];

export default makeScene2D('steps', function* (view) {
  // Create cards, all starting invisible
  const cards = items.map((label, i) => {
    const card = new Rect({ width: 300, height: 80, radius: 12, fill: '#1e293b',
      position: [0, (i - 1) * 100], opacity: 0 });
    card.add(new Txt({ text: label, fontSize: 28, fill: '#e2e8f0' }));
    view.add(card);
    return card;
  });

  // Stagger them in — each starts 0.15s after the previous
  yield* sequence(0.15, ...cards.map(c => c.opacity(1, 0.4)));

  yield* waitFor(2);

  // Fade all out together
  yield* all(...cards.map(c => c.opacity(0, 0.3)));
});
```
