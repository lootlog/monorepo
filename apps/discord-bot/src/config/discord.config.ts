import { ConfigService, registerAs } from '@nestjs/config';
import { ServiceConfig } from './service.config';
import { NecordModuleOptions } from 'necord';
import { IntentsBitField } from 'discord.js';
import { ConfigKey } from './config-key.enum';
import { RuntimeEnvironment } from 'src/types/common.types';

export interface DiscordConfig {
  discordBotToken: string;
  discordDevelopmentGuildId?: string;
}

export default registerAs(ConfigKey.DISCORD, (): DiscordConfig => {
  const { DISCORD_BOT_TOKEN, DISCORD_DEVELOPMENT_GUILD_ID } = process.env;

  return {
    discordBotToken: DISCORD_BOT_TOKEN,
    discordDevelopmentGuildId: DISCORD_DEVELOPMENT_GUILD_ID,
  };
});

export const discordConfigFactory = (
  configService: ConfigService,
): NecordModuleOptions => {
  const { discordBotToken, discordDevelopmentGuildId } =
    configService.get<DiscordConfig>(ConfigKey.DISCORD);
  const { env } = configService.get<ServiceConfig>(ConfigKey.SERVICE);

  return {
    token: discordBotToken,
    development:
      discordDevelopmentGuildId && env === RuntimeEnvironment.LOCAL
        ? [discordDevelopmentGuildId]
        : undefined,
    intents: [IntentsBitField.Flags.Guilds],
  };
};
