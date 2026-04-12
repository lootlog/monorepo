# Themes Module

`apps/web/src/themes` is the ownership boundary for custom theme behavior in `apps/web`.

- `catalog.ts`: supported theme ids and appearance metadata.
- `resolver.ts`: family checks, `cat-random` resolution, root class application.
- `adapters.tsx`: theme-aware wrappers for shared app chrome.
- `cat/`: cat-only assets and components.
- `rukia/`: rukia-only effects and interactive frames.

Contract split:

- `packages/ui` owns CSS tokens and theme classes.
- `apps/web` owns custom React behavior, animations, overlays, and theme-specific composition.

Call sites should prefer the adapters or `useThemeMeta()` over raw string checks.
