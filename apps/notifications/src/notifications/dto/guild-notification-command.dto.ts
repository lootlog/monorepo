export type GuildNotificationNpcPayload = {
  name: string;
  wt: number;
  lvl?: number;
  prof?: string;
  type?: string;
};

export type GuildNotificationCommandDto = {
  eventId: string;
  correlationId: string;
  notificationId: string;
  guildId: string;
  createdAt: string;
  createdByDiscordId: string;
  world: string;
  type: 'NPC_TITAN' | 'NPC_OTHER' | 'TEXT';
  npc?: GuildNotificationNpcPayload;
  message?: string;
};
