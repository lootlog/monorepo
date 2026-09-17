# Publish the SDK

The `Publish SDK` GitHub Actions workflow publishes only `@lootlog/sdk` to npm.
Application deployment and `@lootlog/game-client-api` publication remain separate.
The workflow runs manually from `main`, checks the committed version, verifies
generated contracts, runs lint/typecheck/tests, and installs packed public
packages into an isolated consumer. It publishes the exact SDK archive that
passed that consumer check, without rebuilding it.

## Configure npm once

You need publication rights in the npm `@lootlog` scope. Create the GitHub
environment `npm` and configure the SDK's npm trusted publisher with:

| Field             | Value                                |
| ----------------- | ------------------------------------ |
| Provider          | GitHub Actions                       |
| Organization      | `lootlog`                            |
| Repository        | `monorepo`                           |
| Workflow filename | `publish-sdk.yml`                    |
| Environment       | `npm`                                |
| Allowed action    | Direct publishing with `npm publish` |

The workflow uses GitHub-hosted runners and OIDC; do not add an `NPM_TOKEN`
secret. npm creates provenance for the public package from this public repository.
See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for setup
and authentication requirements.

If the package does not exist on npm yet, publish its first verified archive
interactively, then configure the trusted publisher in the package settings:

```sh
# From the repository root, on the release commit
bun run client:check
bunx turbo run lint typecheck test --filter=@lootlog/sdk --filter=@lootlog/game-client-api
publication_dir="$(mktemp -d)"
bun packages/sdk/scripts/check-package.ts --pack-destination "$publication_dir"
npm login
npm publish "$publication_dir"/lootlog-sdk-*.tgz --access public --ignore-scripts
```

Use `--tag next` for a prerelease. This bootstrap publishes a real version; do
not rerun the workflow for that same version after configuring OIDC.

## Release a version

1. Update `packages/sdk/package.json` in a pull request. Use a new version;
   npm does not allow overwriting an already published name/version pair.
   Update the developer portal contract changelog with the version, release
   date and any migration instructions. Coordinate API changes with the
   service deployment before releasing the SDK that requires them.
2. Merge the reviewed change into `main`.
3. Open **Actions → Publish SDK → Run workflow**. Select `main`, enter the
   exact manifest version, and choose `latest` for a stable release or `next`
   for a prerelease. The workflow uses the commit selected by that run.
4. Verify the published version and installation from npm. If publication
   fails, inspect the run before retrying: the registry may already have
   accepted the version. Fix a published defect with a new version.

The workflow rejects version mismatches and prerelease versions tagged
`latest`. It never increments versions or publishes automatically on merge.
`game-client-api` participates in compatibility verification but is not
published by this workflow.
