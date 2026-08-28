# @lootlog/typescript-config

Shared TypeScript configuration presets for the Lootlog monorepo.

## Overview

- Provides reusable `tsconfig` bases for Node-style services, Vite apps, and React libraries.
- Provides reusable `tsconfig` bases for NestJS apps.
- Keeps compiler defaults consistent across workspaces without duplicating JSON config.

## Available Presets

- `base.json`
- `nestjs.json`
- `react-library.json`
- `vite.json`

## Usage

Example:

```json
{
  "extends": "@lootlog/typescript-config/vite.json"
}
```

## Notes

- This workspace does not define build scripts; it only stores shared JSON config files.
- Update these presets carefully because they affect multiple apps and packages at once.
