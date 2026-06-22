declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENV: "local" | "dev" | "production" | "test";
      PORT: string;
      SERVICE_NAME: string;

      TRUSTED_ORIGINS: string;
      COOKIE_DOMAIN: string;
      COOKIE_PREFIX: string;
      ADMIN_ACCOUNT_IDS: string;
      AUTH_SECRET: string;

      APP_URL: string;

      POSTGRESQL_PORT: string;
      POSTGRESQL_HOST: string;
      POSTGRESQL_USER: string;
      POSTGRESQL_PASSWORD: string;
      POSTGRESQL_DATABASE: string;
      POSTGRESQL_SSL_CA?: string;

      DISCORD_CLIENT_SECRET: string;
      DISCORD_CLIENT_ID: string;

      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_USERNAME: string;
      REDIS_PASSWORD: string;

      OTEL_EXPORTER_OTLP_ENDPOINT?: string;
      OTEL_EXPORTER_OTLP_HEADERS?: string;
      OTEL_NODE_RESOURCE_DETECTORS?: string;
      OTEL_TRACES_EXPORTER?: string;
      SERVICE_NAMESPACE?: string;

      AXIOM_DATASET?: string;
      AXIOM_TOKEN?: string;
      COMMIT_SHA?: string;
    }
  }
}

export {};
