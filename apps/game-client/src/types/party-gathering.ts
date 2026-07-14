export type PartyGatheringCharacterBase = {
  nick: string;
  lvl: number;
  prof: string;
  characterId: string;
  accountId: string;
  icon: string;
};

export type PartyGatheringCharacter = PartyGatheringCharacterBase & {
  clan?: {
    id?: number;
    name?: string;
  };
};

export type PartyGatheringSession = {
  notificationId: string;
  discordId: string;
  character: PartyGatheringCharacter;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  world: string;
  createdAt: string;
  guildIds?: string[];
};
