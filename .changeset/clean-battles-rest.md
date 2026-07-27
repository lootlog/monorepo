---
"@lootlog/battlelog-service": patch
"@lootlog/game-client": patch
---

Preserve inbound runtime packets, deduplicate battle, loot, and timer effects at their domain boundaries, and harden battle creation retries after lock or raw-storage failures.
