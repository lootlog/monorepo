---
"@lootlog/api": patch
---

Query Organization Loot records directly when paginating loot lists so PostgreSQL can use the tenant-scoped ordering index before loading global loot facts.
