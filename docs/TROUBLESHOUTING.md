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

## when Notion not finding a database

It can be a problem of permissions.

Just add you DB to your [integration](https://developers.notion.com/docs/create-a-notion-integration#give-your-integration-page-permissions)
