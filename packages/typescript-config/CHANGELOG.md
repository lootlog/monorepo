# @lootlog/typescript-config

## 1.0.2

### Patch Changes

- 7742f4f: Remove unused Hono-specific helpers, configuration, documentation, and dependency declarations.
- 6a19cb8: Migrate the static Landing and Docs applications from Next.js to TanStack Start, including prerendered Cloudflare artifacts and deployment configuration.
  Rename Landing's public build configuration to the Vite-native `VITE_ADDON_URL` and `VITE_AUTH_SERVICE_URL` contract across local, Cloudflare, and GitHub environments.
  Preserve route-specific Docs metadata and Landing canonical URLs, keep redirect copy in translation resources, and serve responsive Landing screenshots.
  Deploy Docs changes from `main` to an isolated development Assets Worker before production release approval.

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
