---
"@lootlog/activity": patch
"@lootlog/api": patch
"@lootlog/auth": patch
"@lootlog/battlelog": patch
"@lootlog/cli": patch
"@lootlog/client": patch
"@lootlog/discord-bot": patch
"@lootlog/domain": patch
"@lootlog/game-client": patch
"@lootlog/gateway": patch
"@lootlog/messaging": patch
"@lootlog/protocol": patch
"@lootlog/schema": patch
"@lootlog/search": patch
"@lootlog/web": patch
"@lootlog/wiki": patch
---

Move the repository runtime and package manager to Bun, compose backend services
with Effect, adopt Drizzle for service-owned databases, consolidate generated
HTTP clients, and introduce the coordinated realtime v1 protocol with explicit
presence publication and precise-location authorization.
