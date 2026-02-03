export class ClanDto {
  id?: number;
  name?: string;
}

export class VolunteerCharacterDto {
  lvl: number;
  nick: string;
  accountId: string;
  characterId: string;
  prof: string;
  icon: string;
  clan?: ClanDto;
}

export class VolunteerNotificationDto {
  notificationId: string;
  targetDiscordId: string;
  volunteerDiscordId: string;
  world: string;
  character: VolunteerCharacterDto;
}
