# CI and deployment

## Pull requests

Pull requests run one `Continuous Integration` workflow against GitHub's merge
ref. `CI Success` is the only required repository check. The workflow cancels an
older run when the same pull request receives another commit.

The planner installs Bun but does not install workspace dependencies. It uses
Turbo 2.10.12 to find affected packages and
`.github/deployment-targets.json` to select generated-client and Docker checks.
Docker runs only when packaging inputs change.

## Development

Every merge to `main` runs `Deploy affected targets to development`. The
workflow deploys affected targets enabled for development and writes immutable
Docker tags in the form `dev-<commit>` to the infrastructure repository.

Disable Cloudflare's Git-connected builds for every project managed by these
workflows. Otherwise a merge can trigger an additional deployment outside
GitHub Actions.

## Production

Run `Release to production` manually with:

- `source_sha`: a full lowercase commit SHA reachable from `main`;
- `target`: one target from the dropdown, or `all`.

The `production` environment approves the run before build work starts. Docker
targets build once, pass Trivy, and publish `sha-<commit>`. Cloudflare targets
build and deploy in the same run. The infrastructure repository records the
result in `apps/prod/lootlog-deployment.json`.

Run `Roll back production` to restore the preceding revision of that state.
Rollback changes GitOps image tags and invokes Cloudflare's native rollback. It
does not rebuild an image or frontend bundle.

## GitHub configuration

Configure both `dev` and `production` environments with the values their
selected targets need.

Secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_WORKERS_API_TOKEN`
- `DOCKER_REGISTRY_USERNAME`
- `DOCKER_REGISTRY_PASSWORD`
- `INFRA_REPO_PUSH_TOKEN`

Build variables:

- `VITE_ACTIVITY_API_URL`
- `VITE_ADDON_INSTALL_URL`
- `VITE_ADDON_URL`
- `VITE_API_URL`
- `VITE_AUTH_SERVICE_URL`
- `VITE_BATTLELOG_API_URL`
- `VITE_BATTLELOG_PUBLIC_URL`
- `VITE_DISCORD_BOT_PERMISSIONS`
- `VITE_DISCORD_CLIENT_ID`
- `VITE_GATEWAY_URL`
- `VITE_SEARCH_API_URL`

After the workflow change reaches `main`:

1. Keep `CI Success` as the only required check and leave strict branch updates
   disabled.
2. Disable merge queue.
3. Disable CodeQL Code Quality and keep CodeQL Code Scanning.
4. Keep Copilot and Dependabot Updates outside the required gate.

## Measuring the change

The baseline broad pull request took 8 minutes 45 seconds of wall time and about
17 runner-minutes. After ten comparable pull requests, compare both the median
`CI Success` duration and total job time. Also confirm that no merge-queue run
follows a successful pull-request run.
