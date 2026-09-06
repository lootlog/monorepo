# Browser extension development

Lootlog builds the same game overlay as a userscript and a WXT extension. The extension runs the overlay in Margonem's MAIN world and proxies Lootlog HTTP and realtime traffic through its background context. Settings remain in the game client's existing storage.

For installation steps, see [Install the Lootlog extension](./INSTALLATION.md).

## Build and load

Run commands from `apps/game-client`. Extension service URLs are owned by `extension/build-profile.ts`; userscript `.env*` files and shell `VITE_*` values cannot override them. Local builds use localhost and JSON realtime frames. Production builds use the production Lootlog services and MessagePack. Updating deployment addresses requires changing this profile and rebuilding.

| Command                                                                 | Result                                                |
| ----------------------------------------------------------------------- | ----------------------------------------------------- |
| `bun run build:extension`                                               | Local Chromium: `.output/chrome-mv3/`                 |
| `bun run build:extension:firefox`                                       | Local Firefox: `.output/firefox-mv3/`                 |
| `bun run build:extension:production`                                    | Production Chromium: `.output/production/chrome-mv3/` |
| `bun run build:extension:production:firefox`                            | Production Firefox: `.output/production/firefox-mv3/` |
| `bun run zip:extension` / `zip:extension:firefox`                       | Local archives in `.output/`                          |
| `bun run zip:extension:production` / `zip:extension:production:firefox` | Production archives in `.output/production/`          |
| `bun run dev:extension` / `dev:extension:firefox`                       | Local WXT development with reload                     |
| `bun run zip:extension:sources`                                         | Reviewer sources in `.output/`                        |
| `bun run build`                                                         | Existing userscript in `dist/`                        |

Local Firefox builds explicitly omit CSP's automatic HTTPS upgrade so the local gateway can use `ws://localhost`. Production keeps the browser's default CSP. Zod runs without its dynamic-code optimization in the extension transport.

Every build checks manifest host permissions, bundled service endpoints and content-script UTF-8 before ZIP packaging. Production and local build directories are separate; rebuilding production does not replace an installed local addon. Extension build tasks bypass Turbo caching so artifact checks run each time.

WXT development watches source changes and reloads affected extension code. Treat changes to the MAIN overlay as a restart: React component state is not guaranteed to survive. Keep the existing application services running; these commands only manage the extension development process.

In Chrome or Edge, open the extensions page, enable developer mode, and load the `.output/chrome-mv3/` directory as an unpacked extension. In Firefox, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `.output/firefox-mv3/manifest.json`. Temporary Firefox installs disappear when the browser closes. Reload the Margonem page after loading the extension.

Minimum supported versions are Chromium 116 and Firefox 140. Firefox uses the extension ID `game-client@lootlog.pl`. An unpacked Chromium build can use `EXTENSION_CHROME_KEY` in `.env.local` to keep its ID stable. This value is the manifest's public key, never a private signing key. Configure the resulting origin on the Better Auth server before testing authenticated operations. Store IDs and development IDs need separate server configuration.

Configure the exact `chrome-extension://<id>` in the auth service's `TRUSTED_ORIGINS` and gateway's `ALLOWED_EXTENSION_ORIGINS` (comma-separated). Preserve existing values. Deploy the backend changes before loading this client. Do not use a wildcard for Chromium origins.

Firefox assigns a UUID origin per installation. The gateway permits these origins only with an authenticated, single-use ticket bound to that origin; it rejects cookie-only Firefox extension upgrades. Ticket requests supply `x-lootlog-extension-origin` from the extension background because Firefox can omit HTTP `Origin`. A native origin takes precedence. Do not add `moz-extension://*` to Better Auth trusted origins.

The toolbar action opens Lootlog. When authentication is unavailable, the overlay shows a centered draggable login window with a website link and session retry. Closing it hides it until the next game reload. Confirmed logout or account replacement disconnects the game client and clears its cached session data before another account starts. The userscript retains its existing authentication behavior.

## TypeScript and IDE setup

Run `bun run typecheck` to generate WXT declarations with `wxt prepare` and check the game client in one TypeScript project. The main `tsconfig.json` includes the overlay, extension entrypoints, WXT configuration, shared Vite configuration, and `.wxt/wxt.d.ts`. Run this command after a fresh checkout so the IDE can resolve WXT declarations.

## Release review

Build with production service URLs and inspect each generated manifest before packaging. Check host permissions, version, browser minimum, and the absence of localhost URLs. The extension contains its executable game-client code and CSS; it must not load the userscript bundle from the server.

Before submission, verify login, logout, loot, battlelog, timers, chat, reconnect, and settings in both game interfaces. Repeat after a page reload, a character/world change, a background restart, and with the userscript also installed. Only one client should remain active. Check that an old document cannot send events into a new connection.

Prepare the listing separately for each store:

- Use the packaged Lootlog icon and screenshots from the current release.
- Describe the gameplay features and explain the exact Lootlog host permissions.
- Link the current privacy policy and declare the data actually transmitted by the client. The Firefox manifest declares authentication, personal communications, website content, and website activity for sessions, Organization chat, and gameplay records; review these categories whenever collection changes.
- Give reviewers a reproducible Margonem and Lootlog access procedure through the store's private review fields. Do not commit credentials or private account data.
- Explain how to observe the overlay, record a supported gameplay event, and verify the corresponding Lootlog record.
- Keep the submitted source archive, build commands, dependency lockfile, and deployed backend revision together for review and rollback.

Publishing requires store accounts, final listing material, and store-assigned IDs. Building or creating a ZIP does not publish the extension.

Firefox 140 is the minimum because it provides Mozilla's built-in data consent. See [Firefox data collection consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/). Earlier versions would require a separate consent UI.

## Reviewer source archive

Run `bun run zip:extension:sources` (Bun; no Python required) from a clean Git worktree to create a local archive containing tracked repository source. The command refuses untracked files and staged or unstaged changes. Build the release and its source archive from the same clean revision. The script excludes local environment files, credential-named files, dependencies, vendored reference repositories, and build outputs. Inspect the archive before sharing; this command never uploads it. WXT's workspace-only source archive is disabled because the client imports other monorepo packages.

To reproduce the extension in an empty directory:

1. Extract the source archive at that directory's root.
2. Install Bun 1.4.2, then run `bun install --frozen-lockfile`.
3. Review the public endpoint profile in `apps/game-client/extension/build-profile.ts`.
4. Run `bun run --cwd apps/game-client build:extension:production` or `bun run --cwd apps/game-client build:extension:production:firefox`.

Record the actual public build inputs, version, commit identifier, and build timestamp alongside a submission. Confirm the service routes against the deployed environment before producing a release archive. Store approval and signing remain separate from local packaging.
