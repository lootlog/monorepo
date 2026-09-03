---
"@lootlog/api": patch
"@lootlog/client": patch
---

Return HTTP 403 instead of an internal server error when an authenticated user
cannot access guild metadata or resolved guild permissions.
