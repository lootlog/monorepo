import {
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { gameVersionEnum } from "./loot.schema.js";

/**
 * The map tiles where a monster stood when Game clients reported its kill,
 * for the wiki. Margonem maps are the same on every world, so a tile carries
 * no world, Organization, or reporter. `reports` counts submissions, not
 * kills: every reporter of one kill and every retry adds to it.
 */
export const npcSpawnPositionTable = pgTable(
  "NpcSpawnPosition",
  {
    gameVersion: gameVersionEnum("gameVersion").notNull(),
    mapId: integer("mapId").notNull(),
    npcName: text("npcName").notNull(),
    x: smallint("x").notNull(),
    y: smallint("y").notNull(),
    mapName: text("mapName").notNull(),
    /** The latest reported Margonem template id (`npc.tpl`). */
    templateId: integer("templateId"),
    reports: integer("reports").notNull().default(1),
    firstReportedAt: timestamp("firstReportedAt", {
      mode: "date",
      precision: 3,
    })
      .defaultNow()
      .notNull(),
    lastReportedAt: timestamp("lastReportedAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.gameVersion,
        table.mapId,
        table.npcName,
        table.x,
        table.y,
      ],
      name: "NpcSpawnPosition_pkey",
    }),
  ],
);
