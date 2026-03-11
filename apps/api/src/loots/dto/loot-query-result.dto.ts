import { Prisma } from "generated/client";
import type { LootItemDto } from "./loot-item.dto";
import type { LootPlayerDto } from "./loot-player.dto";
import type { LootNpcDto } from "./loot-npc.dto";

export type SubmissionWithMember = Prisma.LootSubmissionGetPayload<{
  include: {
    member: {
      select: {
        name: true;
        avatar: true;
        userId: true;
      };
    };
  };
}>;

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

export type LootQueryResult = LootSelection & {
  items: LootItemDto[];
  players: LootPlayerDto[];
  npcs: LootNpcDto[];
  submissions: SubmissionWithMember[];
  commentsCount: number;
};
