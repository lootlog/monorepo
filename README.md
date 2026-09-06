# Lootlog

Lootlog connects an in-game Margonem client with a shared web workspace. The
client captures supported gameplay events and provides live tools; the web app
turns those events into durable records, analysis, and organization
coordination.

Lootlog is open source under MIT. It is an unofficial community project and
does not automate character movement, combat, or player decisions.

## Project links

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
├── battlelog/           Battle ingestion, storage, and statistics
├── developer/           Future developer portal
├── discord-bot/         Discord integration
├── docs/                User documentation
├── game-client/         In-game React client and Margonem runtime bridge
├── gateway/             Bun WebSocket presence and real-time fan-out
├── landing/             Public product site and legal pages
├── search/              Meilisearch-backed public search API
├── traffic-splitter/    Shared edge router for dev.lootlog.pl and lootlog.pl
├── web/                 Authenticated React web app
└── wiki/                Public Margonem knowledge app

packages/
├── battle-processor/    Battle normalization and processing
├── cli/                 Environment and maintenance commands
├── client/              Generated HTTP clients and realtime client
├── datetime/            Shared date and time utilities
├── domain/              Browser-safe domain logic
├── instrumentation/     Observability setup
├── margonem/            Margonem domain types and helpers
├── messaging/           RabbitMQ transport
├── protocol/            Realtime and RabbitMQ wire contracts
├── schema/              Shared schemas and browser-safe types
├── typescript-config/   Shared TypeScript configuration
└── ui/                  Shared UI components and styles
```

## Technology

- Bun workspaces and Turborepo
- TypeScript, React 19, Vite, TanStack Start, and TanStack Router/Query
- Effect 4 HttpApi, Better Auth, and native Bun HTTP/WebSocket servers
- PostgreSQL, TimescaleDB, Drizzle, and R2
- RabbitMQ, Redis, native WebSockets, and Meilisearch
- Oxlint, Oxfmt, Vitest, and GitHub Actions

## Local setup

Requirements:

- Node.js 26.8.1
- Bun 1.4.2
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

The environment generator shares `ACTIVITY_EVENT_SIGNATURE_SECRET` between the
Gateway publisher and Activity consumer. With `--skip-existing`, it reuses the
secret from existing files and leaves those files unchanged. If existing secrets
differ, align the value in the root, Gateway, and Activity `.env` files before
running the generator again. `--force` regenerates all environment files,
including credentials and manually configured values.

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

Additional workspace-specific commands are declared in each workspace's
`package.json`.

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

See the [development deployment](.github/workflows/dev-deploy.yml),
[production release](.github/workflows/release.yml), and
[production rollback](.github/workflows/rollback.yml) workflows for the current
inputs and deployment steps.

Docker Compose is limited to local infrastructure. Self-hosting is
community-supported until the project ships a tested distribution.

### Backend artifacts and recovery

Backend images contain the pruned workspace source, production dependencies,
and build output. `dist/` alone is not a deployable artifact: Activity, Search,
and Discord bundles retain `#src` imports that Bun resolves to source TypeScript,
and shared packages export source. Keep these files together as specified in
`docker/backend.Dockerfile`.

RabbitMQ connection, channel, or broker subscription loss fails the supervised
API, Gateway, Activity, Search, or Discord process and closes its Effect scopes.
The deployment supervisor must restart failed processes; the adapter does not
silently reconnect a partially initialized application. Consumer scopes cancel
subscriptions and requeue interrupted deliveries.

Dead-letter queues retain exhausted messages. Their depth is exposed as the
Effect gauge `rabbitmq.dead_letter.messages`, with the `queue` attribute; the
application does not consume or log their bodies. After fixing the cause, use
an operator-controlled replay: preserve the message ID and payload, publish to
the original destination with publisher confirmation, then acknowledge the
dead letter. Reset the retry-count header for a fresh retry budget. An
interrupted replay can duplicate delivery, so consumers must remain idempotent.

Apply the new API and Battlelog database migrations before deploying their
workers. See [loot publication recovery](apps/api/drizzle/README.md) and
[battle object cleanup](apps/battlelog/drizzle/README.md) for pending-work
inspection and rollback constraints.

## Testing

Tautological tests are considered harmful. Tests should be meaningful, reproducible, and fast. They should not be brittle or require manual intervention. Tests should be run in CI and locally before merging.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before changing
code. Report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/lootlog/monorepo/security/advisories/new).
Do not open public issues for suspected vulnerabilities.

General issues belong in the
[Lootlog monorepo issue tracker](https://github.com/lootlog/monorepo/issues).

## License

Code in this repository is licensed under the [MIT License](LICENSE). Margonem
artwork and game assets remain the property of Garmory sp. z o.o.
