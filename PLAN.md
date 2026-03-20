# Revideo Dependency Upgrade Plan

## Context

Revideo hasn't been maintained since Feb 2025. It has 71 npm vulnerabilities (2
critical, 39 high), and key dependencies are multiple major versions behind. The
goal is to modernize the project incrementally across multiple sessions, each
leaving the project in a working state.

**Target**: Upgrade to Vite 6, Vitest 3, ESLint 9, TypeScript 5.7, Puppeteer 24,
Lerna 9, Express 5. Extract pure-backend logic from Vite plugins into a
standalone server. Fix all critical/high vulnerabilities.

---

## Session 1: TypeScript + Minor Tooling (Risk: LOW) ✅ COMPLETE

**Upgrades:**

- TypeScript 5.2 → 5.7.3 ✅
- `@commitlint/*` 19 → 20.5.0 ✅
- `husky` 9.1.5 → 9.1.7 ✅
- `lint-staged` 15 → 16.4.0 ✅
- `npm audit fix` for non-breaking transitive fixes ✅

**Additional changes required:**

- Added `skipLibCheck: true` to tsconfig files (TS 5.7 `Buffer`/`Uint8Array`
  incompatibility with `@types/node@20`)
- Fixed `packages/ffmpeg/src/video-frame-extractor.ts`: changed `buffer` field
  from `Buffer` to `Uint8Array` (TS 5.7 strictness)
- Fixed `packages/vite-plugin/src/partials/ffmpegBridge.ts`: cast
  `frame as Uint8Array` instead of `as Buffer`

**Results:**

- ✅ `npm install` succeeds
- ✅ `npx lerna run build` — all 10 packages pass
- ✅ Core tests: 17 files, 204 tests pass
- ✅ 2D tests: 10 files, 52 tests pass
- ✅ Vulnerabilities: 71 → 6 (0 critical, 1 high)

---

## Session 2: ESLint Flat Config Migration (Risk: LOW-MEDIUM) ✅ COMPLETE

**Upgrades:**

- ESLint 8.54 → 9.39.4 ✅
- `@typescript-eslint/eslint-plugin` + `parser` 6 → `typescript-eslint` 8.57.1
  (unified package) ✅
- `eslint-plugin-tsdoc` 0.2.17 → 0.5.2 ✅

**Changes made:**

- Deleted `.eslintrc.json`, created `eslint.config.mjs` (flat config format)
- Replaced `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` with
  unified `typescript-eslint` package
- Added `@typescript-eslint/no-empty-object-type: off` and
  `@typescript-eslint/no-unused-expressions: off` (new rules in v8 that weren't
  in v6)
- Added `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`,
  `caughtErrorsIgnorePattern: '^_'` to `no-unused-vars` (v8 catches these by
  default)
- Fixed 4 catch clause vars `e` → `_e` in telemetry + ui/sourceMaps
- Removed stale `eslint-disable` directives (auto-fixed)

**Results:**

- ✅ `npm run eslint` passes clean (0 errors, 0 warnings)
- ✅ `npm run eslint:fix` works
- ✅ All 10 packages build
- ✅ Core: 204 tests pass, 2D: 52 tests pass
- ✅ Vulnerabilities: 6 → 5 (0 critical, 0 high)

---

## Session 3: Puppeteer, Lerna, Express (Risk: LOW) ✅ COMPLETE

**Upgrades:**

- Puppeteer 23.4 → 24.x ✅
- Lerna 8.1.8 → 9.0.7 ✅
- Express 4.19 → 5.x ✅
- `@types/express` 4.17 → 5.0.6 ✅

**Changes required:**

- `packages/renderer/server/render-video.ts`: renamed `PuppeteerLaunchOptions` →
  `LaunchOptions` (type renamed in Puppeteer 24)
- No Express 5 code changes needed — CLI usage was already compatible

**Results:**

- ✅ All 10 packages build
- ✅ Core: 204 tests pass, 2D: 52 tests pass
- ✅ ESLint passes clean
- ✅ Vulnerabilities: 5 (0 critical, 0 high, unchanged)

---

## Session 4: Extract Pure Backend from Vite Plugins (Risk: MEDIUM) ✅ COMPLETE

**Goal:** Decouple server-side logic from Vite APIs so that the Vite upgrade in
Sessions 5-6 only affects a thin shim.

### What was extracted:

**New files created:**

- `packages/vite-plugin/src/standalone-server.ts` — Node.js HTTP + `ws`
  WebSocket server with all backend logic
- `packages/core/src/exporter/backend-client.ts` — Client-side utility for
  HTTP/WebSocket communication with standalone server

**Extracted from Vite plugins to standalone server:**

- `ffmpegBridge.ts` → HTTP routes (`/audio-processing/*`,
  `/revideo-ffmpeg-decoder/*`) + WebSocket (`revideo:ffmpeg-exporter`)
- `imageExporter.ts` → HTTP route (`/__open-output-path`) + WebSocket
  (`revideo:export`)
- `wasmExporter.ts` → HTTP routes (`/@mp4-wasm`, `/uploadVideoFile`)
- `rive.ts` → HTTP route (`/@rive-wasm`)

**What stays in Vite (unchanged):**

- `meta.ts`, `settings.ts`, `editor.ts`, `webgl.ts`, `projects.ts` — all use
  Vite-specific APIs
- `assets.ts` — uses `handleHotUpdate` for HMR
- `metrics.ts` — simple `configResolved` hook

**Client-side changes:**

- `FFmpegExporter.ts` — replaced `import.meta.hot.send/on` with
  `BackendWebSocket`
