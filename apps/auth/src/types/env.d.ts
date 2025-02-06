declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT?: string;
      BETTER_AUTH_URL?: string;
    }
  }
}

export {};
