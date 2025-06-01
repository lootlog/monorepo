import { RuntimeEnvironment } from "@lootlog/types";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT?: string;
      JWKS_URL?: string;
      ENV: RuntimeEnvironment;
    }
  }
}

export {};
