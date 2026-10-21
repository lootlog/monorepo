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

## Faction war states

- `?faction-war=pick` answers the faction war endpoints in the browser with a
  running war and no pick, so the pick screen opens. Picking goes through the
  real mutation against that fake and plays the full selection.
- `?faction-war=champions` makes the hero, Aurelia (Barbatos) and Borgin
  (Tanroth) champions and draws a small map (`?scene=map`): rings under them
  and the crest in hovered tips, on NI (`/sandbox/?faction-war=champions`) and
  SI (`&interface=si`). "Champion walks" moves Aurelia.
- `?faction-war=ended` ends the war with Barbatos ahead; the hero picked
  Barbatos and is a champion, so the result screen opens with every line.
  The panel switches to `ended-tie` and `ended-none` (nobody scored), and
  "Forget seen result" shows the screen again.
- `?faction-war=disqualified` is a running war the hero picked in and was
  excluded from: the settings say so and no point toasts appear.
- While the hero has a pick, kills and loot the local API accepts come back
  with 40 faction war points, so the point toasts follow real events. The
  panel's "Point toasts (burst)" sends three awards inside the merge window.
- The champions endpoint answers only with the hero's `world` query.
- Every mode falls back to a fake session when the local auth service is
  down. The art is served from `apps/web/public/faction-wars` by the sandbox
  server.

## Limits

- The Margonem account proof request fails, so the gateway marks the character
  as `reported` instead of `verified`.
- The character list comes from `fake-runtime/character-list.ts`. It is seeded into
  `localStorage.Margonem.charlist`, where the game caches its charlist response
  and where Lootlog reads first. The public API request with `hs3` never runs.
- Without `?scene=map` there is no game canvas, so glow, air tags and
  map-ping rendering are inactive.
- The panel copy is English because it is dev tooling that never ships.
