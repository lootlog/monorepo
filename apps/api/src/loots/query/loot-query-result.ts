import type { MapPlayersSnapshot } from "@lootlog/protocol/loot-summary";
import type { MemberSummary } from "#src/contracts/shared";
import type { lootTable } from "#src/database/drizzle/schema";
import type { LootItemDto } from "#src/loots/query/loot-item";
import type { LootNpcDto } from "#src/loots/query/loot-npc";
import type { LootPlayerDto } from "#src/loots/query/loot-player";
import type { LootShare } from "#src/loots/loot-response.schema";

export type SubmissionWithMember = {
  guildId: string;
  lootId: number;
  memberId: number;
  member: MemberSummary;
};

export type LootSelection = Pick<
  typeof lootTable.$inferSelect,
  | "id"
  | "uniqueId"
  | "world"
  | "source"
  | "location"
  | "lootShare"
  | "createdAt"
  | "updatedAt"
>;

type LootQueryBase = Omit<LootSelection, "lootShare">;

export type LootQueryResult = LootQueryBase & {
  lootShare: LootShare;
  mapPlayersSnapshot: MapPlayersSnapshot | null;
  items: LootItemDto[];
  players: LootPlayerDto[];
  npcs: LootNpcDto[];
  submissions: SubmissionWithMember[];
  commentsCount: number;
};
