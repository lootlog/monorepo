declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT?: string;

      POSTGRESQL_PORT?: string;
      POSTGRESQL_HOST?: string;
      POSTGRESQL_USER?: string;
      POSTGRESQL_PASSWORD?: string;
      POSTGRESQL_DATABASE?: string;
    }
  }
}

export {};
