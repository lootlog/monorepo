# Database Seeding System

Comprehensive TypeScript-based seeding system for the Lootlog API with data scraping, generation, and database population capabilities.

> **Location**: This seeding system is part of `@lootlog/cli` package for centralized CLI tooling.

## Features

- **Web Scraping**: Fetch real NPCs and items data from margoworld.pl
  - Smart caching: automatically skips re-downloading existing files
  - Force mode available for fresh data
- **Data Generation**: Generate realistic mock data for players, guilds, loots, and timers
- **Database Seeding**: Populate PostgreSQL database using Prisma
- **CLI Interface**: Easy-to-use command-line tools
- **TypeScript**: Fully typed with better error handling
- **Modular Design**: Reusable generators and scrapers
- **Performance Optimized**: Rate limiting and intelligent caching

## Project Structure

```
packages/cli/src/commands/seed/
├── cli.ts                      # CLI entry point
├── config.ts                   # Configuration constants
├── index.ts                    # Module exports
├── seed.ts                     # Main seeding logic
├── scrapers/
│   ├── items-scraper.ts       # Scrapes items from margoworld.pl
│   └── npcs-scraper.ts        # Scrapes NPCs from margoworld.pl
└── generators/
    ├── players-generator.ts   # Generates mock players
    ├── loot-generator.ts      # Generates loot payloads
    └── guild-generator.ts     # Generates guilds with roles and members
```

## Installation

The necessary dependencies are already included in `package.json`:

```bash
pnpm install
```

## Usage

### Quick Start - Complete Setup

Run everything in one command (scrape data, generate players, seed database):

```bash
pnpm seed:setup
```

Options:

- `--guilds <number>`: Number of guilds to create (default: 5)
- `--loots <number>`: Number of loots to create (default: 100)
- `--players <number>`: Number of players to generate (default: 1000)
- `--skip-scrape`: Skip scraping and use existing data files

Example:

```bash
pnpm seed:setup --guilds 10 --loots 500 --players 2000
```

### Individual Commands

#### 1. Scrape Data from Margoworld.pl

**Scrape both items and NPCs:**

```bash
pnpm seed:scrape
```

**Scrape items only:**

```bash
pnpm seed:scrape:items
```

**Scrape NPCs only:**

```bash
pnpm seed:scrape:npcs
```

**Force re-scraping (ignores existing files):**

```bash
pnpm seed:scrape -- --force
pnpm seed:scrape:items -- --force
pnpm seed:scrape:npcs -- --force
```

> **Note**: By default, scrapers will skip downloading if the file already exists. Use `--force` flag to re-download.

#### 2. Generate Mock Players

```bash
pnpm seed:generate:players
```

This generates 1000 random players with names, professions, and levels.

#### 3. Seed Database

```bash
pnpm seed
```

Options:

- `--guilds <number>`: Number of guilds (default: 5)
- `--loots <number>`: Number of loots (default: 100)
- `--players <number>`: Number of players (default: 1000)
- `--no-clean`: Don't clean database before seeding

Example:

```bash
pnpm seed --guilds 10 --loots 200 --no-clean
```

### Advanced CLI Usage

You can also run the CLI directly with tsx:

```bash
# Show help
tsx packages/cli/src/commands/seed/cli.ts --help

# Run specific command
tsx packages/cli/src/commands/seed/cli.ts scrape:items -o ./custom/path/items.json
tsx packages/cli/src/commands/seed/cli.ts scrape:items -o ./custom/path/items.json --force
tsx packages/cli/src/commands/seed/cli.ts generate:players -c 5000
tsx packages/cli/src/commands/seed/cli.ts seed --guilds 3 --loots 50

# Setup with force re-scraping
tsx packages/cli/src/commands/seed/cli.ts setup --force
```

## What Gets Seeded

### Guilds

- Guild metadata (name, icon, owner, vanity URL)
- Roles with permissions and level ranges
- Members with role assignments

**Default**: 5 guilds
**Roles per guild**: 3-8 roles
**Members per guild**: 10-50 members

### Loots

- Loot items from scraped data
- Associated NPCs and players
- Loot submissions linking members to loots
- World and location information

**Default**: 100 loots
**Items per loot**: 1-10 (FIGHT) or 1-3 (DIALOG)
**Players per loot**: 1-10 (FIGHT) or 1-3 (DIALOG)

### Timers

- NPC spawn timers
- Associated with guilds and members
- Respawn time ranges

**Default**: 10 timers per guild

### Players

- Mock player data with random names
- Professions, levels, and stats

**Default**: 1000 players

