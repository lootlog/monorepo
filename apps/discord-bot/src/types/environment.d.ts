import { RuntimeEnvironment } from 'src/types/common.types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENV: RuntimeEnvironment;
      PORT: string;

      DISCORD_BOT_TOKEN: string;
      DISCORD_DEVELOPMENT_GUILD_ID: string;

      RABBITMQ_URI: string;
    }
  }
}

export {};
