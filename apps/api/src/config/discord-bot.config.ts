import { env } from "src/config/env";

interface DiscordBotConfig {
  serviceUrl: string;
  channelSnapshotStaleSeconds: number;
}

const DEFAULT_DISCORD_CHANNEL_SNAPSHOT_STALE_SECONDS = 900;

export const discordBotConfig: DiscordBotConfig = {
  serviceUrl: env.DISCORD_BOT_SERVICE_URL,
  channelSnapshotStaleSeconds: DEFAULT_DISCORD_CHANNEL_SNAPSHOT_STALE_SECONDS,
};
