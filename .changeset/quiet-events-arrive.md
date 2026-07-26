---
"@lootlog/api": patch
"@lootlog/game-client": patch
---

Prevent duplicate game-event side effects when multiple client consumers mount, omit undefined fields from exported diagnostic logs, and keep concurrent loot submissions retryable while their distributed lock is held.
