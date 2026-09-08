# @lootlog/game-client-api

Type-only contracts for the existing `window.lootlogGameClientApi` version 1.
This package does not install Lootlog or provide a runtime adapter.

```ts
import type { LootlogGameClientApi } from "@lootlog/game-client-api";
const api = (window as Window & { lootlogGameClientApi?: LootlogGameClientApi })
  .lootlogGameClientApi;
```

Use the installed game client's session. No API key is needed. `ready` means
that the game initialized; socket readiness and cached data are separate.
Read initial snapshots explicitly; subscriptions do not replay them. Dispose
subscriptions when your addon stops. See the developer portal for full examples.
