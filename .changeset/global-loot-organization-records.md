---
"@lootlog/api": patch
"@lootlog/gateway": patch
"@lootlog/loot-visibility": patch
"@lootlog/types": patch
"@lootlog/web": patch
---

Introduce Organization-owned Loot records while retaining one global Loot and
allocation. Apply one all-NPC visibility policy to API reads, statistics,
comments, archives, real-time events, and watched-item notifications, and add
an action-specific loot archive permission. Require version 2 loot events with
the complete NPC list across API, gateway, and web consumers.
