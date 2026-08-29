export type GuildLootEventNpc = {
  lvl?: number | null;
  prof?: string | null;
  type?: number | string | null;
  wt?: number | string | null;
};

export type GuildLootCreatedEventV2 = {
  version: 2;
  guildId: string;
  lootId: number;
  npcs: GuildLootEventNpc[];
};

export type GuildLootShareUpdatedEventV2 = GuildLootCreatedEventV2 & {
  lootShare: Record<string, string[]>;
};
