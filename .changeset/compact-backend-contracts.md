---
"@lootlog/activity": patch
"@lootlog/api": patch
"@lootlog/auth": patch
"@lootlog/battlelog": patch
"@lootlog/search": patch
---

Derive backend HTTP contract types from their runtime schemas, share repeated
scalar validators, remove an unused generated fixture, and keep API migration
evidence out of the application build.
