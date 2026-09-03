import type { lootTable } from "#src/database/drizzle/schema";
import type { LootItemDto } from "#src/loots/query/loot-item";
import type { LootNpcDto } from "#src/loots/query/loot-npc";
import type { LootPlayerDto } from "#src/loots/query/loot-player";
import type { LootShare } from "#src/loots/loot-response.schema";

export type SubmissionWithMember = {
  guildId: string;
  lootId: number;
  memberId: number;
  member: {
    name: string;
    avatar: string | null;
    userId: string;
  };
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
  items: LootItemDto[];
  players: LootPlayerDto[];
  npcs: LootNpcDto[];
  submissions: SubmissionWithMember[];
  commentsCount: number;
};
