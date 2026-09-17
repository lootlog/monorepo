# @lootlog/sdk

Read Lootlog timers, loot and battle data from your own scripts, bots and server
applications. Includes typed HTTP functions and a WebSocket client for realtime
updates. Works with Node.js and Bun; React is not required.

[Documentation](https://developer.lootlog.pl/docs/sdk) ·
[API reference](https://developer.lootlog.pl/reference)

## Install

```sh
npm install @lootlog/sdk
# or
bun add @lootlog/sdk
```

The package uses ES modules and includes TypeScript declarations. Use a runtime
with built-in `fetch`, such as Node.js 22+ or Bun.

## Set up your API key

Create a key at [developer.lootlog.pl/keys](https://developer.lootlog.pl/keys).
Select the Organizations you want to access and read-only permissions to follow
these examples. The key's owner must also have access to the requested data.

Keep the key on your server. Never put it in frontend code or a distributed
userscript. For in-game addons, use the
[game client API](https://developer.lootlog.pl/docs/game-client).

Set `LOOTLOG_API_KEY` in your deployment secrets or a local `.env` file excluded
from version control:

```dotenv
LOOTLOG_API_KEY=replace-with-your-key
```

## Find your organization

Save this complete example as `organizations.mjs`:

```js
import { configureLootlogApi } from "@lootlog/sdk";
import { usersControllerGetCurrentUserGuilds } from "@lootlog/sdk/main";

const apiKey = process.env.LOOTLOG_API_KEY;
if (!apiKey) throw new Error("Set LOOTLOG_API_KEY");

configureLootlogApi({ apiKey, environment: "production" });

const organizations = await usersControllerGetCurrentUserGuilds({
  signal: AbortSignal.timeout(10_000),
});

console.table(
  organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    accessible: organization.hasLootlogAccess,
    stale: organization.isAccessDataStale,
  })),
);
```

Run it with your `.env` file:

```sh
node --env-file=.env organizations.mjs
# or: Bun loads .env automatically
bun organizations.mjs
```

Copy an accessible Organization's `id` into `LOOTLOG_GUILD_ID` in your `.env`:

```dotenv
LOOTLOG_GUILD_ID=replace-with-the-organization-id
LOOTLOG_WORLD=fobos
```

The API calls this identifier `guildId`: it is the Organization's Discord guild
ID. Replace `fobos` with your Margonem world. If `stale` is true, the returned
access information is outdated.

For the development environment, create a key at
[dev-developer.lootlog.pl/keys](https://dev-developer.lootlog.pl/keys) and use
`environment: "development"`. Keys are specific to their environment.

## Fetch timers and the latest loot

Save this complete example as `lootlog.mjs`. It prints NPC spawn windows and the
latest 20 loot records for your chosen Organization and world.

```js
import { configureLootlogApi } from "@lootlog/sdk";
import {
  lootsControllerFetchLootsByGuildId,
  timersControllerGetTimers,
} from "@lootlog/sdk/main";

const apiKey = process.env.LOOTLOG_API_KEY;
const guildId = process.env.LOOTLOG_GUILD_ID;
const world = process.env.LOOTLOG_WORLD;
if (!apiKey || !guildId || !world) {
  throw new Error("Set LOOTLOG_API_KEY, LOOTLOG_GUILD_ID and LOOTLOG_WORLD");
}

configureLootlogApi({ apiKey, environment: "production" });

const timers = await timersControllerGetTimers(
  { guildId },
  { world },
  { signal: AbortSignal.timeout(10_000) },
);

console.table(
  timers.map((timer) => ({
    npc: timer.npc.name,
    level: timer.npc.lvl,
    location: timer.npc.location,
    earliestSpawn: timer.minSpawnTime,
    latestSpawn: timer.maxSpawnTime,
  })),
);

const loots = await lootsControllerFetchLootsByGuildId(
  { guildId },
  { world, limit: 20 },
  { signal: AbortSignal.timeout(10_000) },
);

console.table(
  loots.map((loot) => ({
    id: loot.id,
    date: loot.createdAt,
    npcs: loot.npcs.map((npc) => npc.name).join(", "),
    items: loot.items.map((item) => item.name).join(", "),
    players: loot.players.map((player) => player.name).join(", "),
  })),
);
```

Run `node --env-file=.env lootlog.mjs` or `bun lootlog.mjs`.

Both functions return arrays of parsed objects. Dates are ISO strings; use
`new Date(value)` to format them in your time zone. A timer describes a spawn
window, not confirmation that an NPC is currently alive. Results reflect the
key's scope and the owner's permissions; an empty array is a successful request
with no visible results.

## Filter loot and fetch the next page

In `lootlog.mjs`, replace the `const loots = ...` request with this block to read
legendary loot from the last seven days:

```js
const filters = {
  world,
  limit: 20,
  rarities: ["LEGENDARY"],
  createdAtMin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const loots = await lootsControllerFetchLootsByGuildId({ guildId }, filters, {
  signal: AbortSignal.timeout(10_000),
});
```

You can also filter by `npcs`, `players`, `itemNames` and level ranges. Your
editor shows the available query fields; the
[API reference](https://developer.lootlog.pl/reference) describes their values.

To load one more page, add this after the first request:

```js
const lastLoot = loots.at(-1);
const nextPage = lastLoot
  ? await lootsControllerFetchLootsByGuildId(
      { guildId },
      { ...filters, cursor: lastLoot.id },
      { signal: AbortSignal.timeout(10_000) },
    )
  : [];

console.log(`Next page: ${nextPage.length} loot records`);
```

Loot is ordered by descending ID. Pass the last record's `id` as `cursor` and
keep the same filters to fetch older records. `limit` accepts 1–100. There is
no `nextCursor` response wrapper; an empty page means there are no more results.

## TypeScript and imports

Import operations and response types from the service you need:

```ts
import {
  timersControllerGetTimers,
  type TimerResponseDto,
} from "@lootlog/sdk/main";

// After configuring the SDK as shown above:
const timers: TimerResponseDto[] = await timersControllerGetTimers(
  { guildId: "123456789012345678" },
  { world: "fobos" },
);
```

Return types are inferred, so the annotation is optional. There is no separate
`@types/lootlog` package. For Node.js TypeScript projects, use `"type": "module"`
in `package.json`, `module: "NodeNext"` and `moduleResolution: "NodeNext"` in
`tsconfig.json`, and install `@types/node`.

| Import                           | Contents                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `@lootlog/sdk`                   | Authentication and environment configuration                                   |
| `@lootlog/sdk/main`              | Organizations, timers, loot and main API types                                 |
| `@lootlog/sdk/activity`          | Activity operations and types                                                  |
| `@lootlog/sdk/battlelog`         | Battle records and statistics                                                  |
| `@lootlog/sdk/search`            | Item, NPC and player search                                                    |
| `@lootlog/sdk/realtime`          | WebSocket client and event types                                               |
| `@lootlog/sdk/openapi/main.json` | OpenAPI specification; also available for `activity`, `battlelog` and `search` |

For the HTTP examples above, arguments are **path parameters, query parameters,
request options**. Other operations may accept a body; follow their generated
signature.

## Handle errors

Failed HTTP requests throw an error named `ApiError` with `status` and `data`.
The constructor is not exported. Wrap your requests in `try`/`catch` and inspect
the status:

```js
try {
  const timers = await timersControllerGetTimers(
    { guildId },
    { world },
    { signal: AbortSignal.timeout(10_000) },
  );
  console.log(`Loaded ${timers.length} timers`);
} catch (error) {
  const status =
    error instanceof Error && "status" in error ? error.status : undefined;

  if (status === 401) {
    console.error("Check the API key, expiration and environment");
  } else if (status === 403) {
    console.error("Check the key's scope and your organization permissions");
  } else if (status === 429) {
    console.error("Rate limit reached; wait before making another request");
  } else {
    console.error("Request failed", { status });
  }
}
```

Network errors and timeouts have no HTTP status; `cause` retains the underlying
failure. The SDK does not automatically retry HTTP requests. Keep errors distinct
from an empty result and mark previously loaded data stale after a failed refresh.

## Next steps

`configureLootlogApi` sets process-wide HTTP configuration. Configure it once
when your application starts. Its returned function restores the previous
configuration when called. Do not change global configuration for individual requests in a server handling
multiple keys concurrently.

- [Realtime subscriptions](https://developer.lootlog.pl/docs/realtime): receive timer updates over WebSocket.
- [Keys and permissions](https://developer.lootlog.pl/docs/keys): scope access and rotate credentials.
- [Errors and limits](https://developer.lootlog.pl/docs/errors): handle failed requests and rate limits.
- [Changelog](https://developer.lootlog.pl/docs/changelog): published contract changes.
