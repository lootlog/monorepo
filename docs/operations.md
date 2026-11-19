# Operations

How Lootlog is released, rolled back, and recovered. Local development is
covered in the [README](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).

## Releases and production

The public SDK has a separate manual [Publish SDK](../.github/workflows/publish-sdk.yml)
workflow. See [SDK publication](../packages/sdk/PUBLISHING.md) for npm setup,
versioning and release steps.

Merging a pull request deploys affected targets to development. Production is
manual: choose a full commit SHA from `main` and check the deployment targets
(or `all`) in the Release workflow.

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

See the [development deployment](../.github/workflows/dev-deploy.yml),
[production release](../.github/workflows/release.yml), and
[production rollback](../.github/workflows/rollback.yml) workflows for the current
inputs and deployment steps.

## Backend artifacts and recovery

Backend images contain the pruned workspace source, production dependencies,
and build output. `dist/` alone is not a deployable artifact: Activity, Search,
and Discord bundles retain `#src` imports that Bun resolves to source TypeScript,
and shared packages export source. Keep these files together as specified in
[`docker/backend.Dockerfile`](../docker/backend.Dockerfile).

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
workers. See [loot publication recovery](../apps/api/drizzle/README.md) and
[battle object cleanup](../apps/battlelog/drizzle/README.md) for pending-work
inspection and rollback constraints.
