export type DiscordGuildNotificationNpcPayload = {
  name: string;
  wt: number;
  lvl?: number;
  prof?: string;
  type?: string;
};

export class DiscordGuildNotificationEventDto {
  eventId: string;
  correlationId: string;
  notificationId: string;
  guildId: string;
  channelId: string;
  createdAt: string;
  createdByDiscordId: string;
  world: string;
  type: 'NPC_TITAN' | 'NPC_OTHER' | 'TEXT';
  npc?: DiscordGuildNotificationNpcPayload;
  message?: string;
}
