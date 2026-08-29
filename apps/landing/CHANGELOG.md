# @lootlog/landing

## 1.0.9

### Patch Changes

- a9b615c: Namespace static assets and manage the shared development and production
  traffic-splitter code from the repository. Keep the Workers independently
  deployable, promote the production splitter before frontend artifacts, and
  verify public CSS and JavaScript before closing the rollback boundary.
- Updated dependencies [3e53f4e]
- Updated dependencies [25ff0b8]
- Updated dependencies [a78ba7b]
- Updated dependencies [a49b02c]
  - @lootlog/ui@3.1.0

## 1.0.8

### Patch Changes

- f0a1338: Update runtime dependencies across applications and shared packages.
- 6a19cb8: Migrate the static Landing and Docs applications from Next.js to TanStack Start, including prerendered Cloudflare artifacts and deployment configuration.
  Rename Landing's public build configuration to the Vite-native `VITE_ADDON_URL` and `VITE_AUTH_SERVICE_URL` contract across local, Cloudflare, and GitHub environments.
  Preserve route-specific Docs metadata and Landing canonical URLs, keep redirect copy in translation resources, and serve responsive Landing screenshots.
  Deploy Docs changes from `main` to an isolated development Assets Worker before production release approval.
- Updated dependencies [f0a1338]
- Updated dependencies [af13bc9]
  - @lootlog/ui@3.0.2

## 1.0.7

### Patch Changes

- Updated dependencies [008ef3f]
  - @lootlog/ui@3.0.1

## 1.0.6

### Patch Changes

- da456cf: Migrate the shared UI primitives and their consumers from Radix UI and Vaul to Base UI while preserving the existing visual design.
- 419ba43: Align the public product, privacy, terms, and trust copy with Lootlog's canonical product model.
- Updated dependencies [da456cf]
- Updated dependencies [eaecbd3]
  - @lootlog/ui@3.0.0

## 1.0.5

### Patch Changes

- Updated dependencies [d782374]
  - @lootlog/ui@2.0.2

## 1.0.4

### Patch Changes

- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.
- Updated dependencies [25406a5]
  - @lootlog/ui@2.0.1

## 1.0.3

### Patch Changes

- Updated dependencies [9096829]
  - @lootlog/ui@2.0.0

## 1.0.2

### Patch Changes

- c1ee3a0: Introduce the Resp Orbit brand mark across browser icons, landing metadata, the web app shell, and userscript metadata.
- c1ee3a0: Redesign and polish the landing page with a flat Guild Broadcast illustration system, current product screenshots, player-focused Polish copy, clan terminology, and refined responsive interactions.

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
- Updated dependencies [785632e]
  - @lootlog/ui@1.0.1
