---
"@lootlog/activity": patch
"@lootlog/api": patch
"@lootlog/auth": patch
"@lootlog/battlelog": patch
"@lootlog/gateway": patch
---

Migrate application-owned Redis connections from ioredis to BunRedis and Effect while preserving Redis keys, expiry behavior, and BullMQ queues.
