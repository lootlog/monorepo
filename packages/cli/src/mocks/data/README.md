# Mock Data Directory

This directory stores scraped and generated data files used for database seeding.

## Files

- `npcs.json` - NPCs scraped from margoworld.pl
- `items.json` - Items scraped from margoworld.pl (gitignored - large file)
- `players.json` - Generated mock players (gitignored)
- `loots.json` - Generated loots (gitignored)

## Generating Data

Use the CLI seed commands to generate these files:

```bash
# Scrape NPCs and items
pnpm seed:scrape

# Generate players
pnpm seed:generate:players
```

## Usage

These files are automatically loaded by the seeding system when you run:

```bash
pnpm seed:setup
# or
pnpm seed
```

For more information, see the [Seed CLI documentation](../../../../packages/cli/src/commands/seed/README.md).
