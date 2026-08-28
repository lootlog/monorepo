---
"@lootlog/docs": patch
"@lootlog/landing": patch
"@lootlog/traffic-splitter": patch
---

Namespace static assets and manage the shared development and production
traffic-splitter code from the repository. Keep the Workers independently
deployable, promote the production splitter before frontend artifacts, and
verify public CSS and JavaScript before closing the rollback boundary.
