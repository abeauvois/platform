# Troubleshouting

## Platform-cli Landing Page

Common issues and solutions for this monorepo.

### Vite/esbuild "The service was stopped" Error

**Symptoms:**

```
failed to load config from /path/to/vite.config.ts
error when starting dev server:
Error: The service was stopped
    at /path/to/node_modules/esbuild/lib/main.js:949:34
```

**Cause:**
Corrupted or outdated esbuild binary, often occurring after:

- Adding new workspace packages
- Switching Node/Bun versions
- Incomplete installs

**Solution:**

```bash
bun install --force
```

This reinstalls all dependencies including the esbuild binary.

## TypeScript "Cannot find name 'document'" in CI Typecheck

**Symptoms:**

```
error TS2584: Cannot find name 'document'. Do you need to change your target library?
error TS2304: Cannot find name 'HTMLButtonElement'.
error TS2304: Cannot find name 'HTMLElement'.
```

These errors appear in `bun run ci:typecheck` but not when running tsc directly in the package directory.

**Cause:**
When using TypeScript path aliases (in `tsconfig.json` paths) to import from workspace packages, TypeScript follows the source files and type-checks them using the importing project's tsconfig settings.

Example: If `apps/cli/tsconfig.json` has:
```json
{
  "compilerOptions": {
    "lib": ["ES2022"],  // No DOM!
    "paths": {
      "@abeauvois/platform-browser-scraper": ["../../packages/browser-scraper/src/index.ts"]
    }
  }
}
```

And `packages/browser-scraper` uses DOM APIs (like `document`, `HTMLElement`) in Puppeteer `page.evaluate()` callbacks, TypeScript will try to type-check those files with the CLI's lib settings (no DOM), causing errors.

**Solution:**
Add `"DOM"` to the lib array of any project that imports packages using DOM types:

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM"]
  }
}
```

**References:**
- [Bun tsconfig resolution in monorepos](https://github.com/oven-sh/bun/issues/12262)

## when Notion not finding a database

It can be a problem of permissions.

Just add you DB to your [integration](https://developers.notion.com/docs/create-a-notion-integration#give-your-integration-page-permissions)
