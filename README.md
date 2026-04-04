# Lootlog

<div align="center">

**Full-stack microservices application for Margonem clan management**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.32.1-orange)](https://pnpm.io/)

[Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Documentation](#documentation) • [Contributing](CONTRIBUTING.md)

</div>

---

## About

Lootlog is a comprehensive platform for **Margonem** clans that provides:

- **Clan Loot Tracking** - Track, manage, and distribute clan loot efficiently
- **Battle Statistics** - Detailed battle logs and warrior performance analytics
- **Discord Integration** - Synchronizes clan data between Discord server and database
- **In-Game Client** - React-based companion overlay for the game
- **Real-Time Updates** - WebSocket-powered live notifications and events
- **Search System** - Fast full-text search powered by Meilisearch

## Features

### Clan Management

- Multi-clan support with role-based permissions
- Loot tracking with item database integration
- Boss timer tracking and notifications
- NPC/location management
- Member activity tracking

### Battle System

- Comprehensive battle logging
- Warrior statistics and leaderboards
- Character performance analytics
- Historical battle data

### Discord Bot

- Discord server data synchronization
- Clan member role management
- Discord to database integration
- Slash commands for server management

### Developer Experience

- Turborepo monorepo with hot reload
- CLI tool for environment setup with smart defaults
- Docker Compose for one-command infrastructure
- Comprehensive TypeScript types shared across services
- Automated database migrations

## Tech Stack

### Backend

- **NestJS** (Fastify) - API, Battlelog, Discord Bot, Gateway
- **Hono** - Auth, Search services
- **Prisma** - ORM for API and Battlelog databases
- **Kysely** - Type-safe SQL for Auth database
- **Better-Auth** - Modern authentication with Discord OAuth
- **RabbitMQ** - Message queue for inter-service communication
- **Socket.IO** - Real-time WebSocket connections

### Frontend

- **React 19** - Web dashboard and game client
- **Next.js 16** - Marketing landing page
- **TanStack Router/Query** - Type-safe routing and data fetching
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling

### Infrastructure

- **PostgreSQL 17** - Three separate databases (Users, Lootlog, Battlelog)
- **Redis** - Caching and session storage
- **Meilisearch** - Full-text search engine
- **Docker Compose** - Local development orchestration
- **Turborepo** - Monorepo build system

### DevOps

- **GitHub Actions** - CI/CD pipelines
- **Dependabot** - Automated dependency updates
- **Oxlint + Oxfmt** - Code quality and formatting
- **Vitest** - Testing framework

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10.32.1
- **Docker** and **Docker Compose**
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/lootlog/lootlog.git
cd lootlog

# Install dependencies
pnpm i

# Generate environment variables with smart defaults
pnpm env:generate

# Start infrastructure services (PostgreSQL, RabbitMQ, Redis, Meilisearch)
docker compose up -d

# Run database migrations
pnpm api:migrate:dev
pnpm auth:migrate:dev
pnpm battlelog:migrate:dev

# Start all services in development mode
pnpm dev
```

Your services will be available at:

- **Web Dashboard**: http://localhost:5173
- **Game Client**: http://localhost:5174
- **Landing Page**: http://localhost:3000
- **API**: http://localhost:3030
- **Auth Service**: http://localhost:3031
- **Gateway**: http://localhost:3032

### Docker Services

The following infrastructure services will be running:

- **PostgreSQL (Users)**: localhost:5432
- **PostgreSQL (Lootlog)**: localhost:5433
- **PostgreSQL (Battlelog)**: localhost:5434
- **RabbitMQ**: localhost:5672 (Management UI: http://localhost:15672)
- **Redis**: localhost:6379
- **Meilisearch**: localhost:7700

## Configuration

### Environment Variables

The project includes a CLI tool for easy environment setup:

```bash
# Interactive mode - prompts for each value
pnpm env:generate --interactive

# Auto-generate with secure defaults (recommended)
pnpm env:generate

# Skip existing files
pnpm env:generate --skip-existing

# Force overwrite all files
pnpm env:generate --force
```

The CLI generates secure random values for:

- Database passwords
- JWT secrets
- Redis passwords
- RabbitMQ credentials

You'll need to manually configure:

- Discord bot token and client credentials
- Discord webhook URLs
- External API keys

All `.env.example` files are included as templates.

### Database Configuration

The project uses three separate PostgreSQL databases:

1. **lootlog-users-db** (port 5432)
   - Managed by: Auth service
   - ORM: Kysely + Better-Auth
   - Purpose: User accounts, sessions, Discord profiles

2. **lootlog-db** (port 5433)
   - Managed by: API service
   - ORM: Prisma
   - Purpose: Guilds, loots, timers, NPCs
   - Schema: `apps/api/prisma/schema.prisma`

3. **battle-log-db** (port 5434)
   - Managed by: Battlelog service
   - ORM: Prisma
   - Purpose: Battle data, warrior stats
   - Schema: `apps/battlelog-service/prisma/schema.prisma`

## Architecture

### Monorepo Structure

```
apps/
├── activity/               - NestJS activity tracking service
├── admin/                  - Admin panel
├── api/                    - Main NestJS backend (guilds, loots, timers)
├── auth/                   - Hono authentication service (Better-Auth)
├── battlelog-service/      - NestJS battle statistics service
├── gateway/                - Socket.IO gateway for real-time events
├── discord-bot/            - Discord bot (NestJS + necord)
├── notifications/          - Notifications service
├── search/                 - Hono search service (Meilisearch)
├── web/                    - React 19 dashboard (Vite)
├── game-client/            - React 19 in-game companion
└── landing/                - Next.js 16 marketing site

packages/
├── ui/                     - Shared Radix UI + Tailwind components
├── types/                  - Shared TypeScript types
├── api-helpers/            - JWT/JWKS authentication utilities
├── cli/                    - Environment configuration CLI
├── instrumentation/        - Shared observability helpers
├── nest-shared/            - Shared NestJS decorators and guards
├── socket-parser/          - Shared socket parsing logic
└── typescript-config/      - Shared TypeScript configuration
```

### Inter-Service Communication

**Authentication Flow**

1. User authenticates via Auth service (Discord OAuth or email/password)
2. Auth returns JWT with user claims
3. Other services validate JWT using JWKS from `packages/api-helpers`
4. Clients include `Authorization: Bearer <token>` header

**Event-Driven Communication (RabbitMQ)**

- Discord Bot publishes server data → API syncs to database
- API publishes new loot → Search service indexes in Meilisearch
- Member changes → Gateway broadcasts via Socket.IO

**Real-Time Updates (Socket.IO)**

- Live timer updates
- New loot notifications
- Battle event streaming

## Common Commands

### Development

```bash
pnpm dev                    # Start all services with hot reload
pnpm build                  # Build all services
pnpm lint                   # Lint all code
pnpm format                 # Format code with Oxfmt
pnpm format:check           # Check formatting without writing files
pnpm test                   # Run all tests
```

### Database Operations

```bash
# API service (Lootlog DB)
pnpm api:migrate:dev        # Create and apply migration
pnpm api:generate           # Regenerate Prisma client
pnpm api:studio             # Open Prisma Studio

# Battlelog service (Battle Log DB)
pnpm battlelog:migrate:dev  # Create and apply migration
pnpm battlelog:generate     # Regenerate Prisma client
pnpm battlelog:studio       # Open Prisma Studio

# Auth service (Users DB)
pnpm auth:migrate:dev       # Run Better-Auth migrations
pnpm auth:migrate:prod      # Production migrations
```

### Infrastructure

```bash
docker compose up -d        # Start all infrastructure services
docker compose down         # Stop all services
docker compose logs -f      # Follow logs
docker compose ps           # Check status
```

### Working on Specific Services

```bash
# Run only specific service
cd apps/api
pnpm dev                    # Runs nest start --watch

cd apps/web
pnpm dev                    # Runs vite

cd apps/auth
pnpm dev                    # Runs Hono dev server
```

## Version Management with Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versions, changelogs, and releases across all packages and apps in the monorepo.

### What are Changesets?

Changesets is a tool that helps track which packages need to be released and what version bump they need (major, minor, or patch). It generates changelogs automatically based on the changes you describe.

### Workflow

#### 1. Making Changes

When you make changes to any package or app, you need to create a changeset to document what changed:

```bash
# After making your changes, create a changeset
pnpm changeset
```

This will:

1. Prompt you to select which packages have changed
2. Ask whether the change is a major, minor, or patch
3. Request a description of the changes (used in the changelog)

**Versioning Guidelines:**

- **Major** (1.0.0 → 2.0.0) - Breaking changes that require users to modify their code
- **Minor** (1.0.0 → 1.1.0) - New features that are backwards compatible
- **Patch** (1.0.0 → 1.0.1) - Bug fixes and small improvements

#### 2. Changeset Files

After running `pnpm changeset`, a new markdown file will be created in `.changeset/` directory:

```markdown
---
"@lootlog/api": patch
"@lootlog/types": patch
---

Fixed authentication bug in API service
```

Commit this file along with your code changes:

```bash
git add .
git commit -m "fix: authentication bug + changeset"
```

#### 3. Versioning Packages

When you're ready to create a new version (typically before a release):

```bash
# Update package versions and generate changelogs
pnpm version
```

This command:

- Reads all changeset files
- Updates `package.json` versions for affected packages
- Updates `CHANGELOG.md` files
- Removes consumed changeset files

**Commit the version changes:**

```bash
git add .
git commit -m "chore: version packages"
git push
```

#### 4. Publishing (Optional)

If you're publishing packages to npm:

```bash
# Build all packages and publish to npm
pnpm release
```

**Note:** This project uses `"access": "restricted"` in changeset config, meaning packages are private by default.

### Common Scenarios

#### Single Package Change

```bash
# 1. Make your changes to apps/api
# 2. Create changeset
pnpm changeset
# Select: @lootlog/api
# Version: patch
# Description: "Fixed guild sync bug"

# 3. Commit
git add .
git commit -m "fix(api): guild sync bug"
```

#### Multiple Package Changes

```bash
# 1. Make changes to apps/api and packages/types
# 2. Create changeset
pnpm changeset
# Select: @lootlog/api, @lootlog/types
# Version: minor (for new feature)
# Description: "Added support for custom guild roles"

# 3. Commit
git add .
git commit -m "feat: custom guild roles"
```

#### No Changeset Needed

If your changes don't affect any package functionality (docs, tests, config):

```bash
# Just commit normally without creating a changeset
git add .
git commit -m "docs: update README"
```

### Configuration

Changeset configuration is in `.changeset/config.json`:

- **Base Branch**: `develop` - all changesets are based on this branch
- **Commit**: `false` - changesets won't auto-commit (you control commits)
- **Access**: `restricted` - packages are private by default
- **Update Internal Dependencies**: `patch` - internal package updates trigger patch versions

### Commands Reference

```bash
# Create a new changeset
pnpm changeset

# Version packages (consume changesets)
pnpm version

# Build and publish to npm
pnpm release

# View changeset status
pnpm changeset status
```

### Best Practices

1. **Create changesets for every functional change** - Don't batch multiple unrelated changes in one changeset
2. **Write clear descriptions** - They become your changelog entries
3. **Version appropriately** - Be conservative with major versions
4. **Review generated changelogs** - Check `CHANGELOG.md` files after running `pnpm version`
5. **Commit changesets with your code** - Don't create changesets in separate commits

### Example Workflow

```bash
# Day 1: Add new feature
git checkout -b feat/notifications
# ... make changes ...
pnpm changeset
# Select packages, choose minor, describe feature
git add .
git commit -m "feat: add notification system"
git push

# Day 2: Fix bug found in review
# ... make changes ...
pnpm changeset
# Select packages, choose patch, describe fix
git add .
git commit -m "fix: notification timing issue"
git push

# Day 3: Ready to release
git checkout develop
git pull
pnpm version  # Consumes all changesets, updates versions
git add .
git commit -m "chore: version packages"
git push

# Optional: Publish to npm (if applicable)
pnpm release
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Detailed architecture and development guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute to the project
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community guidelines
- **[SECURITY.md](SECURITY.md)** - Security policy and reporting
- **[CHANGELOG.md](CHANGELOG.md)** - Project history and releases

## Project Status

Lootlog is actively developed and used by multiple Margonem clans. We welcome contributions!

### Roadmap

- [ ] Clan statistics

## Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started.

### Ways to Contribute

- Report bugs and suggest features via [GitHub Issues](https://github.com/lootlog/lootlog/issues)
- Submit pull requests for bug fixes or new features
- Improve documentation
- Help with translations
- Spread the word about Lootlog

## Community

- **Discord**: [Join our community](https://discord.gg/lootlog)
- **Website**: [https://lootlog.pl](https://lootlog.pl)
- **Issues**: [GitHub Issues](https://github.com/lootlog/lootlog/issues)

## Security

If you discover a security vulnerability, please email **kamilwronka7@gmail.com**. See [SECURITY.md](SECURITY.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the **Margonem** gaming community
- Powered by amazing open-source projects
- Thanks to all contributors who help improve Lootlog

---

<div align="center">

**Made with ❤️ for the Margonem community**

[⬆ Back to Top](#lootlog)

</div>
