# Lootlog

Lootlog connects an in-game Margonem client with a shared web workspace. The
client captures supported gameplay events and provides live tools; the web app
turns those events into durable records, analysis, and organization
coordination.

Lootlog is open source under MIT. It is an unofficial community project and
does not automate character movement, combat, or player decisions.

## Product and engineering context

- [Product direction](PRODUCT.md)
- [Domain language](CONTEXT.md)
- [Architecture](ARCHITECTURE.md)
- [Architecture decisions](docs/adr/README.md)
- [Security policy](SECURITY.md)
- [Design system](DESIGN.md)
- [Contributor guide](CONTRIBUTING.md)
- [User documentation](https://docs.lootlog.pl)

## Product surfaces

- **Game client:** Tampermonkey userscript embedded in supported Margonem pages.
- **Web:** authenticated personal and organization workspace.
- **Landing:** product introduction and legal pages.
- **Docs:** supported user guide.
- **Wiki:** public item, NPC, and player knowledge.
- **Discord bot:** organization installation, membership synchronization,
  notifications, and commands.
- **Developer:** future developer portal; not yet a supported public API product.

The core workflows are live awareness and communication, automatic durable
records, and coordination with review.

## Repository layout

```text
apps/
├── activity/            Activity and audit service
├── api/                 Organization, loot, timer, chat, and coordination API
├── auth/                Discord authentication and session service
├── battlelog-service/   Battle ingestion, storage, and statistics
├── developer/           Future developer portal
├── discord-bot/         Discord integration
├── docs/                User documentation
├── game-client/         In-game React client and Margonem runtime bridge
├── gateway/             Socket.IO presence and real-time fan-out
├── landing/             Public product site and legal pages
├── search/              Meilisearch-backed public search API
├── traffic-splitter/    Shared edge router for dev.lootlog.pl and lootlog.pl
├── web/                 Authenticated React web app
└── wiki/                Public Margonem knowledge app

packages/
├── api-client/          OpenAPI-generated clients and transport
├── api-helpers/         Shared authentication and permission helpers
├── battle-processor/    Battle normalization and processing
├── cli/                 Environment and maintenance commands
├── datetime/            Shared date and time utilities
├── instrumentation/     Observability setup
├── margonem/            Margonem domain types and helpers
├── scoring/             Event and ranking scoring
├── socket-parser/       Shared socket parsing
├── types/               Shared contracts
├── typescript-config/   Shared TypeScript configuration
└── ui/                  Shared UI components and styles
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for ownership, data flow, service
boundaries, deployment, and known gaps.

## Technology

- Bun workspaces and Turborepo
- TypeScript, React 19, Vite, TanStack Start, and TanStack Router/Query
- Effect HttpApi, Better Auth, and native Bun HTTP/WebSocket servers
- PostgreSQL, TimescaleDB, Drizzle, and R2
- RabbitMQ, Redis, native WebSockets, and Meilisearch
- Oxlint, Oxfmt, Vitest, and GitHub Actions

## Local setup

Requirements:

- Node.js 26.8.1
- Bun 1.4.0
- Docker with Docker Compose

```bash
git clone https://github.com/lootlog/monorepo.git
cd monorepo
bun install
bun run env:generate
docker compose up -d
bun run db:api:migrate:dev
bun run db:activity:migrate:dev
bun run db:auth:migrate:dev
bun run db:battlelog:push
bun run dev
```

`docker-compose.yml` starts local infrastructure: four PostgreSQL-compatible
databases, RabbitMQ, Redis, Meilisearch, and Traefik. It is not a supported
production deployment.

## Common commands

```bash
bun run dev
bun run build
bun run lint
bun run typecheck
bun run test
bun run test:e2e
bun run format
bun run format:check
```

Workspace-specific commands are documented in each app or package README.

## Releases and production

Merging a pull request deploys affected targets to development. Production is
manual: choose a full commit SHA from `main` and one deployment target (or
`all`) in the Release workflow.

`dev.lootlog.pl` and `lootlog.pl` use the same repository-owned
`@lootlog/traffic-splitter` implementation but remain separate Cloudflare
Workers. Merges to `main` can update only the development Worker. The GitHub
`dev` environment uses the dedicated `CLOUDFLARE_WORKERS_API_TOKEN` secret for
Worker scripts and custom-domain updates; Pages deployments continue to use
`CLOUDFLARE_API_TOKEN`.

Production requires environment approval. Container images use immutable
`sha-<commit>` tags and deploy through GitOps and ArgoCD. Cloudflare targets
build and deploy in the same approved run. The production state stored in the
infrastructure repository records image references and Cloudflare deployment
IDs. The Roll back production workflow restores its previous revision without
rebuilding code.

See [CI and deployment](docs/ci-cd.md) for workflow inputs, required environment
configuration, rollback, and the post-merge GitHub settings change.

Docker Compose is limited to local infrastructure. Self-hosting is
community-supported until the project ships a tested distribution.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the applicable `AGENTS.md` before
changing code. Report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/lootlog/monorepo/security/advisories/new)
or use the fallback contact in [SECURITY.md](SECURITY.md). Do not open public
issues for suspected vulnerabilities.

General issues belong in the
[Lootlog monorepo issue tracker](https://github.com/lootlog/monorepo/issues).

## License

Code in this repository is licensed under the [MIT License](LICENSE). Margonem
artwork and game assets remain the property of Garmory sp. z o.o.
