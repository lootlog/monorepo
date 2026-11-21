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

## Admin panel

`apps/admin` manages platform roles, bans, sessions, and API keys of Users. It
holds no data: every read and write goes through the auth service's admin API
(`/admin/*`), which records each change in `admin_audit_log`.

The panel is reachable only through a dedicated Cloudflare tunnel whose public
hostname is guarded by a Cloudflare Access application, and it opens only to
the Lootlog session of a User listed in the auth service's
`ADMIN_ACCOUNT_IDS`. Every control below must hold; none replaces another:

- No ingress route points at the `admin` Service, and a NetworkPolicy admits
  only the tunnel's pods.
- The panel verifies the Access token (`Cf-Access-Jwt-Assertion`) of every
  request against the team's keys and the application audience, then requires
  the email to be listed in `ADMIN_OPERATOR_EMAILS`. A production build refuses
  to start without `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and an operator.
- State-changing requests must carry the panel's own origin (`ADMIN_ORIGIN`).
- The auth service serves `/admin/*` only to a request that carries both the
  `ADMIN_API_SECRET` bearer credential, which only the panel holds, and the
  session cookie of a User in `ADMIN_ACCOUNT_IDS`. It reads that session from
  the store on every request, so a sign-out, ban, or revoked session closes
  the panel at once. The edge denies `/admin` on the auth host. Without the
  secret, or with an empty admin list, the admin API refuses everyone.

The panel's hostname must be a subdomain of the session cookie domain, so the
browser sends it the Lootlog session; the operator signs in through the Web
app. Granting the `admin` platform role does not open the panel: only a change
to `ADMIN_ACCOUNT_IDS` adds an operator. The audit log names the operator by
Lootlog User.

Rotate `ADMIN_API_SECRET` by changing `adminApiSecret` in `admin-secrets` and
restarting the `auth` and `admin` Deployments. To remove an operator, delete
the User id from `ADMIN_ACCOUNT_IDS` and the email from the Access policy and
`ADMIN_OPERATOR_EMAILS`.

Platform roles reach the services as the `X-Auth-Roles` forward-auth header,
which the edge must clear on incoming requests and copy from `/auth/verify`
like the identity headers beside it. Deploy the Traefik change before or with
the auth service; until then no role is forwarded and role checks refuse.

The API cannot learn global chat admins from the caller alone: it marks other
Users' messages and shows their auras. It asks the auth service for the
holders of `global-chat-admin` every minute
(`/auth/internal/platform-role-holders`, with `AUTH_IDP_TOKEN_SECRET`) and
adds them to `GLOBAL_CHAT_ADMIN_USER_IDS`. While the auth service cannot be
reached the last answer stands. Deploy the auth service before the API; an
API that gets no answer keeps working with the configured list.

A role change, a revoked session, and a ban reach a signed-in browser within
five minutes, when its session cookie cache expires; a bearer token issued
before a ban stays valid for up to an hour. API keys of a banned User are
refused immediately.

The Better Auth admin plugin still enforces bans at sign-in, but its HTTP
endpoints (`/idp/admin/*`) answer 404: holding the `admin` role must not allow
impersonating Users.
