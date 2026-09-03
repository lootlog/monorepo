---
"@lootlog/activity": patch
"@lootlog/api": patch
"@lootlog/battlelog": patch
"@lootlog/client": patch
"@lootlog/discord-bot": patch
"@lootlog/gateway": patch
"@lootlog/protocol": patch
"@lootlog/search": patch
"@lootlog/schema": patch
---

Finish the backend Effect migration audit. Validate active RabbitMQ payloads at
the shared protocol boundary, keep runtime resources and background work inside
scoped Effect lifecycles, use schema-backed cache and external-data decoders,
preserve secrets as `Redacted` values until SDK boundaries, and replace
transport-shaped exceptions with semantic tagged application errors. Add a CI
architecture gate that prevents NestJS imports, nested Effect runtimes,
unchecked JSON assertions, synchronous Effect runners, and production console
logging from returning. Keep IDP-token acquisition Effect-native, reject
untyped Promise failures in production backend code, and remove tautological
endpoint-dispatch coverage. Use Effect `Clock` and the typed error channel
inside generators, enforced by an AST-backed architecture check.
