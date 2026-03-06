export class ClanDto {
  id?: number;
  name?: string;
}

export class PartyGatheringCharacterDto {
  lvl: number;
  nick: string;
  accountId: string;
  characterId: string;
  prof: string;
  icon: string;
  clan?: ClanDto;
}

export class SendPartyGatheringDto {
  guildId: string;
  discordId: string;
  notificationId: string;
  world: string;
  createdAt: string;
  character: PartyGatheringCharacterDto;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
}
