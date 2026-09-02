# @lootlog/cli

Monorepo CLI utilities for local Lootlog development.

## Overview

- Contains source commands for environment generation, RabbitMQ event publishing, and local data seeding.
- Exposes a `lootlog` bin from the built package and a workspace script for environment generation.
- Keeps command-specific documentation close to the implementation under `src/commands/`.

## Command Groups

- `env` generates `.env` files from discovered `.env.example` templates.
- `events` publishes test events to RabbitMQ for local workflows.
- `seed` scrapes source data, generates fixtures, and seeds development databases.

## Development

Run the currently exposed workspace script from the monorepo root:

```bash
bun run --filter=@lootlog/cli env:generate
```

Useful variants:

- `bun run --filter=@lootlog/cli env:generate -- --interactive`
- `bun run --filter=@lootlog/cli env:generate -- --skip-existing`
- `bun run --filter=@lootlog/cli env:generate -- --force`

## Related Docs

- [Seed command docs](./src/commands/seed/README.md)
- [Event fixture reference](./src/commands/events/EVENTS.md)
- [Mock data notes](./src/mocks/data/README.md)

## Notes

- Not every source command is exposed as a workspace script yet; additional command groups live under `src/commands/`.
- The package root is intended for developer tooling inside this monorepo, not as a standalone published CLI.
