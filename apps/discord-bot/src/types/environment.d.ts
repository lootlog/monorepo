import type { RuntimeEnvironment } from "@lootlog/types";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: "development" | "production" | "test";
      ENV: RuntimeEnvironment;
      PORT: string;
      SERVICE_NAME: string;

      DISCORD_BOT_TOKEN: string;
      DISCORD_DEVELOPMENT_GUILD_ID?: string;

      RABBITMQ_URI: string;

      OTEL_EXPORTER_OTLP_ENDPOINT?: string;
      OTEL_EXPORTER_OTLP_HEADERS?: string;
      SERVICE_NAMESPACE?: string;

      AXIOM_DATASET?: string;
      AXIOM_TOKEN?: string;
      COMMIT_SHA?: string;
    }
  }
}

export {};
