# @lootlog/sdk

Typed HTTP functions and a realtime client for the Lootlog public API. Works
with Node.js and Bun, without React. Use API keys only in trusted server
applications; never include them in browser bundles or distributed userscripts.

## Install

```sh
npm install @lootlog/sdk
# or
bun add @lootlog/sdk
```

The first published version is `0.1.0`. See the
[package on npm](https://www.npmjs.com/package/@lootlog/sdk) and the
[developer portal](https://developer.lootlog.pl/docs/sdk).

## Read your organizations

Create an API key in the developer portal and provide it through the
`LOOTLOG_API_KEY` environment variable. Save this example as `example.ts`:

```ts
import { configureLootlogApi } from "@lootlog/sdk";
import { usersControllerGetCurrentUserGuilds } from "@lootlog/sdk/main";

const apiKey = process.env.LOOTLOG_API_KEY;
if (!apiKey) throw new Error("Missing LOOTLOG_API_KEY");

const cleanup = configureLootlogApi({
  apiKey,
  environment: "development",
});

try {
  const organizations = await usersControllerGetCurrentUserGuilds();
  for (const organization of organizations) {
    console.log({
      id: organization.id,
      name: organization.name,
      access: organization.hasLootlogAccess,
      stale: organization.isAccessDataStale,
    });
  }
} catch (error) {
  console.error("Could not load organizations:", error);
} finally {
  cleanup();
}
```

Run `bun example.ts` after setting the environment variable. This example sends
`GET https://dev-api.lootlog.pl/users/@me/guilds` with the key in `X-Api-Key`.
Use a development key for this example. For production, use a production key
and set `environment: "production"` (the default).

Configuration is process-wide. Configure a long-running application once and
call the returned cleanup function when it stops. Use per-request `apiClient`
overrides to isolate callers with different configuration. Each key remains
constrained by its policy and the user's current access.

## Entry points

| Import                           | Purpose                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `@lootlog/sdk`                   | Configure service URLs, API key and fetch implementation                               |
| `@lootlog/sdk/main`              | Organizations, loot, timers and other main API operations                              |
| `@lootlog/sdk/activity`          | Activity API operations                                                                |
| `@lootlog/sdk/battlelog`         | Battle API operations                                                                  |
| `@lootlog/sdk/search`            | Search API operations                                                                  |
| `@lootlog/sdk/realtime`          | WebSocket client and protocol exports                                                  |
| `@lootlog/sdk/openapi/main.json` | Public main API specification; also available for `activity`, `battlelog` and `search` |

Operation names and response types are generated from the public OpenAPI
specifications. HTTP failures throw an `ApiError` with `status` and parsed
`data`. Pass an `AbortSignal` in request options to cancel a request. Writes
are never retried automatically.

The paginated Organization loot list does not provide a total count. There is
no `lootsControllerCountLootsByGuildId` function in this release.

## Realtime and game addons

Import `RealtimeClient` from `@lootlog/sdk/realtime`. Server integrations must
use a WebSocket implementation that can send the `X-Api-Key` header. Browser
WebSocket cannot attach this header. Keys support read subscriptions and
queries; presence and realtime writes remain session-only. Do not put keys in
URLs or subprotocols. See the
[complete Bun realtime example](https://developer.lootlog.pl/docs/realtime#bun-example).

Game addons use the installed `window.lootlogGameClientApi` directly, with the
game client's session. See the
[game client API guide](https://developer.lootlog.pl/docs/game-client).

## Development and releases

From the repository root, `bun run client:generate` generates clients and
`bun run client:check` verifies that tracked contracts are current. In this
package, `bun run build` builds ESM and bundled declarations;
`bun run test:package` verifies packed packages in an isolated consumer.
Consumers do not need private Lootlog workspace packages.

Maintainers publish new versions through the manual **Publish SDK** GitHub
Actions workflow after configuring npm Trusted Publishing. Publication runs
on a GitHub runner and does not require the maintainer's computer or a local
npm login. See the
[publication guide](https://github.com/lootlog/monorepo/blob/main/packages/sdk/PUBLISHING.md).
