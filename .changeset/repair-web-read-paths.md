---
"@lootlog/api": patch
"@lootlog/gateway": patch
"@lootlog/protocol": patch
"@lootlog/web": patch
"@lootlog/wiki": patch
---

Restore web read flows after the Effect rewrite by encoding database dates through each endpoint's response codec at the HTTP boundary, querying loot statistics through the native Effect PostgreSQL client, validating cached reservation catalog entries, normalizing Discord guild icon hashes and CDN URLs, aligning local realtime proxy paths and origins, preserving omitted optional fields through MessagePack realtime frames, and assigning distinct local development ports to docs and wiki.
