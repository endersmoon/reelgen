# Node Types Reference

All 21 node types supported by `@reelgen/scene-builder`. Every type accepts the [common props](#common-props) listed below in addition to its own specific props.

For prop value encoding (colors, vectors, spacing), see the [JSON Scene API — Prop Value Encoding](./json-scene-api.md#prop-value-encoding) section.

---

## Common Props

These props are available on **every** node type.

**Transform**

| Prop | Type | Description |
|---|---|---|
| `x` | number | Horizontal position |
| `y` | number | Vertical position |
| `position` | `[x, y]` | Shorthand for x and y |
| `rotation` | number | Rotation in degrees |
| `scale` | number | Uniform scale |
| `scaleX` | number | Horizontal scale |
| `scaleY` | number | Vertical scale |

**Appearance**

| Prop | Type | Description |
|---|---|---|
| `opacity` | number (0–1) | Transparency |
| `zIndex` | number | Paint order (higher = on top) |
| `shadowColor` | Color | Drop shadow color |
| `shadowBlur` | number | Drop shadow blur radius |
| `shadowOffset` | `[x, y]` | Drop shadow offset |

**Layout**

| Prop | Type | Description |
|---|---|---|
| `width` | number | Element width |
| `height` | number | Element height |
| `margin` | Spacing | Outer margin |
| `padding` | Spacing | Inner padding |

---

## Shapes

### Rect

Rectangle with optional rounded corners.

| Prop | Type | Description |
|---|---|---|
| `width` | number | Width in pixels |
| `height` | number | Height in pixels |
| `radius` | number | Corner radius |
| `fill` | Color | Fill color |
| `stroke` | Color | Border color |
| `lineWidth` | number | Border width |

```json
{
  "type": "Rect",
  "props": { "width": 400, "height": 80, "radius": 12, "fill": "#3b82f6", "opacity": 0 },
  "children": [
    { "type": "Txt", "props": { "text": "Button", "fontSize": 24, "fill": "#fff" } }
  ]
}
```

---

### Circle

Circle or arc. Use `startAngle`/`endAngle` to draw partial arcs.

| Prop | Type | Description |
|---|---|---|
| `width` | number | Diameter |
| `height` | number | Diameter (set equal to width for a circle) |
| `startAngle` | number | Arc start in degrees (default 0) |
| `endAngle` | number | Arc end in degrees (default 360) |
| `fill` | Color | Fill color |
| `stroke` | Color | Border color |

```json
{ "type": "Circle", "props": { "width": 120, "height": 120, "fill": "#f43f5e" } }
```

Pie wedge:
```json
{ "type": "Circle", "props": { "width": 200, "height": 200, "startAngle": 0, "endAngle": 120, "fill": "#22c55e", "stroke": "#fff", "lineWidth": 2 } }
```

---

### Polygon

Regular polygon with N sides.

| Prop | Type | Description |
|---|---|---|
| `sides` | number | Number of sides (3 = triangle, 6 = hexagon, …) |
| `radius` | number | Circumradius (center to vertex) |
| `fill` | Color | Fill color |
| `stroke` | Color | Border color |

```json
{ "type": "Polygon", "props": { "sides": 6, "radius": 80, "fill": "#8b5cf6" } }
```

---

### Grid

Regular grid of lines, useful as a background element.

| Prop | Type | Description |
|---|---|---|
| `spacing` | number | Distance between grid lines |
| `width` | number | Total width |
| `height` | number | Total height |
| `stroke` | Color | Line color |

```json
{ "type": "Grid", "props": { "spacing": 80, "width": 1920, "height": 1080, "stroke": "rgba(255,255,255,0.1)" } }
```

---

## Lines & Curves

### Line

Polyline connecting a list of points. Set `radius` to round the corners.

| Prop | Type | Description |
|---|---|---|
| `points` | `[x,y][]` | Array of `[x, y]` control points |
| `radius` | number | Corner rounding radius |
| `stroke` | Color | Line color |
| `lineWidth` | number | Line thickness |

```json
{ "type": "Line", "props": { "points": [[-200, 0], [0, -100], [200, 0]], "stroke": "#60a5fa", "lineWidth": 4 } }
```

---

### Ray

Straight line segment between two points.

| Prop | Type | Description |
|---|---|---|
| `from` | `[x, y]` | Start point |
| `to` | `[x, y]` | End point |
| `stroke` | Color | Line color |
| `lineWidth` | number | Line thickness |

```json
{ "type": "Ray", "props": { "from": [-300, 0], "to": [300, 0], "stroke": "#94a3b8", "lineWidth": 2 } }
```

---

### Path

Arbitrary shape defined by an SVG path string.

| Prop | Type | Description |
|---|---|---|
| `data` | string | SVG path `d` attribute value |
| `fill` | Color | Fill color |
| `stroke` | Color | Border color |

```json
{ "type": "Path", "props": { "data": "M 0 -100 L 100 100 L -100 100 Z", "fill": "#f59e0b" } }
```

---

### Spline

Smooth curve through control points. For sharp corners or custom handles, use [Knot](#knot) children.

| Prop | Type | Description |
|---|---|---|
| `points` | `[x,y][]` | Control points |
| `smoothness` | number | Curve smoothness (0–1, default 0.5) |
| `stroke` | Color | Line color |

```json
{ "type": "Spline", "props": { "points": [[-300, 100], [-100, -100], [100, -100], [300, 100]], "stroke": "#34d399", "lineWidth": 3 } }
```

---

### CubicBezier

Cubic Bézier curve with explicit control points.

| Prop | Type | Description |
|---|---|---|
| `p0` | `[x, y]` | Start point |
| `p1` | `[x, y]` | First control point |
| `p2` | `[x, y]` | Second control point |
| `p3` | `[x, y]` | End point |
| `stroke` | Color | Line color |

```json
{ "type": "CubicBezier", "props": { "p0": [-200, 0], "p1": [-100, -200], "p2": [100, 200], "p3": [200, 0], "stroke": "#a78bfa", "lineWidth": 3 } }
```

---

### QuadBezier

Quadratic Bézier curve with one control point.

| Prop | Type | Description |
|---|---|---|
| `p0` | `[x, y]` | Start point |
| `p1` | `[x, y]` | Control point |
| `p2` | `[x, y]` | End point |
| `stroke` | Color | Line color |

```json
{ "type": "QuadBezier", "props": { "p0": [-200, 100], "p1": [0, -200], "p2": [200, 100], "stroke": "#f472b6", "lineWidth": 3 } }
```

---

### Knot

Control point used inside a `Spline` as a child node. Gives you explicit handle control.

| Prop | Type | Description |
|---|---|---|
| `startHandle` | `[x, y]` | Incoming tangent handle offset |
| `endHandle` | `[x, y]` | Outgoing tangent handle offset |
| `auto` | number | Automatic handle strength (0–1) |

```json
{
  "type": "Spline",
  "props": { "stroke": "#34d399", "lineWidth": 3 },
  "children": [
    { "type": "Knot", "props": { "auto": 0.5 } },
    { "type": "Knot", "props": { "startHandle": [-50, -80], "endHandle": [50, -80] } },
    { "type": "Knot", "props": { "auto": 0.5 } }
  ]
}
```

---

## Text & Code

### Txt

Text node. Supports multi-line text via `\n`.

| Prop | Type | Description |
|---|---|---|
| `text` | string | Text content |
| `fontSize` | number | Font size in pixels |
| `fontFamily` | string | Font family name |
| `fontWeight` | number | Font weight (400, 700, etc.) |
| `fill` | Color | Text color |
| `textAlign` | string | `"left"` \| `"center"` \| `"right"` |

```json
{ "type": "Txt", "props": { "text": "Hello World", "fontSize": 64, "fontWeight": 700, "fill": "#ffffff" } }
```

---

### Latex

LaTeX math expression rendered via MathJax.

| Prop | Type | Description |
|---|---|---|
| `tex` | string | LaTeX expression |
| `fill` | Color | Rendered color |
| `width` | number | Container width |
| `height` | number | Container height |

```json
{ "type": "Latex", "props": { "tex": "E = mc^2", "fill": "#ffffff", "width": 400, "height": 100 } }
```

---

### Code

Syntax-highlighted code block via CodeMirror.

| Prop | Type | Description |
|---|---|---|
| `language` | string | Language for highlighting (e.g. `"python"`, `"typescript"`) |
| `code` | string | Source code string |
| `theme` | string | Color theme name |
| `fontSize` | number | Font size |

```json
{
  "type": "Code",
  "props": {
    "language": "python",
    "code": "def greet(name):\n    return f'Hello, {name}'",
    "fontSize": 28
  }
}
```

---

## Media

### Img

Image node. `src` can be a URL or a local file path.

| Prop | Type | Description |
|---|---|---|
| `src` | string | Image URL or path |
| `width` | number | Display width |
| `height` | number | Display height |
| `alpha` | number | Opacity multiplier (0–1) |
| `smoothing` | boolean | Enable bilinear smoothing (default true) |

```json
{ "type": "Img", "props": { "src": "https://example.com/logo.png", "width": 200, "height": 200 } }
```

---

### Video

Video clip node.

| Prop | Type | Description |
|---|---|---|
| `src` | string | Video URL or path |
| `width` | number | Display width |
| `height` | number | Display height |
| `loop` | boolean | Loop the video |
| `playbackRate` | number | Playback speed (default 1) |

```json
{ "type": "Video", "props": { "src": "./clip.mp4", "width": 1280, "height": 720 } }
```

---

### Audio

Audio track with no visual output. Use to add background music or voiceover.

| Prop | Type | Description |
|---|---|---|
| `src` | string | Audio URL or path |
| `loop` | boolean | Loop the audio |
| `playbackRate` | number | Playback speed |

```json
{ "type": "Audio", "props": { "src": "./music.mp3", "loop": true } }
```

---

## Icons & SVG

### Icon

Iconify icon. Find icon names at [icones.js.org](https://icones.js.org/).

| Prop | Type | Description |
|---|---|---|
| `icon` | string | Iconify icon name (e.g. `"mdi:heart"`, `"heroicons:star"`) |
| `color` | Color | Icon color |
| `width` | number | Icon width |
| `height` | number | Icon height |

```json
{ "type": "Icon", "props": { "icon": "mdi:check-circle", "color": "#22c55e", "width": 64, "height": 64 } }
```

---

### SVG

Raw SVG markup rendered as a node.

| Prop | Type | Description |
|---|---|---|
| `svg` | string | Raw SVG markup string |
| `width` | number | Container width |
| `height` | number | Container height |

```json
{
  "type": "SVG",
  "props": {
    "svg": "<svg viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' fill='#f43f5e'/></svg>",
    "width": 200,
    "height": 200
  }
}
```

---

## Containers

### Layout

Flexbox-style layout container. Set `layout: true` to activate flexbox behaviour on children.

| Prop | Type | Description |
|---|---|---|
| `layout` | boolean | Enable flexbox layout |
| `direction` | string | `"row"` \| `"column"` (default `"row"`) |
| `gap` | number | Space between children |
| `justifyContent` | string | `"start"` \| `"center"` \| `"end"` \| `"space-between"` |
| `alignItems` | string | `"start"` \| `"center"` \| `"end"` |

```json
{
  "type": "Layout",
  "props": { "layout": true, "direction": "row", "gap": 16, "alignItems": "center" },
  "children": [
    { "type": "Icon",  "props": { "icon": "mdi:star", "color": "#fbbf24", "width": 32, "height": 32 } },
    { "type": "Txt",   "props": { "text": "Featured", "fontSize": 24, "fill": "#ffffff" } }
  ]
}
```

---

### Node

Generic grouping container with no visual output. Useful for transforming a group of nodes together.

| Prop | Type | Description |
|---|---|---|
| `position` | `[x, y]` | Group position |
| `rotation` | number | Group rotation in degrees |
| `scale` | number | Group scale |
| `opacity` | number | Group opacity |

```json
{
  "id": "group",
  "type": "Node",
  "props": { "position": [0, 100], "opacity": 0 },
  "children": [
    { "type": "Rect", "props": { "width": 300, "height": 60, "fill": "#1e293b" } },
    { "type": "Txt",  "props": { "text": "Grouped", "fontSize": 24, "fill": "#fff" } }
  ]
}
```

Animating the group moves/fades all children at once:
```json
{ "target": "group", "prop": "opacity", "to": 1, "duration": 0.5 }
```
