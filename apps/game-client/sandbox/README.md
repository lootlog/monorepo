# Game-client sandbox

Runs the real game-client outside Margonem, on a fake Margonem runtime, against
the local Lootlog stack. Use it to iterate on Game client UI and to verify
changes in a browser without logging into the game.

```bash
bun run --cwd apps/game-client dev:sandbox
```

Open <http://localhost:3010>. It redirects to `/sandbox/`, which uses the new
interface (NI). `?interface=si` switches to the legacy interface (SI).

## How it works

- `main.ts` installs fake Margonem globals before it imports `@/bootstrap`. The
  runtime projection picks the NI or SI adapter when its module is evaluated,
  so this order matters.
- `fake-runtime/` keeps a mutable world (hero, map, NPCs, other players,
  party). It exposes that world through the surface the adapters in
  `src/lib/margonem-runtime/` read:
  - NI: `Engine.hero`, `map`, `npcs`, `others`, `party`,
    `communication.parseJSON`
  - SI: `g`, `hero`, `map`, `successData`

  Optional subsystems such as the renderer, minimap, chat host and tooltips
  stay absent. Their adapters take the same "unavailable" path they take while
  the game starts up.

- Every packet goes through the native seam, NI `parseJSON` or SI
  `successData`. The fake applies the packet to the world first. Then the real
  bridge, projection and processors observe it, as they do in game.
- `vite.sandbox.config.ts` proxies `/api/auth`, `/api/lootlog`,
  `/api/battlelog` and `/gateway` to `http://localhost`:
  - Page and API share an origin, so the session cookie set by the local Web
    app is sent and CORS configs stay unchanged.
  - Gateway upgrades carry a Margonem origin, so the socket joins as a Game
    client.

## Session

Sign in on the local Web app at <http://localhost>, then reload the sandbox.
Without a session, the page still renders, but API and gateway calls return 401.

## Driving it

The left sidebar opens Lootlog windows, emits scenario packets (NPC spawns,
battles, loot, map changes, players, party, AFK) and sends raw JSON packets.
The same controls are available from the console or from an agent:

```js
__sandbox.scenarios(); // scenario ids
__sandbox.run("spawn-titan");
__sandbox.emit({ h: { x: 20, y: 12 } });
__sandbox.openWindow("settings");
__sandbox.world; // live fake Margonem state
```

Scenario builders reuse
`src/features/settings/components/debug/debug-game-events.ts`, which the
settings debug tab also uses.

## Limits

- The Margonem account proof request fails, so the gateway marks the character
  as `reported` instead of `verified`.
- The character list comes from `fake-runtime/character-list.ts`. It is seeded into
  `localStorage.Margonem.charlist`, where the game caches its charlist response
  and where Lootlog reads first. The public API request with `hs3` never runs.
- There is no game canvas, so glow, air tags and map-ping rendering are
  inactive.
- The panel copy is English because it is dev tooling that never ships.
