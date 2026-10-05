import { defineRelations } from "drizzle-orm";
import * as schema from "./schema.js";

export const relations = defineRelations(schema, (r) => ({
  battles: {
    warriors: r.many.battleWarriors(),
  },
  battleWarriors: {
    battle: r.one.battles({
      from: r.battleWarriors.battleId,
      to: r.battles.id,
    }),
  },
}));
