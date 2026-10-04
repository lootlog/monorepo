import { defineRelations } from "drizzle-orm";
import * as schema from "./schema.js";

// Participants join on the owner too: compressed chunks are segmented by owner,
// so a lookup by battle ID alone decompresses the whole chunk.
export const relations = defineRelations(schema, (r) => ({
  battles: {
    warriors: r.many.battleWarriors({
      from: [r.battles.id, r.battles.userId],
      to: [r.battleWarriors.battleId, r.battleWarriors.userId],
    }),
  },
  battleWarriors: {
    battle: r.one.battles({
      from: [r.battleWarriors.battleId, r.battleWarriors.userId],
      to: [r.battles.id, r.battles.userId],
    }),
  },
}));
