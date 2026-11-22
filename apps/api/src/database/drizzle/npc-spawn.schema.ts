import {
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { gameVersionEnum } from "./loot.schema.js";

export const npcSpawnPositionTable = pgTable(
  "NpcSpawnPosition",
  {
    gameVersion: gameVersionEnum("gameVersion").notNull(),
    mapId: integer("mapId").notNull(),
    npcName: text("npcName").notNull(),
    x: smallint("x").notNull(),
    y: smallint("y").notNull(),
    mapName: text("mapName").notNull(),
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
