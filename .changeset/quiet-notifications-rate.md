---
"@lootlog/api": patch
"@lootlog/api-client": patch
"@lootlog/game-client": patch
---

Prevent duplicate manual notification submissions in the Game client and rate
limit notification creation to five attempts per five seconds per authenticated
user with an atomic Redis limiter and a typed HTTP 429 response.
