# @lootlog/sdk

Generated fetch-only HTTP functions for the supported Lootlog API, with a shared
realtime client. No React dependency. API keys belong on trusted servers, never
in distributed userscripts or browser bundles.

```ts
import { configureLootlogApi } from "@lootlog/sdk";
import { usersControllerGetCurrentUserGuilds } from "@lootlog/sdk/main";

const restore = configureLootlogApi({ apiKey: process.env.LOOTLOG_API_KEY! });
try {
  const organizations = await usersControllerGetCurrentUserGuilds();
} finally {
  restore();
}
```

Use `environment: "development"` explicitly for development hosts. Configuration
is process-wide; per-request `apiClient` overrides support isolated callers.
HTTP failures throw `ApiError` with `status` and parsed `data`. Writes are never
retried automatically. Each key remains constrained by the user's current access.

Import `RealtimeClient` from `@lootlog/sdk/realtime`. On a trusted server pass
`webSocketFactory: (url, protocols) => new WebSocket(url, { protocols, headers:
{ "X-Api-Key": apiKey } })` with a server WebSocket implementation that supports
headers (for example Bun). Browser WebSocket cannot attach API key headers.
Use `wss://gateway.lootlog.pl/ws` or `wss://dev-gateway.lootlog.pl/ws` explicitly.
Keys support read subscriptions/queries only; presence and realtime writes remain
session-only. Do not put keys in URLs or subprotocols.

For local userscript integrations use the installed `lootlogGameClientApi` and
`@lootlog/game-client-api` types instead of HTTP keys.

`bun run client:generate` projects the reviewed operation inventory and generates
these functions from service OpenAPI documents. `bun run client:check` detects
drift; `bun run build` builds portable ESM and bundled declarations. Publication
is a separate explicit release action.

Builds use the repository's TypeScript 7 catalog version and tsdown. The shared
`packages/tsconfig.public-api.json` includes workspace source dependencies so
declarations are bundled without requiring consumers to install private packages.
Run `bun run test:package` to install both public packages in an isolated
consumer and verify all SDK entry points with runtime checks and TypeScript.
