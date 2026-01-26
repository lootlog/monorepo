# typescript-config

Shared TypeScript configurations for the monorepo.

## Configs

| Config | Use Case |
|--------|----------|
| `base.json` | Default foundation (ES2022, strict mode) |
| `vite.json` | Vite frontend apps (React JSX, bundler resolution) |
| `react-library.json` | React component libraries |
| `hono.json` | Hono backend services |
| `nextjs.json` | Next.js applications |

## Usage

```json
{
  "extends": "@lootlog/typescript-config/vite.json"
}
```

## Key Settings

All configs enable: strict mode, incremental builds, declaration maps, `noUncheckedIndexedAccess`.
