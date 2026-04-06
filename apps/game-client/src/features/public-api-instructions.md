# Lootlog Game Client Public API v1

API for addons (userscripts) running in the Margonem page context. Provides read-only access to guilds, timers, and socket state.

## Access

```js
const api = window.lootlogGameClientApi;
```

The API object is available on `window` as soon as the game-client script loads. It is frozen and read-only.

## Properties

| Property     | Type      | Description                                                                 |
| ------------ | --------- | --------------------------------------------------------------------------- |
| `apiVersion` | `1`       | API contract version. Will increment on breaking changes.                   |
| `ready`      | `boolean` | `true` after the game has initialized. Always check before calling getters. |

## Waiting for ready

The `ready` property is `false` until the game engine has fully initialized. If your addon runs early, wait for the `ready` event:

```js
const api = window.lootlogGameClientApi;

if (api.ready) {
  start();
} else {
  api.subscribe("ready", () => start());
}
```

## Methods

### `getGuilds()`

Returns the current user's guilds, or `undefined` if not yet loaded.

```js
const guilds = api.getGuilds();
// [{ id: "abc", name: "My Guild", icon: "icon.png", vanityUrl: "my-guild" }]
```

**Return type:** `PublicGuild[] | undefined`

| Field       | Type             | Description     |
| ----------- | ---------------- | --------------- |
| `id`        | `string`         | Guild ID        |
| `name`      | `string`         | Guild name      |
| `icon`      | `string \| null` | Guild icon URL  |
| `vanityUrl` | `string?`        | Custom URL slug |

---

### `getTimers(options)`

Returns timers for a given world, or `undefined` if not loaded. The `world` parameter is required.

```js
const timers = api.getTimers({ world: "tempest" });
// [{ timerKey: "...", npc: { name: "Dragon", ... }, minSpawnTime: "2026-01-01T12:00:00.000Z", ... }]
```

**Return type:** `PublicTimer[] | undefined`

| Field          | Type              | Description                              |
| -------------- | ----------------- | ---------------------------------------- |
| `timerKey`     | `string`          | Unique timer identifier                  |
| `npcId`        | `number`          | NPC ID                                   |
| `npc`          | `PublicNpc`       | NPC details (name, lvl, icon, etc.)      |
| `member`       | `PublicMember`    | Guild member who set the timer           |
| `members`      | `PublicMember[]?` | Additional members (if applicable)       |
| `world`        | `string`          | Game world name                          |
| `guildId`      | `string`          | Guild ID the timer belongs to            |
| `minSpawnTime` | `string`          | Earliest spawn time (ISO 8601)           |
| `maxSpawnTime` | `string`          | Latest spawn time (ISO 8601)             |
| `updatedAt`    | `string \| null`  | Last update timestamp (ISO 8601) or null |
| `isCustomTime` | `boolean?`        | Whether spawn time was manually set      |
| `isPending`    | `boolean?`        | Whether the timer is pending             |
| `wasReset`     | `boolean?`        | Whether the timer was reset              |

Calling `getTimers()` without `world` returns `undefined`.

---

### `getSocketState()`

Returns the current WebSocket connection state.

```js
const state = api.getSocketState();
// { connected: true, joined: true, joinedGuilds: ["guild-1", "guild-2"] }
```

**Return type:** `PublicSocketState`

| Field          | Type       | Description                                    |
| -------------- | ---------- | ---------------------------------------------- |
| `connected`    | `boolean`  | Whether the WebSocket is connected             |
| `joined`       | `boolean`  | Whether the client has joined the gateway      |
| `joinedGuilds` | `string[]` | IDs of guilds the client is receiving data for |

---

### `subscribe(eventName, listener)`

Subscribes to an event. Returns an unsubscribe function.

```js
const unsubscribe = api.subscribe("timers:changed", (data) => {
  console.log(data.world, data.guildId, data.timers);
});

// Later:
unsubscribe();
```

## Events

### `ready`

Fired once when the game finishes initializing.

```js
api.subscribe("ready", () => {
  console.log("Game initialized, API is safe to use");
});
```

**Payload:** none

---

### `guilds:changed`

Fired when the user's guild list changes (added, removed, or updated).

```js
api.subscribe("guilds:changed", (guilds) => {
  console.log("Guilds updated:", guilds);
});
```

**Payload:** `PublicGuild[] | undefined`

---

### `timers:changed`

Fired when timers change for a specific world and guild. Emitted separately per guild.

```js
api.subscribe("timers:changed", ({ world, guildId, timers }) => {
  console.log(`Timers changed for guild ${guildId} on ${world}:`, timers);
});
```

**Payload:** `{ world: string, guildId: string, timers: PublicTimer[] }`

---

### `socket:state-changed`

Fired when the WebSocket connection state changes (connect, disconnect, join, guild list update).

```js
api.subscribe("socket:state-changed", (state) => {
  if (!state.connected) {
    console.log("Lost connection to gateway");
  }
});
```

**Payload:** `PublicSocketState`

## Important notes

- All getters and event payloads return **cloned snapshots**, never live references. Mutating the returned objects has no effect on the internal state.
- `subscribe` does **not** replay the current state. Read the snapshot first with the corresponding getter, then subscribe to changes.
- `undefined` from a getter means "data not yet loaded". An empty array means "loaded, but no results".
- Event deduplication is built-in: events only fire when the underlying data actually changes, not on every internal cache update.
- Errors thrown inside event listeners are caught and logged. A broken listener will not crash the game client.
