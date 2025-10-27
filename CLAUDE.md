# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lootlog** is a full-stack microservices application for the game "Margonem" that provides guild loot tracking, battle logging, Discord bot integration, and real-time game client features.

### Technology Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: NestJS (Fastify), Hono
- **Frontend**: React 19, Vite, Next.js 16
- **Databases**: PostgreSQL 17 (3 separate databases), Redis, Meilisearch
- **Message Queue**: RabbitMQ 4
- **ORMs**: Prisma (API, Battlelog), Kysely (Auth), Better-Auth
- **Testing**: Jest (backend), Vitest (frontend)
- **Node**: >= 20

## Initial Setup

```bash
# 1. Install dependencies
pnpm i

# 2. Configure environment variables (auto-generates with smart defaults)
pnpm env:generate
# Or use flags:
# pnpm env:generate --interactive    # Prompt for each value
# pnpm env:generate --skip-existing  # Only create missing files
# pnpm env:generate --force          # Overwrite all without asking

# 3. Start infrastructure (PostgreSQL, RabbitMQ, Redis, Meilisearch)
docker compose up -d

# 4. Run database migrations
pnpm api:migrate:dev
pnpm auth:migrate:dev

# 5. Start all services in development mode
pnpm dev
```

## Common Commands

### Development

```bash
pnpm dev                    # Start all apps/services with hot reload (concurrency 11)
pnpm build                  # Build all apps/services
pnpm lint                   # Lint all code
pnpm format                 # Format code with Prettier
pnpm test                   # Run all tests
```

### Database Operations

**API Service (Lootlog DB - port 5433)**

```bash
pnpm api:migrate:dev        # Run Prisma migrations (interactive)
pnpm api:generate           # Generate Prisma client
pnpm api:studio             # Open Prisma Studio
```

**Auth Service (Users DB - port 5432)**

```bash
pnpm auth:migrate:dev       # Run Better-Auth migrations
pnpm auth:migrate:prod      # Production migrations
```

**Battlelog Service (Battle Log DB - port 5434)**

```bash
pnpm battlelog:migrate:dev  # Run Prisma migrations
pnpm battlelog:generate     # Generate Prisma client
pnpm battlelog:studio       # Open Prisma Studio
```

### Testing

**Backend (Jest)**

```bash
cd apps/api                 # or any NestJS service
pnpm test                   # Run all tests
pnpm test:watch             # Watch mode
pnpm test:cov               # Coverage report
pnpm test:e2e               # E2E tests
```

**Frontend (Vitest)**

```bash
cd apps/web
pnpm test                   # Run tests (if configured)
```

### Infrastructure

```bash
docker compose up -d        # Start all infrastructure services
docker compose down         # Stop all services
docker compose logs -f      # Follow logs
```

## Architecture

### Monorepo Structure

**Apps** (`apps/*`)

- `api` - Main NestJS backend (guilds, loots, timers, NPCs)
- `auth` - Hono auth service (Better-Auth, Discord OAuth, JWT)
- `battlelog-service` - NestJS service for battle statistics
- `gateway` - Socket.IO gateway for real-time events
- `discord-bot` - Discord bot (NestJS + necord)
- `search` - Hono search service (Meilisearch indexing)
- `web` - React 19 dashboard (Vite + TanStack Router/Query)
- `game-client` - React 19 in-game companion (Vite + Socket.IO)
- `landing` - Next.js 16 marketing site

**Packages** (`packages/*`)

- `ui` - Shared Radix UI + Tailwind components
- `types` - Shared TypeScript types
- `api-helpers` - JWT/JWKS auth utilities for services
- `cli` - Environment configuration CLI with smart defaults generation
- `eslint-config`, `typescript-config` - Shared configs

### Three-Database Architecture

1. **lootlog-users-db** (port 5432)
   - Used by: Auth service
   - ORM: Kysely + Better-Auth
   - Contains: User accounts, sessions, Discord profiles

