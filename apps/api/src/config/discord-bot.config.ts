import { registerAs } from "@nestjs/config";
import { ConfigKey } from "src/config/config-key.enum";

export interface DiscordBotConfig {
  serviceUrl: string;
  channelSnapshotStaleSeconds: number;
}

const DEFAULT_DISCORD_CHANNEL_SNAPSHOT_STALE_SECONDS = 300;

export default registerAs(ConfigKey.DISCORD_BOT, (): DiscordBotConfig => {
  const { DISCORD_BOT_SERVICE_URL } = process.env;

  return {
    serviceUrl: DISCORD_BOT_SERVICE_URL ?? "http://discord-bot:4000",
    channelSnapshotStaleSeconds: DEFAULT_DISCORD_CHANNEL_SNAPSHOT_STALE_SECONDS,
  };
});
