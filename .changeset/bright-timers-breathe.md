---
"@lootlog/game-client": patch
---

Keep the shared timer clock inside live countdown tiles and schedule list removal at the next expiry boundary so one-second ticks no longer repeat list-wide timer work.