2. **lootlog-db** (port 5433)
   - Used by: API service
   - ORM: Prisma
   - Contains: Guilds, members, roles, loots, timers, NPCs, configurations
   - Schema location: `apps/api/prisma/schema.prisma`

3. **battle-log-db** (port 5434)
   - Used by: Battlelog service
   - ORM: Prisma
   - Contains: Battles, warrior stats, character data
   - Schema location: `apps/battlelog-service/prisma/schema.prisma`

### Inter-Service Communication

**Authentication Flow**

1. User authenticates via Auth service (Discord OAuth or email/password)
2. Auth returns JWT token with `id`, `email`, `role`, `discordId`
3. Other services validate JWT using JWKS from `packages/api-helpers`
4. Clients include `Authorization: Bearer <token>` in requests

**Event-Driven Communication (RabbitMQ)**

- Library: `@golevelup/nestjs-rabbitmq` (NestJS), `amqplib` (Hono)
- Pattern: Publish/Subscribe for async operations
- Examples:
  - API publishes timer updates → Discord-Bot syncs to Discord
  - API publishes new loot → Search service indexes in Meilisearch
  - Members module changes → Gateway broadcasts via Socket.IO

**Real-Time Updates (Socket.IO)**

- API and Gateway expose WebSocket endpoints
- Clients subscribe to guild/battle events
- Used for: Live timer updates, new loots, battle notifications

**Search (Meilisearch)**

- Search service maintains indices
- RabbitMQ events trigger index updates
- Web/game-client query via search service HTTP API

## Development Workflows

### Environment Configuration CLI

The monorepo includes a modular CLI (`packages/cli`) with environment generation:

**Features:**

- Auto-discovers all `.env.sample` files in the monorepo
- Generates secure random values for passwords and secrets
- Shares common values (DB credentials, RabbitMQ, Redis) across services
- Preserves placeholder values for user-provided tokens (Discord, API keys)
- Modular design - easy to add new commands

**Usage:**

```bash
pnpm env:generate                      # Auto-generate with smart defaults (recommended)
pnpm env:generate --interactive        # Prompt for each value
pnpm env:generate --skip-existing      # Only create missing .env files
pnpm env:generate --force              # Overwrite all files without asking
pnpm env:generate --help               # Show help
```

**What it does:**

1. Processes root `.env.sample` and generates secure credentials
2. Extracts shared values (database credentials, RabbitMQ, Redis config)
3. Creates `.env` files for all apps, reusing shared values
4. Leaves placeholders (`xxx`) for external tokens that need manual configuration

**After running:** Update Discord tokens, external API keys, and other service-specific credentials in the respective `.env` files.

### Working with Database Schemas

When modifying database schemas:

1. **For API service**:

   ```bash
   # Edit apps/api/prisma/schema.prisma
   pnpm api:migrate:dev       # Create and apply migration
   pnpm api:generate          # Regenerate Prisma client
   ```

2. **For Battlelog service**:

   ```bash
   # Edit apps/battlelog-service/prisma/schema.prisma
   pnpm battlelog:migrate:dev
   pnpm battlelog:generate
   ```

3. **For Auth service**:
   ```bash
   # Better-Auth manages migrations automatically
   pnpm auth:migrate:dev
   ```

### Adding a New Feature

1. Determine which service owns the feature
2. If cross-service, consider RabbitMQ events
3. Update Prisma schema if database changes needed
4. Implement backend logic (NestJS modules or Hono routes)
5. Add shared types to `packages/types` if needed
6. Implement frontend in `apps/web` or `apps/game-client`
7. Run tests: `pnpm test`
8. Build to verify: `pnpm build`

### Working with Shared Packages

**To modify UI components**:

```bash
cd packages/ui
# Edit components, exported from index.ts
# Changes auto-reload in apps using them
```

**To add shared types**:

```bash
cd packages/types
# Add to appropriate file
# Import in apps: import type { Foo } from '@lootlog/types'
```

