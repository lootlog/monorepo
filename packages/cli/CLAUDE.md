# CLI

Development tooling for environment management, database seeding, and event testing.

## Commands

### Environment
```bash
pnpm env:generate   # Generate .env files from templates
```

### Seeding
```bash
pnpm lootlog seed scrape:items      # Scrape items from margoworld.pl
pnpm lootlog seed scrape:npcs       # Scrape NPCs
pnpm lootlog seed generate:players  # Generate mock players
pnpm lootlog seed run               # Seed database
pnpm lootlog seed setup             # Full setup (scrape + generate + seed)
```

### Events
```bash
pnpm lootlog events publish         # Publish test events to RabbitMQ
```

## Key Files

- `src/commands/env/` - Environment generation
- `src/commands/seed/` - Seeding orchestration, generators, scrapers
- `src/commands/events/` - RabbitMQ event publishing
- `src/events/fixtures/` - Predefined event payloads

## Dependencies

- zx for shell scripting
- @clack/prompts for interactive CLI
- amqplib for RabbitMQ
