# @lootlog/cli

Monorepo CLI utilities for local Lootlog development.

## Overview

- Contains commands for environment generation, RabbitMQ event publishing, and local API data seeding.
- Exposes a `lootlog` bin from the built package and a workspace script for environment generation.
- Keeps command-specific documentation close to the implementation under `src/commands/`.

## Command Groups

- `env` generates `.env` files from discovered `.env.example` templates.
- `events` publishes test events to RabbitMQ for local workflows.
- `seed` delegates to `apps/api/scripts/seed`, where the database-specific implementation lives with the API.

## Development

Run the currently exposed workspace script from the monorepo root:

```bash
pnpm --filter @lootlog/cli env:generate
```

Useful variants:

- `pnpm --filter @lootlog/cli env:generate -- --interactive`
- `pnpm --filter @lootlog/cli env:generate -- --skip-existing`
- `pnpm --filter @lootlog/cli env:generate -- --force`

## Related Docs

- [Seed command docs](../../apps/api/scripts/seed/README.md)
- [Event fixture reference](./src/commands/events/EVENTS.md)

## Notes

- Not every command is exposed as a package script; the root workspace scripts are the supported seed entry points.
- The package root is intended for developer tooling inside this monorepo, not as a standalone published CLI.
