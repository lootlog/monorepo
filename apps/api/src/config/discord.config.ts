import { RESTOptions } from '@discordjs/rest';
import { registerAs } from '@nestjs/config';

export default registerAs('discord', (): Partial<RESTOptions> => {
  const { DISCORD_API_AUTH_PREFIX, DISCORD_API_VERSION } = process.env;

  return {
    version: DISCORD_API_VERSION,
    authPrefix: DISCORD_API_AUTH_PREFIX,
  };
});
