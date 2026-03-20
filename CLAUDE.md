# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Build all packages (required after code changes)
npx lerna run build
npx lerna run build --skip-nx-cache  # bypass Nx cache (ensures fresh build)

# Dev server (uses packages/template as the test project)
npm run template:dev

# Render a video
npm run template:render

# Run tests
npm run core:test          # core package unit tests
npm run 2d:test            # 2d package unit tests
npm run e2e:test           # end-to-end tests (Puppeteer + jest-image-snapshot)

# Linting & formatting
npx eslint "**/*.ts?(x)"  # check all TypeScript
npx eslint --fix "**/*.ts?(x)"  # auto-fix lint issues
npx prettier --check .    # check formatting
npx prettier --write .    # auto-fix formatting
```

Individual packages can be built/dev'd via `npm run <package>:<command>` (e.g.,
`npm run core:build`, `npm run ui:dev`).

## Architecture

Revideo is a **TypeScript video animation framework** organized as a Lerna
monorepo with npm workspaces. All packages live under `packages/`.

### Core packages

- **core** — Animation engine: generator-based scene sequencing, signal-based
  reactivity, tweening, threading, media handling, and export logic.
- **2d** — Default 2D renderer with nodes (shapes, text, images, video, LaTeX
  via MathJax, Rive animations, code blocks via CodeMirror).
- **renderer** — Headless rendering via Puppeteer. Launches a browser, runs
  animations, captures frames.
- **ffmpeg** — FFmpeg utilities for video export. Communicates with the browser
  via WebSockets.
- **vite-plugin** — Vite plugin + standalone backend server.
  `vite-plugin/src/partials/` contains Vite-specific sub-plugins (`.meta` file
  handling, settings, editor, WebGL, assets HMR).
  `vite-plugin/src/standalone-server.ts` is a standalone HTTP + WebSocket server
  that handles all non-Vite backend concerns (FFmpeg bridge, image/video export,
  WASM serving, Rive). It starts on a random port and communicates with the
  browser via `window.__REVIDEO_BACKEND_PORT__`.

### UI & player packages

- **ui** — Visual editor built with Preact + @preact/signals.
- **player** — Vanilla JS custom element for previewing animations in browsers.
- **player-react** — React wrapper around the player component.

### Tooling packages

- **cli** — CLI (`revideo serve`, `revideo editor`) built with Commander +
  Express.
- **create** — Project scaffolding (`npm init @revideo@latest`).
- **template** — Example project used for local development and testing changes.
- **e2e** — E2E test suite.

### Key architectural patterns

- **Generator-based scenes**: Animations are defined as TypeScript generator
  functions that yield to sequence steps.
- **Signal-based reactivity**: Properties use a reactive signal system with
  automatic dependency tracking (similar to SolidJS signals).
- **Threadable decorators**: `@threadable` decorator enables generator functions
  in scene definitions.
- **Plugin system**: Extensible via plugins registered with the core runtime.
- **Standalone backend server**: Pure backend logic (FFmpeg, export, WASM) runs
  in a standalone HTTP+WS server (`standalone-server.ts`), decoupled from Vite.
  Client code uses `backend-client.ts` (`backendFetch()`, `BackendWebSocket`)
  to communicate with it.

## Code Style & Conventions

- **Conventional Commits** required: `fix:`, `feat(scope):`, `chore:`, etc.
  Enforced by commitlint + husky.
- **Type imports**: Must use `import type` for type-only imports (enforced by
  ESLint `consistent-type-imports`).
- **Naming**: camelCase default, PascalCase for types/enums/components,
  UPPER*CASE for global constants. Unused parameters must be prefixed with `*`.
- **Explicit member accessibility**: Class members must have explicit
  `public`/`private`/`protected`.
- **Prettier**: 80-char lines, single quotes, trailing commas, no bracket
  spacing, organized imports.
- **TSDoc**: `tsdoc/syntax` rule is enforced as an error.
- **`require-yield` is disabled**: Generator functions don't need to yield
  (common in animation scenes).

## Node Version

Node 20+ required (see `.nvmrc`).
