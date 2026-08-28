---
"@lootlog/docs": patch
"@lootlog/landing": patch
"@lootlog/typescript-config": patch
---

Migrate the static Landing and Docs applications from Next.js to TanStack Start, including prerendered Cloudflare artifacts and deployment configuration.
Rename Landing's public build configuration to the Vite-native `VITE_ADDON_URL` and `VITE_AUTH_SERVICE_URL` contract across local, Cloudflare, and GitHub environments.
Preserve route-specific Docs metadata and Landing canonical URLs, keep redirect copy in translation resources, and serve responsive Landing screenshots.
Deploy Docs changes from `main` to an isolated development Assets Worker before production release approval.
