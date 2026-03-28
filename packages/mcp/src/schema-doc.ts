/**
 * Human-readable + LLM-readable reference for the Reelgen JSON scene schema.
 * Exposed as an MCP resource at reelgen://schema.
 */
export const SCHEMA_DOC = `
# Reelgen JSON Scene Schema

Use this reference to build valid scene definitions for the \`render_scene\` and \`validate_scene\` tools.

---

## Top-Level Structure

\`\`\`json
{
  "settings": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "background": "#000000"
  },
  "scenes": [ ...SceneDescriptor ]
}
\`\`\`

\`settings\` is optional. All fields inside it are optional too.

---

## SceneDescriptor

\`\`\`json
{
  "id": "my-scene",
  "background": "#1a1a2e",
  "transition": { "type": "fade", "duration": 0.6 },
  "nodes": [ ...NodeDescriptor ],
  "timeline": [ ...TimelineEntry ]
}
\`\`\`

| Field        | Type                | Required | Description                                  |
|--------------|---------------------|----------|----------------------------------------------|
| id           | string              | yes      | Unique scene identifier                      |
| background   | CSS color string    | no       | Scene background color                       |
| transition   | TransitionDescriptor| no       | Transition played at the start of this scene |
| nodes        | NodeDescriptor[]    | yes      | Nodes to add to the scene (can be empty)     |
| timeline     | TimelineEntry[]     | yes      | Animation sequence (can be empty)            |

---

## NodeDescriptor

\`\`\`json
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
\`\`\`

| Field    | Type             | Required | Description                                            |
|----------|------------------|----------|--------------------------------------------------------|
| id       | string           | no       | Used to target this node in the timeline               |
| type     | string           | yes      | One of the supported node types (see below)            |
| props    | object           | no       | Node properties                                        |
| children | NodeDescriptor[] | no       | Child nodes (for containers like Rect, Layout, Node)   |

---

## Supported Node Types

| Type        | Key Props                                                     |
|-------------|---------------------------------------------------------------|
| Rect        | width, height, radius, fill, stroke, lineWidth                |
| Circle      | width, height, startAngle, endAngle, fill, stroke             |
| Txt         | text, fontSize, fontFamily, fontWeight, fill, textAlign       |
| Img         | src, width, height, alpha, smoothing                          |
| Video       | src, width, height, loop, playbackRate                        |
| Audio       | src, loop, playbackRate                                       |
| Line        | points, radius, stroke, lineWidth                             |
| Polygon     | sides, radius, fill, stroke                                   |
| Grid        | spacing, width, height, stroke                                |
| Ray         | from, to, stroke, lineWidth                                   |
| Path        | data (SVG path string), fill, stroke                          |
| Spline      | points, smoothness, stroke                                    |
| CubicBezier | p0, p1, p2, p3, stroke                                        |
| QuadBezier  | p0, p1, p2, stroke                                            |
| Knot        | startHandle, endHandle, auto                                  |
| Latex       | tex, fill, width, height                                      |
| Code        | language, code, theme, fontSize                               |
| Icon        | icon, color, width, height                                    |
| SVG         | svg (SVG markup string), width, height                        |
| Layout      | layout, direction, gap, justifyContent, alignItems            |
| Node        | position, rotation, scale, opacity (grouping container)       |

### Common props (all node types)

**Transform:** x, y, position, rotation, scale, scaleX, scaleY
**Appearance:** opacity, zIndex, shadowColor, shadowBlur, shadowOffset
**Layout:** width, height, margin, padding
**Shape:** fill, stroke, lineWidth, lineJoin, lineCap

---

## Prop Value Encoding

| Reelgen Type | JSON encoding                                     | Example               |
|--------------|---------------------------------------------------|-----------------------|
| number       | number                                            | 48                    |
| string       | string                                            | "Hello"               |
| boolean      | boolean                                           | true                  |
| Color        | CSS color string                                  | "#ff0000", "red"      |
| Vector2      | [x, y] number tuple                               | [100, -200]           |
| Spacing      | number OR [v, h] OR [top, right, bottom, left]    | 10, [10, 20], [4,8,4,8] |

---

## Timeline

The timeline is an array of sequential entries. Each entry runs after the previous one finishes.
To run entries at the same time, wrap them in a \`parallel\` block.

### AnimationStep

Tweens a single property on a node.

\`\`\`json
{
  "target": "title",
  "prop": "opacity",
  "to": 1,
  "from": 0,
  "duration": 0.6,
  "easing": "easeOutCubic"
}
\`\`\`

| Field    | Type   | Required | Description                                          |
|----------|--------|----------|------------------------------------------------------|
| target   | string | yes      | The \`id\` of the node to animate                      |
| prop     | string | yes      | Property name. Use dot notation for nested: "position.x" |
| to       | any    | yes      | Target value (same encoding as node props)           |
| from     | any    | no       | Start value — if omitted, current value is used      |
| duration | number | yes      | Duration in seconds                                  |
| easing   | string | no       | Easing name (see below). Defaults to "linear"        |

### ParallelBlock

Run multiple animations concurrently. All finish before the next entry starts.

\`\`\`json
{
  "parallel": [
    { "target": "a", "prop": "opacity", "to": 1, "duration": 0.4 },
    { "target": "b", "prop": "x", "to": 200, "duration": 0.6 }
  ]
}
\`\`\`

### WaitStep

Pause for a given duration.

\`\`\`json
{ "type": "wait", "duration": 2 }
\`\`\`

---

## Easing Names

\`\`\`
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
\`\`\`

---

## Transitions

Played at the start of a scene. Only one transition per scene.

\`\`\`json
{ "type": "fade",   "duration": 0.6 }
{ "type": "slide",  "duration": 0.5, "direction": "left" }
{ "type": "zoomIn", "duration": 0.6, "area": [x, y, width, height] }
{ "type": "zoomOut","duration": 0.6, "area": [x, y, width, height] }
\`\`\`

Slide directions: \`"top"\` | \`"right"\` | \`"bottom"\` | \`"left"\`

---

## Full Example

\`\`\`json
{
  "settings": { "width": 1920, "height": 1080, "fps": 30, "background": "#0f0f23" },
  "scenes": [
    {
      "id": "intro",
      "background": "#1a1a2e",
      "transition": { "type": "fade", "duration": 0.5 },
      "nodes": [
        {
          "id": "title",
          "type": "Txt",
          "props": {
            "text": "Hello World",
            "fontSize": 72,
            "fill": "#ffffff",
            "position": [0, -100],
            "opacity": 0
          }
        },
        {
          "id": "box",
          "type": "Rect",
          "props": {
            "width": 500, "height": 80, "radius": 12,
            "fill": "#3b82f6",
            "position": [0, 50],
            "opacity": 0
          },
          "children": [
            {
              "type": "Txt",
              "props": { "text": "Get started", "fontSize": 28, "fill": "#ffffff" }
            }
          ]
        }
      ],
      "timeline": [
        { "target": "title", "prop": "opacity", "to": 1, "duration": 0.6, "easing": "easeOutCubic" },
        { "type": "wait", "duration": 0.3 },
        {
          "parallel": [
            { "target": "box", "prop": "opacity", "to": 1, "duration": 0.4 },
            { "target": "title", "prop": "position.y", "to": -120, "duration": 0.4, "easing": "easeOutQuad" }
          ]
        },
        { "type": "wait", "duration": 2 },
        {
          "parallel": [
            { "target": "title", "prop": "opacity", "to": 0, "duration": 0.3 },
            { "target": "box",   "prop": "opacity", "to": 0, "duration": 0.3 }
          ]
        }
      ]
    }
  ]
}
\`\`\`
`.trim();
