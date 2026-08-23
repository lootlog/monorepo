---
"@lootlog/game-client": patch
---

Project Margonem events into Lootlog stores after the game handler returns, defer processors through a bounded FIFO queue, and stop inactive player and timer integrations from producing unnecessary work.
