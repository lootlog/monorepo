import { Logger } from "@nestjs/common";
import { redisStorage } from "@better-auth/redis-storage";
import Redis from "ioredis";
import { env } from "src/config/env";
import { createFailOpenSecondaryStorage } from "./secondary-storage-fail-open";

const AUTH_REDIS_KEY_PREFIX = "auth:better-auth:";

const logger = new Logger("AuthRedisStorage");

export const authRedisClient = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
  connectTimeout: 1_000,
  enableOfflineQueue: false,
  lazyConnect: process.env.OPENAPI_GENERATION === "true",
  maxRetriesPerRequest: 1,
});

authRedisClient.on("error", (error) => {
  logger.warn(
    `Redis client error: ${error instanceof Error ? error.message : String(error)}`,
  );
});

export const authRedisSecondaryStorage = createFailOpenSecondaryStorage(
  redisStorage({
    client: authRedisClient,
    keyPrefix: AUTH_REDIS_KEY_PREFIX,
  }),
  (operation, error) => {
    logger.warn(
      `Redis secondary storage ${operation} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  },
);

export function disconnectAuthRedisClient() {
  const status = authRedisClient.status;

  if (status === "end" || status === "close") {
    return;
  }

  authRedisClient.disconnect(false);
}