## Configuration

Edit `packages/cli/src/commands/seed/config.ts` to customize:

### Scraper Configuration

- Base URLs and endpoints
- NPC types to scrape
- Professions and worlds

### Seed Configuration

- Guild creation settings
- Loot generation rules
- Timer distribution

Example:

```typescript
export const SEED_CONFIG = {
  guilds: {
    count: 5,
    membersPerGuild: { min: 10, max: 50 },
    rolesPerGuild: { min: 3, max: 8 },
  },
  loots: {
    count: 100,
    itemsPerLoot: {
      fight: { min: 1, max: 10 },
      dialog: { min: 1, max: 3 },
    },
  },
  timers: {
    countPerGuild: 10,
  },
};
```

## Data Files

Scraped and generated data is stored in `src/mocks/data/`:

- `npcs.json` - NPCs scraped from margoworld.pl
- `items.json` - Items scraped from margoworld.pl
- `players.json` - Generated mock players

These files are used by the loot generator to create realistic loot payloads.

## Programmatic Usage

You can also import and use the modules programmatically:

```typescript
import { seed } from "./seed";
import { scrapeItems, scrapeNpcs } from "./seed/scrapers";
import { generatePlayers } from "./seed/generators";

// Scrape data
const items = await scrapeItems("./data/items.json");
const npcs = await scrapeNpcs("./data/npcs.json");

// Generate players
const players = generatePlayers(1000);

// Seed database
await seed({
  guildsCount: 10,
  lootsCount: 500,
  playersCount: 1000,
  clean: true,
});
```

## Development Workflow

### Initial Setup

```bash
# 1. Scrape fresh data from margoworld.pl
pnpm seed:scrape

# 2. Generate mock players
pnpm seed:generate:players

# 3. Seed the database
pnpm seed
```

### Quick Reseed (using existing data)

```bash
# Clean and reseed database with existing data files
pnpm seed

# Or reseed without cleaning
pnpm seed --no-clean
```

### Full Setup (automated)

```bash
# Do everything in one command
pnpm seed:setup
```

## Error Handling

The seeding system includes comprehensive error handling:

- **Scraping errors**: Logged but don't stop the process
- **Database errors**: Transaction rollback and detailed error messages
- **Missing data files**: Clear warnings with suggestions
- **Validation errors**: Type-safe with TypeScript

## Performance

- **Scraping**:
  - Includes rate limiting (100ms delay between requests)
  - Automatically skips re-downloading if files already exist
  - Use `--force` flag to override and re-scrape
- **Database seeding**: Uses transactions for data integrity
- **Batch operations**: Optimized for large datasets

## Troubleshooting

### "Failed to load data files"

- Run `pnpm seed:scrape` to generate data files
- Or run `pnpm seed:setup` for complete setup

### Scraper says "file already exists"

- This is normal behavior to save time and bandwidth
- Existing data files are automatically used
- Use `--force` flag to re-download: `pnpm seed:scrape -- --force`

### "Database connection error"

- Ensure PostgreSQL is running: `docker compose up -d`
- Check `DATABASE_URL` in `.env`
- Run migrations: `pnpm db:api:migrate:dev`

### "Unique constraint violation"

- Database already contains data
- Run with `--no-clean` flag to append data
- Or let it clean first (default behavior)

## Best Practices

1. **Use setup command for first-time setup**: `pnpm seed:setup`
2. **Scrape data weekly**: Items and NPCs may change on margoworld.pl
   - Use `pnpm seed:scrape -- --force` to update existing data
3. **Clean before seeding**: Prevents duplicate data issues
4. **Adjust counts for dev/staging**: Use smaller counts in development
5. **Let scrapers use cached data**: By default, scrapers reuse existing files to save time

## Migration Guide from Old Scripts

Old `.mjs` scripts in `src/mocks/scripts/` have been replaced with TypeScript modules:

| Old Script                 | New Command                  |
| -------------------------- | ---------------------------- |
| `scrap-items.mjs`          | `pnpm seed:scrape:items`     |
| `scrap-npcs.mjs`           | `pnpm seed:scrape:npcs`      |
| `generate-players.mjs`     | `pnpm seed:generate:players` |
| `seed-through-backend.mjs` | `pnpm seed`                  |

The new system:

- ✅ TypeScript with full type safety
- ✅ Better error handling
- ✅ Uses Prisma directly (faster)
- ✅ Modular and reusable
- ✅ CLI interface
- ✅ Configurable
- ✅ Smart caching (doesn't re-download existing files)
- ✅ Force mode to override cache
