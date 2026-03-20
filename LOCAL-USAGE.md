# Using Local Revideo Packages

This fork of Revideo is used by downstream projects (e.g., `quizkaro`) via local
tarballs stored in `~/revideo-tarballs/`.

## Building and Packing

After making changes to any revideo package:

```bash
# 1. Build all packages
npx lerna run build

# 2. Pack tarballs (overwrites previous ones)
for pkg in core 2d vite-plugin ffmpeg renderer ui telemetry player player-react cli; do
  cd packages/$pkg && npm pack --pack-destination ~/revideo-tarballs && cd ../..
done
```

## Downstream Projects Using These Tarballs

- **quizkaro** (`/Users/FA071872/quizkaro`)

Each project's `package.json` references the tarballs via `file:` protocol:

```json
"@revideo/core": "file:../revideo-tarballs/revideo-core-0.10.4.tgz"
```

After re-packing, run `npm install` in each downstream project to pick up the
changes.

## Quick Update Script

Run this from the revideo-main root to rebuild, repack, and update quizkaro in
one go:

```bash
npx lerna run build && \
for pkg in core 2d vite-plugin ffmpeg renderer ui telemetry player player-react cli; do
  cd packages/$pkg && npm pack --pack-destination ~/revideo-tarballs && cd ../..
done && \
cd /Users/FA071872/quizkaro && npm install
```

## Notes

- Tarballs live at `/Users/FA071872/revideo-tarballs/`
- The `@revideo/telemetry` package must be included — it's a transitive
  dependency of `@revideo/ffmpeg` and `@revideo/vite-plugin`
- Downstream projects must use Vite 6+ to be compatible with these packages
