# Contributing to Lootlog

First off, thank you for considering contributing to Lootlog! It's people like you that make Lootlog such a great tool for the Margonem community.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title** for the issue
- **Describe the exact steps which reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots or animated GIFs** if applicable
- **Include your environment details** (OS, Node version, browser version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior** and **explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**

### Pull Requests

- Fill in the pull request template
- Follow the code style guidelines (Oxlint, Oxfmt)
- Include tests when adding new features
- Update documentation when necessary
- End all files with a newline

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 10.20.0
- Docker & Docker Compose

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/lootlog/lootlog.git
cd lootlog

# Install dependencies
pnpm i

# Generate environment variables
pnpm env:generate

# Start infrastructure
docker compose up -d

# Run database migrations
pnpm api:migrate:dev
pnpm auth:migrate:dev
pnpm battlelog:migrate:dev

# Start development servers
pnpm dev
```

### Project Structure

This is a Turborepo monorepo with the following structure:

```
apps/
  activity/             - NestJS activity tracking service
  admin/                - Admin panel
  api/                  - Main NestJS backend
  auth/                 - Hono authentication service
  battlelog-service/    - NestJS battle statistics service
  gateway/              - Socket.IO gateway
  discord-bot/          - Discord bot
  notifications/        - Notifications service
  search/               - Hono search service (Meilisearch)
  web/                  - React 19 dashboard
  game-client/          - React 19 in-game companion
  landing/              - Next.js 16 marketing site

packages/
  ui/                   - Shared UI components
  types/                - Shared TypeScript types
  api-helpers/          - JWT/JWKS utilities
  cli/                  - Environment configuration CLI
  instrumentation/      - Shared observability helpers
  nest-shared/          - Shared NestJS decorators and guards
  socket-parser/        - Shared socket parsing logic
  typescript-config/    - Shared TypeScript configuration
```

### Common Commands

```bash
# Development
pnpm dev                    # Start all services
pnpm build                  # Build all services
pnpm lint                   # Lint all code
pnpm format                 # Format code with Oxfmt
pnpm format:check           # Check formatting without writing files
pnpm test                   # Run all tests

# Database operations
pnpm api:migrate:dev        # Run API migrations
pnpm api:generate           # Generate Prisma client
pnpm api:studio             # Open Prisma Studio

# Working on specific apps
cd apps/api
pnpm dev                    # Run only API service
pnpm test                   # Run API tests
```

### Code Style Guidelines

- We use Oxlint and Oxfmt for code quality and formatting
- Run `pnpm lint` before committing
- Run `pnpm format` to auto-format code
- Run `pnpm format:check` when you want a CI-style formatting check
- Use descriptive variable names
- Add comments only when necessary
- Avoid magic numbers and strings - create constants

### Database Changes

When modifying database schemas:

```bash
# For API service
# 1. Edit apps/api/prisma/schema.prisma
# 2. Create migration
pnpm api:migrate:dev
# 3. Regenerate client
pnpm api:generate

# For Battlelog service
# 1. Edit apps/battlelog-service/prisma/schema.prisma
# 2. Create migration
pnpm battlelog:migrate:dev
# 3. Regenerate client
pnpm battlelog:generate
```

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Backend tests use Jest
- Frontend tests use Vitest

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add new timer notification system
fix: resolve memory leak in socket connections
docs: update API documentation
refactor: simplify guild member validation
test: add tests for loot distribution
chore: update dependencies
```

### Working with RabbitMQ Events

When adding inter-service communication:

1. Define event types in `packages/types`
2. Publish events from source service
3. Subscribe to events in target service
4. Test event flow end-to-end

### Adding New Services

1. Create new directory in `apps/`
2. Add `package.json` with proper scripts
3. Update root `pnpm-workspace.yaml` if needed
4. Add service configuration to `turbo.json`
5. Update docker-compose.yml if infrastructure is needed
6. Document service in main README.md

## Getting Help

- Check the [CLAUDE.md](CLAUDE.md) file for detailed architecture info
- Open a GitHub issue for bugs or feature requests
- Review existing issues and pull requests

## Recognition

Contributors will be recognized in the README.md file. Thank you for your contributions!
