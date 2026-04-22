import type { NecordModuleOptions } from "necord";
import { IntentsBitField } from "discord.js";
import { RuntimeEnvironment } from "src/types/common.types";
import { env } from "./env";
import { serviceConfig } from "./service.config";

export interface DiscordConfig {
  discordBotToken: string;
  discordDevelopmentGuildId?: string;
}

export const discordConfig: DiscordConfig = {
  discordBotToken: env.DISCORD_BOT_TOKEN,
  discordDevelopmentGuildId: env.DISCORD_DEVELOPMENT_GUILD_ID,
};

export const necordConfig: NecordModuleOptions = {
  token: discordConfig.discordBotToken,
  development:
    discordConfig.discordDevelopmentGuildId &&
    serviceConfig.env === RuntimeEnvironment.LOCAL
      ? [discordConfig.discordDevelopmentGuildId]
      : undefined,
  intents: [IntentsBitField.Flags.Guilds],
};
