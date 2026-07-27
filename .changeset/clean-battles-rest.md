---
"@lootlog/battlelog-service": patch
"@lootlog/game-client": patch
---

Preserve every inbound runtime packet, share one full-envelope game event processor across overlapping client registrations, deduplicate semantic battle replays, and harden battle creation retries after lock or raw-storage failures.
