import type { Prisma } from "src/generated/prisma/client";
import type { LootItemDto } from "./loot-item.dto";
import type { LootNpcDto } from "./loot-npc.dto";
import type { LootPlayerDto } from "./loot-player.dto";
import type { LootShare } from "src/shared/dto/loot-response.dto";

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

export type LootSelection = Prisma.LootGetPayload<{
  select: {
    id: true;
    uniqueId: true;
    world: true;
    source: true;
    location: true;
    lootShare: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

type LootQueryBase = Omit<LootSelection, "lootShare">;

export type LootQueryResult = LootQueryBase & {
  lootShare: LootShare;
  items: LootItemDto[];
  players: LootPlayerDto[];
  npcs: LootNpcDto[];
  submissions: SubmissionWithMember[];
  commentsCount: number;
};
