import { asc, sql, type SQL } from "drizzle-orm";
import { NPC_TYPES_STRONGEST_FIRST } from "@lootlog/domain/npc-type";
import { npcSnapshotTable as npc } from "#src/database/drizzle/loot.schema";

// The order is a constant of the code, never input, so it is inlined as
// literals and the planner sees one fixed expression in every query.
const npcTypeStrengthRank = sql`case ${npc.type} ${sql.raw(
  NPC_TYPES_STRONGEST_FIRST.map(
    (type, rank) => `when '${type}' then ${rank}`,
  ).join(" "),
)} else ${sql.raw(String(NPC_TYPES_STRONGEST_FIRST.length))} end`;

/**
 * The ORDER BY of a loot's NPC snapshots, strongest first, as
 * `compareNpcsStrongestFirst` orders them; the snapshot id settles the rest.
 */
export const strongestNpcFirst: SQL[] = [
  npcTypeStrengthRank,
  sql`${npc.wt} desc nulls last`,
  sql`${npc.lvl} desc nulls last`,
  asc(npc.npcId),
  asc(npc.id),
];
