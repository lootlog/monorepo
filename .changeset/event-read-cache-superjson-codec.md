---
"@lootlog/nest-shared": patch
"@lootlog/api": patch
---

Round-trip the event read cache through superjson instead of a hand-maintained
list of date field names. `RedisService.getOrSetJson`/`getOrSetJsonBestEffort`
now accept an optional `codec` so callers can bring their own JSON serializer;
the default stays `JSON`. The event read cache passes a superjson codec, so any
`Date` in an event read model survives the cache without being registered
anywhere. The internal cache key prefix is bumped so stale entries expire on
their own. No HTTP contract change.
