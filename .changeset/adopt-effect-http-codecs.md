---
"@lootlog/api": patch
"@lootlog/activity": patch
"@lootlog/auth": patch
"@lootlog/battlelog": patch
"@lootlog/discord-bot": patch
"@lootlog/gateway": patch
"@lootlog/search": patch
"@lootlog/schema": patch
---

Make Effect Schema and HttpApi the API transport source of truth. Replace the
remaining API Zod DTOs and environment parsing with Effect Schema and Effect
Config, encode application timestamps explicitly at HTTP boundaries, and
generate the compatible public OpenAPI document from the HttpApi contract.
Make the same schema-first contract direction consistent across every backend
HTTP service, including the Gateway health boundary and Discord Bot internal
API, and remove the reverse OpenAPI-to-Effect generator.
