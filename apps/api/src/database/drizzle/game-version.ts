import {
  EN_EDITION_WORLDS,
  type GameVersion,
} from "@lootlog/schema/game-version";
import { sql, type SQLWrapper } from "drizzle-orm";
import { lootTable } from "./schema.js";

// The world list is a code constant, written as literals so that a query can
// group by this expression: PostgreSQL matches GROUP BY expressions by text,
// and bound parameters get a new number at every use.
const enWorldList = sql.raw(
  [...EN_EDITION_WORLDS]
    .map((world) => {
      if (!/^[a-z0-9-]+$/.test(world)) {
        throw new Error(`Unexpected world name: ${world}`);
      }

      return `'${world}'`;
    })
    .join(", "),
);

/** `gameVersionOfWorld` in SQL, for rows that store only a world. */
export const gameVersionOfWorldSql = (world: SQLWrapper) =>
  sql<GameVersion>`(case when lower(${world}) in (${enWorldList}) then 'en' else 'pl' end)::"GameVersion"`;

/** A loot's edition: its declared game version, else its world's edition. */
export const lootGameVersionSql = sql<GameVersion>`coalesce(${lootTable.gameVersion}, ${gameVersionOfWorldSql(lootTable.world)})`;