### Running Individual Services

```bash
# Run only specific apps (faster than pnpm dev)
cd apps/api
pnpm dev                    # Runs nest start --watch

cd apps/web
pnpm dev                    # Runs vite

cd apps/auth
pnpm dev                    # Runs Hono dev server
```

## Important Conventions

### Turbo Task Dependencies

- Build tasks depend on upstream builds: `"dependsOn": ["^build"]`
- Database generation runs before build: `api:generate`, `battlelog:generate`
- Turbo caches outputs in `.next/`, `dist/`, `generated/`

### Module Organization (NestJS)

- Feature modules in `src/modules/*` (e.g., `guilds`, `loots`, `timers`)
- Each module: controller, service, module file, DTOs, entities
- Shared modules: `prisma`, `config`, `logger`, `rabbitmq`, `redis`

### Frontend Patterns

- TanStack Router for routing (`apps/web`)
- TanStack Query for data fetching
- Zod for validation
- React Hook Form for forms
- Socket.IO client for real-time updates

### Environment Variables

- Sample file: `.env.sample`
- Configure via: `pnpm configure:env`
- Global vars in `turbo.json`: `RABBITMQ_URI`, `REDIS_HOST`, `REDIS_PASSWORD`, etc.
- Service-specific vars in each app's `.env` files

### Code Quality

- Linter: Oxlint (fast Rust-based linter)
- Configuration: `.oxlintrc.json` (see `.oxlintrc.md` for detailed rules)
- Prettier for formatting
- Lint-staged hooks for pre-commit checks
- Commitlint enforces conventional commits

**When writing code, always follow the linting rules defined in `.oxlintrc.md`:**

- Use `===` instead of `==` (eqeqeq)
- Always handle Promises (no floating promises)
- Use `const` instead of `let` when possible (prefer-const)
- Use `import type` for type-only imports
- Prefer nullish coalescing (`??`) over logical OR (`||`)
- Prefer optional chaining (`?.`) over AND chains (`&&`)
- Avoid `any` type, use `unknown` instead
- Use `_` prefix for intentionally unused variables
- Self-closing tags for components without children
- Always provide `key` prop in list renders

## Troubleshooting

### Database Connection Issues

```bash
# Check if containers are running
docker compose ps

# Restart infrastructure
docker compose down
docker compose up -d

# Check logs
docker compose logs -f lootlog-db
docker compose logs -f rabbitmq
docker compose logs -f redis
```

### Migration Issues

```bash
# Reset database (DESTRUCTIVE - dev only)
cd apps/api
pnpm prisma migrate reset

# Apply pending migrations
pnpm api:migrate:dev
```

### Prisma Client Errors

```bash
# Regenerate clients after schema changes
pnpm api:generate
pnpm battlelog:generate
```

### RabbitMQ Connection Issues

- Management UI: http://localhost:15672
- Default credentials in `.env`
- Check `RABBITMQ_URI` environment variable

### Port Conflicts

- PostgreSQL (Users): 5432
- PostgreSQL (Lootlog): 5433
- PostgreSQL (Battlelog): 5434
- RabbitMQ: 5672 (AMQP), 15672 (Management)
- Redis: 6379
- Meilisearch: 7700
- Traefik: 80, 8080

## Deployment

### CI/CD Architecture

The monorepo uses GitHub Actions for automated deployments with a reusable workflow pattern:

**Workflow Structure**:

- Single reusable workflow: `.github/workflows/deploy-service.yml`
- Per-service triggers: `dev-deploy-*.yml` and `prod-deploy-*.yml`
- Automatic deployments on push to `develop` (dev) or manual triggers (prod)

**Deployment Pipeline** (per service):

1. **Test Stage**: Runs linters and tests
2. **Build Stage**: Builds Docker image with Buildx cache
3. **Security Stage**: Scans image with Trivy for vulnerabilities
4. **Kustomize Stage**: Updates Kubernetes manifests with new image tag
5. **Notification Stage**: (Optional) Sends deployment status to Discord/Slack

