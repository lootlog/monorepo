# @lootlog/docs

## 1.0.7

### Patch Changes

- 0c6ae17: Correct workspace dependency ownership, standardize quality and database command interfaces, and align package build metadata with production artifacts.

## 1.0.6

### Patch Changes

- a9b615c: Namespace static assets and manage the shared development and production
  traffic-splitter code from the repository. Keep the Workers independently
  deployable, promote the production splitter before frontend artifacts, and
  verify public CSS and JavaScript before closing the rollback boundary.

## 1.0.5

### Patch Changes

- f0a1338: Update runtime dependencies across applications and shared packages.
- 6a19cb8: Migrate the static Landing and Docs applications from Next.js to TanStack Start, including prerendered Cloudflare artifacts and deployment configuration.
  Rename Landing's public build configuration to the Vite-native `VITE_ADDON_URL` and `VITE_AUTH_SERVICE_URL` contract across local, Cloudflare, and GitHub environments.
  Preserve route-specific Docs metadata and Landing canonical URLs, keep redirect copy in translation resources, and serve responsive Landing screenshots.
  Deploy Docs changes from `main` to an isolated development Assets Worker before production release approval.

## 1.0.4

### Patch Changes

- 419ba43: Clarify the relationship between Lootlog organizations, Discord servers, and Margonem clans in the user guide.

## 1.0.3

### Patch Changes

- 25406a5: Upgrade workspace compilation and type-checking to TypeScript 7.0.2 while
  preserving the Nest CLI compiler integration through an isolated compatibility
  bridge for its legacy programmatic API.

## 1.0.2

### Patch Changes

- c95e8ff: Redesign the documentation with the Lootlog Night Ink reading experience, static search, revised navigation, and clearer onboarding content.

  Keep generated battle panel audit pages compatible with the documentation page title layout.

## 1.0.1

### Patch Changes

- 785632e: Initialize automated version tracking for all workspace packages.
