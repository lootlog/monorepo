import type { LootShare } from "src/gateway/types/loot-share.type";

export type LootSocketNpcDto = {
  lvl?: number | null;
  prof?: string | null;
  type?: number | string | null;
  wt?: number | string | null;
};

export type LootCreateEventDto = {
  guildId: string;
  lootId: number;
  npc?: LootSocketNpcDto;
};

export type LootShareUpdateEventDto = LootCreateEventDto & {
  lootShare: LootShare;
};
