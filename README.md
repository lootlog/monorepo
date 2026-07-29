# Lootlog

<div align="center">

**Full-stack microservices application for Margonem clan management**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-11.17.0-orange)](https://pnpm.io/)

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
- **pnpm** >= 11.17.0
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
pnpm auth:migrate:dev       # Apply auth migrations in development
pnpm auth:migrate:prod      # Apply auth migrations in production
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

This project uses [Changesets](https://github.com/changesets/changesets) to manage independent versions, changelogs, Git tags, and GitHub Releases for every app and package in the monorepo.

All workspace packages are private. Releases document deployable versions in GitHub; nothing is published to npm.

### Contributor Workflow

```bash
pnpm changeset
```

Select every directly affected workspace, choose the SemVer bump, and write a clear English summary. Use:

- **Patch** for fixes and compatible internal improvements.
- **Minor** for backwards-compatible features.
- **Major** for breaking consumer-facing changes.

Changesets automatically add patch releases for runtime dependents of changed internal packages. If files inside a workspace change but the change does not require a release, create an explicit empty changeset:

```bash
pnpm changeset --empty
```

Pull request CI validates changesets against the PR base commit.

### Automated Release Workflow

1. Merge feature pull requests through the merge queue into `main`. Affected services deploy automatically to dev, but no release artifacts are created.
2. Changesets creates or updates the `chore: release packages` version PR against `main`.
3. Review and merge the version PR. Do not edit versions or generated changelogs manually.
4. The merge creates package tags such as `@lootlog/api@1.0.1`, GitHub Releases, immutable Docker images, and checksummed Cloudflare artifacts for released applications. It does not deploy dev.
5. Artifacts are built before the `prod` approval. Review the workflow summary and apply any listed Prisma or Drizzle migrations manually.
6. Approving the `prod` environment deploys the prepared Cloudflare artifacts first, then writes every released Docker image version to the infra repository in one commit. ArgoCD performs the container rollout.

Each released workspace owns its generated `CHANGELOG.md`. Use `pnpm changeset status --verbose` to preview the pending release plan. The `pnpm version` and `pnpm release` commands are reserved for release automation.

Production images use both `prod-<semver>` and `sha-<release-commit>` tags and are never overwritten. To promote or roll back one service, run the **Promote an existing image to prod** workflow from `main` with the service and an existing semantic version. Rollbacks only change GitOps; they never rebuild an image.

A successful deployment workflow means the GitOps change was accepted. ArgoCD remains the source of truth for the actual cluster rollout and health.

Production GitOps jobs currently read `INFRA_REPO_PUSH_TOKEN` from repository secrets so existing dev deployments continue to work. A `prod` environment secret with the same name will automatically take precedence when a dedicated production credential is provisioned; do not remove the repository secret until dev has its own credential.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Detailed architecture and development guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute to the project
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community guidelines
- **[SECURITY.md](SECURITY.md)** - Security policy and reporting

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

This project and all apps and packages in this monorepo are licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the **Margonem** gaming community
- Powered by amazing open-source projects
- Thanks to all contributors who help improve Lootlog

---

<div align="center">

**Made with ❤️ for the Margonem community**

[⬆ Back to Top](#lootlog)

</div>
