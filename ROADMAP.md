# Reelgen Roadmap

> Reelgen is a fork of Revideo (itself a fork of Motion Canvas) — a TypeScript video animation framework using generator-based scenes, signal-based reactivity, headless Puppeteer rendering, and FFmpeg export.

---

## Current State Assessment

### Strengths
- Clean standalone backend/Vite separation (`packages/vite-plugin/src/standalone-server.ts`)
- Rich 2D primitives: 31 node types covering shapes, text, media, code, LaTeX, Rive
- Solid signal system + generator-based sequencing (intuitive imperative model)
- Well-tested core (204 core tests, 52 2D tests)
- Modern stack (Vite 6, TS 5.7, Express 5, Puppeteer 24, 0 vulnerabilities)
- Headless-first API design — superior for backend/AI workflows vs Remotion

### Weaknesses
- Plugin system partially marked for deletion throughout (`DefaultPlugin.ts`, core TODOs)
- JSON scene builder: specification exists (`JSON-SCENE-PLAN.md`) but not implemented
- No cloud/distributed rendering (Remotion Lambda equivalent)
- E2E test coverage is snapshot-only, behavioral coverage minimal
- CSS isolation incomplete (`View2D` leaks styles across player instances)
- No performance profiling or metrics built in
- Limited codec support (H.264/MP3 only)
- No vertical video / social media format presets

---

## Near-Term Improvements

### 1. JSON/API Scene Builder — `@reelgen/scene-builder`
**Priority: High** | Spec already written in `JSON-SCENE-PLAN.md`

A new package that interprets a JSON payload and drives the engine — enabling completely codeless video generation. Unlocks AI agent workflows (LLM → JSON → video) without requiring TypeScript knowledge.

**Files:** `packages/scene-builder/src/index.ts`, schema validator, node interpreter map

---

### 2. Plugin System Cleanup
**Priority: High** | Multiple TODOs in core point to this

- `packages/core/src/app/Project.ts` — remove plugin boilerplate
- `packages/core/src/plugin/DefaultPlugin.ts` — fold into core directly
- `packages/2d/src/lib/decorators/signal.ts` — fix property metadata inheritance (FIXME)

---

### 3. Parallel / Distributed Rendering
**Priority: High** | Remotion Lambda is their biggest competitive advantage

`browser-pool.ts` and `render-pool.ts` already exist in `packages/renderer`. Add:
- Scene range slicing API (render frames N–M)
- Worker pool coordinator
- S3/GCS output sink
- Simple self-hosted distributed render server (no vendor lock-in)

**Files:** `packages/renderer/src/browser-pool.ts`, `packages/renderer/src/render-video.ts`

---

### 4. Expanded Codec & Format Support
**Priority: Medium**

Current: H.264/MP3 only. Add via FFmpeg:
- WebM/VP9 (browser-native, smaller for web)
- GIF export (highly requested in Remotion community)
- ProRes (professional post-production handoff)
- Vertical format presets: 9:16 (TikTok/Reels/Shorts), 1:1 (Instagram)

**Files:** `packages/ffmpeg/src/settings.ts`, `packages/renderer/src/validate-settings.ts`

---

### 5. Subtitle/Caption Support
**Priority: Medium** | Revideo upstream has this, Remotion recently added it

- SRT/VTT subtitle track support in `packages/ffmpeg/src/merge-media.ts`
- `<Subtitle>` node in `packages/2d`
- Optional Whisper.cpp integration for auto-transcription

---

### 6. CSS Isolation Fix
**Priority: Medium**

`packages/2d/src/lib/components/View2D.ts` leaks `font-feature-settings` across player instances. Scope font CSS to individual player via Shadow DOM or CSS custom properties.

---

### 7. Framework Player Wrappers
**Priority: Medium**

`@reelgen/player-react` exists but is thin. Add:
- Vue wrapper (`@reelgen/player-vue`)
- Svelte wrapper (`@reelgen/player-svelte`)
- Embeddable iframe player with postMessage API

---

### 8. Test Coverage Expansion
**Priority: Medium**

- 2D component tests: currently ~40%, target 80%
- CLI integration tests for `revideo serve` / `revideo editor`
- Behavioral E2E tests beyond image snapshots
- Performance regression benchmarks

---

## Future Roadmap

### Phase 1: AI-First Workflow (Q2 2026)
- **JSON Scene Builder** shipped — LLMs can generate scenes directly
- **MCP server** (`@reelgen/mcp`) — Claude/GPT can call render API as a tool
- **Template library** — pre-built scenes for common use cases (lower-thirds, transitions, data viz)
- **Prompt-to-video** reference implementation using Claude API + scene builder

### Phase 2: Scale & Cloud (Q3 2026)
- **Distributed rendering** — chunk-based parallel rendering with self-hosted coordinator
- **Cloud adapters** — thin wrappers for AWS Lambda, GCP Cloud Run, Fly.io
- **Render queue** — job queue with status API for async rendering at scale
- **S3/GCS output sinks**

### Phase 3: Visual Editor Enhancement (Q4 2026)
- **Layer-based timeline** — multi-track drag-and-drop (Remotion charges for this — OSS opportunity)
- **Node inspector** — click-to-select hierarchy in editor viewport (TODO already in `EditorPreview.tsx`)
- **Variable bindings UI** — visually bind scene variables to inputs
- **Asset library panel** — drag-and-drop images/videos/audio into scenes

### Phase 4: Ecosystem (Q1 2027)
- **Component marketplace** — shareable `@reelgen/components-*` packages
- **3D support** via Three.js integration (new `@reelgen/3d` package)
- **WebGL renderer** as alternative to Canvas 2D for GPU-accelerated effects
- **Shader library** — surface the experimental shader system with documentation

---

## Key Differentiators vs Remotion

| Area | Remotion | Reelgen Opportunity |
|------|----------|---------------------|
| Paradigm | Declarative React | Imperative generators — more natural for programmatic/AI use |
| Cloud rendering | Lambda (vendor lock-in) | Self-hosted distributed rendering — no AWS required |
| AI integration | None native | JSON scene builder → LLM-native from day one |
| Timeline editor | Paid ($) | OSS layer-based timeline |
| Backend API | Complex setup | Already headless-first, cleaner API surface |
| Codec flexibility | MP4/WebM | Add GIF, ProRes, vertical presets |
