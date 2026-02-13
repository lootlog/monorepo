export class GuildDiscordNotificationConfigDto {
  guildId: string;
  channelId: string | null;
  enabled: boolean;
  updatedAt: string | null;
}
