import { registerAs } from "@nestjs/config";
import { ConfigKey } from "src/config/config-key.enum";

export interface DiscordBotServiceConfig {
  url: string;
}

export default registerAs(
  ConfigKey.DISCORD_BOT_SERVICE,
  (): DiscordBotServiceConfig => {
    const { DISCORD_BOT_SERVICE_URL } = process.env;

    return {
      url: DISCORD_BOT_SERVICE_URL ?? "http://localhost:4000",
    };
  },
);
