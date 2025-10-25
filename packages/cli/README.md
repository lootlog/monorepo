# @lootlog/cli

Modular CLI tooling for the Lootlog monorepo. Provides commands for environment configuration, database seeding, code generation, and development workflows.

## Features

- 🔍 **Auto-discovery** - Automatically finds resources across the monorepo
- 🔐 **Secure defaults** - Generates cryptographically secure values
- 🔄 **Shared configuration** - Reuses values across services
- 🎯 **Smart detection** - Context-aware value generation
- 🚀 **Modular design** - Easy to extend with new commands
- 💅 **Great UX** - Colored output and clear feedback

## Installation

This package is part of the Lootlog monorepo and doesn't need separate installation.

## Available Commands

### Database Seeding

Scrape data from margoworld.pl, generate mock data, and seed the database with test data.

```bash
pnpm seed <subcommand> [options]
```

**Subcommands:**

- `setup` - Complete setup (scrape, generate, seed)
- `scrape:all` - Scrape items and NPCs
- `scrape:items` - Scrape items only
- `scrape:npcs` - Scrape NPCs only
- `generate:players` - Generate mock players
- `run` - Seed the database

**Options:**

- `--force, -f` - Force re-scraping even if files exist
- `--guilds <number>` - Number of guilds (default: 5)
- `--loots <number>` - Number of loots (default: 100)
- `--players <number>` - Number of players (default: 1000)
- `--no-clean` - Don't clean database before seeding
- `--skip-scrape` - Skip scraping (use existing data)

**Examples:**

```bash
# Complete setup
pnpm seed:setup

# Scrape data
pnpm seed:scrape
pnpm seed:scrape --force  # Force re-scrape

# Seed database
pnpm seed --guilds 10 --loots 500

# Generate players only
pnpm seed:generate:players
```

For detailed documentation, see [src/commands/seed/README.md](./src/commands/seed/README.md).

### Environment Generation

Generate `.env` files from `.env.sample` templates with smart defaults.

```bash
pnpm env:generate [options]
```

**Options:**

- `-a, --auto` - Auto-generate with smart defaults (default)
- `-i, --interactive` - Prompt for each value
- `-s, --skip-existing` - Skip existing files
- `-f, --force` - Overwrite without asking
- `-h, --help` - Show help

**Examples:**

```bash
# Auto-generate all files (recommended for first-time setup)
pnpm env:generate

# Interactive mode - prompt for each value
pnpm env:generate --interactive

# Only create missing .env files
pnpm env:generate --skip-existing

# Force overwrite all files
pnpm env:generate --force
```

## How Environment Generation Works

### 1. File Discovery

Automatically discovers all `.env.sample` files:

```
.env.sample                           # Root configuration
apps/api/.env.sample                  # API service
apps/auth/.env.sample                 # Auth service
apps/battlelog-service/.env.sample    # Battlelog service
apps/discord-bot/.env.sample          # Discord bot
apps/game-client/.env.sample          # Game client
apps/gateway/.env.sample              # Gateway service
apps/landing/.env.sample              # Landing page
apps/search/.env.sample               # Search service
apps/web/.env.sample                  # Web dashboard
```

### 2. Smart Value Generation

**Passwords** (`*PASSWORD`, `*PASS`):

- 32-character random hex strings
- Example: `cdd6ca1068cc9cfe2bc0bff2be3e357b`

**Secret Keys** (`*SECRET`, `*KEY`, `*TOKEN`):

- 64-character base64-encoded strings
- Example: `nrgzolK8Y+I/xHQhP9ujsoycRkS2d270gDsCEHUrcO5m6Yh1veZ6Qf5Rz+BgHVHjJh3kERCKiwlGLorA6NkITA==`

**Ports, Hosts, URLs**:

- Preserves defaults from `.env.sample`

**External Tokens** (Discord, R2, Axiom):

- Keeps placeholders for manual configuration

### 3. Shared Values

Generated once in root `.env` and shared across services:

**Databases:**

- `USERS_DB_USER`, `USERS_DB_PASSWORD`, `USERS_DB_NAME`
- `LOOTLOG_DB_USER`, `LOOTLOG_DB_PASSWORD`, `LOOTLOG_DB_NAME`
- `BATTLE_LOG_DB_USER`, `BATTLE_LOG_DB_PASSWORD`, `BATTLE_LOG_DB_NAME`

**Infrastructure:**

- `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS`
- `MEILISEARCH_MASTER_KEY`
- `REDIS_PASSWORD`, `REDIS_USERNAME`, `REDIS_HOST`, `REDIS_PORT`

**Storage:**

- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_REGION`, `R2_BUCKET_NAME`

### 4. Derived Values

Automatically builds connection URIs:

**RabbitMQ:**

```
RABBITMQ_URI=amqp://rabbitmq_user:PASSWORD@localhost:5672
```

**PostgreSQL:**

Detects database from original `.env.sample` value:

- **API** (`lootlog`, port `5433`):

  ```
  postgresql://user:PASSWORD@localhost:5433/lootlog
  ```

- **Battlelog** (`battle_log`, port `5434`):

  ```
  postgresql://user:PASSWORD@localhost:5434/battle_log
  ```

- **Auth** (`users`, port `5432`):
  ```
  postgresql://user:PASSWORD@localhost:5432/users
  ```

## Post-Generation Steps

Manually update these placeholder values:

**Discord:**

- `DISCORD_BOT_TOKEN` in `apps/discord-bot/.env`
- `DISCORD_DEVELOPMENT_GUILD_ID` in `apps/discord-bot/.env`
- `DISCORD_CLIENT_SECRET` in `apps/auth/.env`
- `DISCORD_CLIENT_ID` in `apps/auth/.env` and `apps/web/.env`

**External Services:**

- `AXIOM_DATASET` and `AXIOM_TOKEN` (if using Axiom logging)
- Cloudflare R2 credentials (if not in root `.env`)

## Project Structure

```
packages/cli/
├── src/
│   ├── index.ts                     # Main CLI entry point
│   ├── types.ts                     # Shared TypeScript types
│   ├── commands/
│   │   ├── env/
│   │   │   ├── index.ts             # Env command aggregator
│   │   │   └── generate.ts          # Generate .env files
│   │   └── seed/
│   │       ├── index.ts             # Seed command handler
│   │       ├── config.ts            # Seed configuration
│   │       ├── seed.ts              # Main seeding logic
│   │       ├── scrapers/            # Data scrapers
│   │       └── generators/          # Data generators
│   └── utils/
│       ├── file-utils.ts            # File operations
│       └── env-generator.ts         # Value generation logic
├── package.json
└── README.md
```

## Adding New Commands

The CLI is designed to be modular. To add a new command:

### 1. Create Command File

```typescript
// packages/cli/src/commands/your-command/your-subcommand.ts
export const yourSubcommand = async (args: string[]): Promise<void> => {
  // Your command logic
};
```

### 2. Add to package.json

```json
{
  "scripts": {
    "your-command:subcommand": "tsx src/commands/your-command/your-subcommand.ts"
  }
}
```

### 3. Add to Root package.json

```json
{
  "scripts": {
    "your-command:subcommand": "turbo run your-command:subcommand"
  }
}
```

### 4. Configure turbo.json

```json
{
  "tasks": {
    "your-command:subcommand": {
      "cache": false,
      "interactive": true // if needed
    }
  }
}
```

## Development

### Running Locally

From the CLI package:

```bash
cd packages/cli
pnpm env:generate [options]
```

From monorepo root:

```bash
pnpm env:generate [options]
```

### Extending Environment Generation

**Add new shared values:**

Update `extractSharedValues()` in `src/utils/env-generator.ts`:

```typescript
const sharedKeys = [
  // ... existing keys
  "YOUR_NEW_SHARED_KEY",
];
```

**Add new derived values:**

Update `enhanceVariablesWithDerivedValues()` in `src/utils/env-generator.ts`:

```typescript
if (variable.key === "YOUR_DERIVED_KEY") {
  const value1 = sharedValues.get("SHARED_KEY_1") || "default";
  const value2 = sharedValues.get("SHARED_KEY_2") || "default";
  return {
    ...variable,
    value: `your-template://${value1}:${value2}`,
  };
}
```

## Implemented Commands

✅ **Environment Management** - Generate `.env` files with smart defaults
✅ **Database Seeding** - Scrape data, generate mocks, populate database

## Future Commands

The CLI structure supports adding:

- **Code Generation** - Generate boilerplate code
- **Testing Utilities** - Generate test fixtures
- **Deployment** - Build and deploy helpers
- **Monitoring** - Health checks and diagnostics

## Troubleshooting

### CLI doesn't find new `.env.sample`

Ensure file is in `apps/*/` directory. The CLI uses:

```typescript
await glob(`${rootPath}/apps/**/.env.sample`);
```

### Generated values differ between services

Expected! Only **shared values** are synchronized. Each service gets unique passwords.

### Custom value was overwritten

Check if variable name matches generation patterns (`password`, `secret`, `key`, `token`). Use `--interactive` for full control or adjust `shouldGenerateValue()` in `src/utils/env-generator.ts`.

## License

Private - part of the Lootlog monorepo.