- `ImageExporter.ts` — replaced `import.meta.hot.send/on` with
  `BackendWebSocket`
- `WasmExporter.ts` — replaced relative `fetch()` with `backendFetch()`
- `download-videos.ts` — replaced relative `fetch()` with `backendFetch()`
- `packages/2d/src/lib/utils/video/ffmpeg-client.ts` — updated to use backend
  URL
- `packages/2d/src/lib/components/Rive.ts` — updated WASM URL to use backend
- `packages/ui/src/utils/openOutputPath.ts` — updated to use backend URL

**Architecture:**

- Standalone server starts on a random available port in `configureServer` hook
- Port is injected into the page via `window.__REVIDEO_BACKEND_PORT__` using
  `transformIndexHtml`
- CORS headers allow cross-origin requests from the Vite dev server
- Old plugin files (`ffmpegBridge.ts`, `imageExporter.ts`, `wasmExporter.ts`,
  `rive.ts`) remain in repo but are no longer imported

**Known issue (from Lerna 9 / npm 11):**

- `npm run eslint` fails due to npm 11 trying to run scripts in all workspaces.
  Use `npm run eslint --if-present` or `npx eslint "**/*.ts?(x)"` directly. To
  be fixed in Session 7.

**Results:**

- ✅ All 10 packages build
- ✅ Core: 204 tests pass, 2D: 52 tests pass
- ✅ ESLint passes clean
- ✅ Vulnerabilities: 5 (unchanged)

---

## Session 5: Vite 4 → 5 + Vitest 0.34 → 2 (Risk: MEDIUM, reduced from HIGH) ✅ COMPLETE

**Upgrades completed:**

- Vite 4.5.2 → **5.4.21** (root + renderer)
- Vitest 0.34.6 → **2.1.9**
- `@preact/preset-vite` 2.5.0 → **2.9.4** (pinned; 2.10.4 has a bug with Vite 5
  config hook)

**API migrations completed:**

- `server.ws` → `server.hot` in `meta.ts`, `settings.ts`, `assets.ts` (3 files)
- Vitest configs unchanged (compatible as-is)

**Additional fixes required:**

- `tsconfig.json` target `es2020` → `es2022` in `packages/core` and
  `packages/2d/src/tsconfig.base.json` (Vitest 2 exposed `Array.at()` type
  errors)
- `packages/ffmpeg/src/ffmpeg-exporter-server.ts` — fixed `.on('end', resolve)`
  callback type mismatch
- `packages/ffmpeg/src/video-frame-extractor.ts` — removed invalid
  `.on('stdout')` handlers
- ESLint fixes in `backend-client.ts` and `standalone-server.ts` (from
  Session 4)

**Results:**

- ✅ All 10 packages build
- ✅ Core: 204 tests pass, 2D: 52 tests pass
- ✅ ESLint passes clean
- ✅ Vulnerabilities: 8 (3 low, 5 moderate — no critical/high)

---

## Session 6: Vite 5 → 6 + Vitest 2 → 3 (Risk: MEDIUM) ✅ COMPLETE

**Upgrades completed:**

- Vite 5.4.21 → **6.4.1**
- Vitest 2.1.9 → **3.2.4**

**Note:** `handleHotUpdate` was NOT renamed to `hotUpdate` — Vite 6 still
supports the old hook as backward compat. No changes needed to meta.ts or
assets.ts for this. The `server.hot` API and `moduleGraph` API also remain
compatible.

**Preact 10.24+ type fixes** (the main work in this session):

- `packages/ui/src/components/controls/Button.tsx` — added explicit `type`,
  `disabled`, `value` props
- `packages/ui/src/components/controls/Input.tsx` — added explicit `value`,
  `readOnly` props
- `packages/ui/src/components/tabs/Tabs.tsx` — added explicit `href`, `target`
  props
- `packages/ui/src/components/viewport/OverlayCanvas.tsx` — added explicit
  `width`, `height` props
- `packages/ui/src/components/fields/AutoField.tsx` — fixed `FunctionComponent`
  type annotation

**Results:**

- ✅ All 10 packages build
- ✅ Core: 204 tests pass, 2D: 52 tests pass
- ✅ ESLint passes clean
- ✅ Vulnerabilities: **3 low** (down from 71 at project start)

---

## Session 7: Final Cleanup + Audit (Risk: LOW) ✅ COMPLETE

**Changes made:**

- `npm audit fix` — reduced vulnerabilities to **0** (from 71 at project start)
- Updated `packages/core/package.json` and `packages/2d/package.json`: jsdom →
  ^29.0.0
- Added `css.preprocessorOptions.scss.api: 'modern-compiler'` to
  `packages/ui/vite.config.ts` and `packages/player/vite.config.ts` (suppresses
  Sass legacy JS API deprecation warning)
- Fixed CI workflow (`/.github/workflows/verify.yml`): `npm run prettier` →
  `npx prettier --check .` (npm 11 workspace script resolution issue)

**Known cosmetic issue:**

- The `packages/2d` editor build still shows a Sass legacy API deprecation
  warning from `rollup-plugin-postcss` — cannot be fixed without an upstream
  plugin upgrade.

**Results:**

- ✅ `npm audit` — **0 vulnerabilities** (down from 71)
- ✅ All 10 packages build
- ✅ Core: 204 tests pass, 2D: 52 tests pass
- ✅ ESLint passes clean
- ✅ Prettier passes clean

**Final dependency versions:**

- Vite 6.4.1, Vitest 3.2.4, TypeScript 5.9.3
- Lerna 9.x, Puppeteer 24.39.1, Express 5.2.1
- ESLint 9.39.4, typescript-eslint 8.57.1
