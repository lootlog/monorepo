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
