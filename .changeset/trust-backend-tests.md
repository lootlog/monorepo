---
"@lootlog/api": patch
---

Replace the mocked API boundary smoke test with a real HTTP, authorization,
Redis, and PostgreSQL timer workflow. Fix manual timer responses and reads when
optional actor or NPC type data is absent.
