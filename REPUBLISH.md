# Publishing as a New Package

Guide for republishing this fork under your own npm scope.

## Prerequisites

1. **Create an npm org** at https://www.npmjs.com/org/create (free for public
   packages). For example: `@myorg`.
2. **Log in** to npm: `npm login`
3. Ensure the project builds cleanly: `npm ci && npx lerna run build`

## Step 1: Rename the Scope

Replace `@revideo/` with `@myorg/` across the entire codebase. This affects:

- **51 references** in `package.json` files (package names + internal
  dependencies)
- **~456 references** in TypeScript source files (imports)
- **Generated `.d.ts` files** in `lib/`, `dist/`, and `.rollup.cache/`
  directories

Run from the repo root:

```bash
# Rename in package.json files (names + dependencies)
find packages -name 'package.json' -not -path '*/node_modules/*' \
  -exec sed -i '' 's/@revideo\//@myorg\//g' {} +

# Rename in TypeScript source files
find packages -name '*.ts' -o -name '*.tsx' | \
  grep -v node_modules | \
  xargs sed -i '' 's/@revideo\//@myorg\//g'

# Rename in generated declaration files
find packages -name '*.d.ts' -not -path '*/node_modules/*' \
  -exec sed -i '' 's/@revideo\//@myorg\//g' {} +

# Rename in vite configs and other JS configs
find packages -name '*.mjs' -o -name '*.cjs' | \
  grep -v node_modules | \
  xargs sed -i '' 's/@revideo\//@myorg\//g'

# Rename in root eslint config
sed -i '' 's/@revideo\//@myorg\//g' eslint.config.mjs

# Rename in lerna.json if needed
sed -i '' 's/@revideo\//@myorg\//g' lerna.json
```

### Additional files to check manually

- `packages/ui/vite.config.ts` — has `@revideo/ui` and `@revideo/2d/editor` in
  resolve aliases
- `packages/player/vite.config.ts` — has `@revideo/core` in rollup externals
- `packages/vite-plugin/src/main.ts` — references `@revideo/` in virtual
  modules
- `packages/create/` — template files reference `@revideo/` packages that
  end-users install
- `packages/cli/src/revideo.d.ts` — module declarations

## Step 2: Set the Version

```bash
# Set all packages to your starting version
npx lerna version 1.0.0 --no-push --no-git-tag-version --yes --force-publish
```

## Step 3: Rebuild

```bash
# Clean old build artifacts that may contain @revideo references
find packages -type d -name lib -not -path '*/node_modules/*' -exec rm -rf {} + 2>/dev/null
find packages -type d -name dist -not -path '*/node_modules/*' -exec rm -rf {} + 2>/dev/null
find packages -type d -name '.rollup.cache' -exec rm -rf {} + 2>/dev/null

# Reinstall and rebuild
npm install
npx lerna run build
```

## Step 4: Verify

```bash
# Check no @revideo references remain in source
grep -r "@revideo/" packages --include='*.ts' --include='*.tsx' \
  --include='*.json' --exclude-dir=node_modules | head -20

# Run tests
npm run core:test
npm run 2d:test

# Dry-run publish to see what would be published
npx lerna publish from-package --dry-run --yes
```

## Step 5: Publish

```bash
# Publish all public packages
npx lerna publish from-package --yes
```

If your org is new and packages don't exist yet, you may need:

```bash
npx lerna publish from-package --yes -- --access public
```

## Step 6: Update Your Projects

In your existing projects, replace dependencies:

```json
{
  "@myorg/core": "^1.0.0",
  "@myorg/2d": "^1.0.0",
  "@myorg/vite-plugin": "^1.0.0",
  "@myorg/ffmpeg": "^1.0.0",
  "@myorg/renderer": "^1.0.0"
}
```

Then update all imports:

```bash
find src -name '*.ts' -o -name '*.tsx' | \
  xargs sed -i '' 's/@revideo\//@myorg\//g'
```

## Notes

- The `@revideo/e2e`, `@revideo/template`, and `@revideo/examples` packages are
  private and won't be published.
- The `create` package (`@myorg/create`) lets users scaffold projects with
  `npm init @myorg@latest` — update the templates inside it to reference your
  scope.
- Consider adding a `repository` field in each `package.json` pointing to your
  fork's GitHub URL.
- If you want to publish to GitHub Packages instead of npm, add to each
  `package.json`:
  ```json
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
  ```
