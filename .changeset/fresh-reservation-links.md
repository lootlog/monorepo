---
"@lootlog/api": patch
"@lootlog/api-client": patch
"@lootlog/web": patch
---

Return Reservation sharing invitation paths from the API and build complete
links from the active Web origin so production invitations cannot inherit a
local development hostname. Accept the previous absolute-URL response during
the Web-first rollout. Keep partner reservations visible without letting them
affect local availability, nearest-free suggestions, or collision checks.