**Services with CI/CD**:

- `api` - Main API service
- `auth` - Authentication service
- `gateway` - Socket.IO gateway
- `discord-bot` - Discord bot
- `search` - Meilisearch indexing service
- `battlelog-service` - Battle statistics service

### GitHub Environments Setup

To enable environment protection rules and secrets scoping, configure GitHub Environments:

**1. Create Environments** (Repository Settings → Environments):

**Development Environment (`dev`)**:

- Protection rules: None (auto-deploy on push)
- Environment secrets:
  - `DOCKER_REGISTRY_USERNAME`: Docker Hub username
  - `DOCKER_REGISTRY_PASSWORD`: Docker Hub password/token
  - `NOTIFICATION_WEBHOOK` (optional): Discord/Slack webhook URL

**Production Environment (`prod`)**:

- Protection rules:
  - Required reviewers: Add team members who must approve
  - Wait timer: 5 minutes (optional safety delay)
  - Deployment branches: Only `main` branch
- Environment secrets:
  - `DOCKER_REGISTRY_USERNAME`: Docker Hub username
  - `DOCKER_REGISTRY_PASSWORD`: Docker Hub password/token
  - `NOTIFICATION_WEBHOOK` (optional): Discord/Slack webhook URL

**2. Update Workflows** (if using environments):

Modify each deployment workflow to use the environment:

```yaml
jobs:
  deploy:
    uses: ./.github/workflows/deploy-service.yml
    with:
      service: api
      environment: prod
      enable_notifications: true
    secrets:
      DOCKER_REGISTRY_USERNAME: ${{ secrets.DOCKER_REGISTRY_USERNAME }}
      DOCKER_REGISTRY_PASSWORD: ${{ secrets.DOCKER_REGISTRY_PASSWORD }}
    environment: prod # Add this line to use GitHub Environment
```

### Manual Deployments

**Deploy to Development**:

```bash
# Via GitHub UI: Actions → Select service → Run workflow
# Or via gh CLI:
gh workflow run dev-deploy-api.yml
gh workflow run dev-deploy-auth.yml
```

**Deploy to Production**:

```bash
# Production deployments require manual trigger
gh workflow run prod-deploy-api.yml --ref main
```

### Security Scanning

All images are scanned with Trivy before deployment:

- **Severity levels**: CRITICAL, HIGH
- **Fails deployment**: If critical vulnerabilities found
- **Reports**: Uploaded to GitHub Security tab (Code scanning alerts)

### Docker Image Tagging

Each build produces multiple tags:

- `{env}-{sha}`: Primary immutable tag (e.g., `dev-abc123`)
- `{env}-latest`: Latest build for environment
- `{env}-sha-{short}`: Short SHA reference

### Rollback Procedure

**Via Kubernetes**:

```bash
# List recent deployments
kubectl rollout history deployment/api -n lootlog-dev

# Rollback to previous version
kubectl rollback deployment/api -n lootlog-dev

# Rollback to specific revision
kubectl rollback deployment/api --to-revision=3 -n lootlog-dev
```

**Via Git** (update Kustomize manually):

```bash
# Find previous working image tag
git log infra/k8s/prod/api/kustomization.yml

# Manually update to previous tag
# Commit and push to trigger ArgoCD sync
```

## Key Files

- `turbo.json` - Turborepo task pipeline configuration
- `pnpm-workspace.yaml` - Workspace package definitions
- `docker-compose.yml` - Infrastructure services setup
- `.env.sample` - Environment variable template
- `apps/*/package.json` - Per-app scripts and dependencies
- `apps/api/prisma/schema.prisma` - Main database schema
- `apps/battlelog-service/prisma/schema.prisma` - Battlelog database schema
- Dont use memo or useMemo, because its already handled by react compiler.
- Avoid extensive comments.
