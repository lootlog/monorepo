import type { JsonValue, LootSource } from "#src/db/domain";
import type { LootItemDto } from "./loot-item.dto.js";
import type { LootNpcDto } from "./loot-npc.dto.js";
import type { LootPlayerDto } from "./loot-player.dto.js";
import type { LootShare } from "#src/shared/dto/loot-response.dto";

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

export type LootSelection = {
  id: number;
  uniqueId: string;
  world: string;
  source: LootSource;
  location: string;
  lootShare: JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

type LootQueryBase = Omit<LootSelection, "lootShare">;

export type LootQueryResult = LootQueryBase & {
  lootShare: LootShare;
  items: LootItemDto[];
  players: LootPlayerDto[];
  npcs: LootNpcDto[];
  submissions: SubmissionWithMember[];
  commentsCount: number;
};
