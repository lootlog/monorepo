import { RuntimeEnvironment } from 'src/types/common.types';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENV: RuntimeEnvironment;
      PORT: string;

      AUTH0_AUDIENCE: string;
      AUTH0_ISSUER_URL: string;
      AUTH0_USER_PREFIX: string;

      RABBITMQ_URI: string;
    }
  }
}

export {};
