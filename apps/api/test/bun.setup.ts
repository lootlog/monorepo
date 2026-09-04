import { randomUUID } from "node:crypto";
import { afterEach, vi } from "./bun-test.js";

process.on("unhandledRejection", (reason) => {
  if (reason instanceof Error && reason.message === "Connection is closed.") {
    return;
  }

  throw reason;
});

vi.mock("#src/config/env", () => ({
  env: {
    ENV: process.env.ENV ?? "local",
    PORT: Number(process.env.PORT ?? 4000),
    SERVICE_NAME: "api",
    RABBITMQ_URI: process.env.RABBITMQ_URI ?? "amqp://localhost:5672",
    REDIS_HOST: process.env.REDIS_HOST ?? "localhost",
    REDIS_PORT: Number(process.env.REDIS_PORT ?? 6379),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? "",
    REDIS_USERNAME: process.env.REDIS_USERNAME ?? "",
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3001",
    BATTLELOG_SERVICE_URL:
      process.env.BATTLELOG_SERVICE_URL ?? "http://battlelog-service:4000",
    DISCORD_BOT_SERVICE_URL:
      process.env.DISCORD_BOT_SERVICE_URL ?? "http://discord-bot:4000",
    RESERVATIONS_CARDS_URL:
      process.env.RESERVATIONS_CARDS_URL ?? "http://localhost:4000/cards",
    MAPS_API_URL: process.env.MAPS_API_URL ?? "http://localhost:4000/maps",
    TIMER_CLEANUP_ENABLED: "true",
    TIMER_RETENTION_DAYS: 7,
    RESERVATIONS_CLEANUP_ENABLED: "true",
    RESERVATIONS_RETENTION_DAYS: 30,
  },
}));

vi.mock("uuid", () => ({
  v6: () => randomUUID(),
  v4: () => randomUUID(),
  v5: vi.fn(),
  v3: vi.fn(),
  v1: vi.fn(),
  validate: vi.fn(),
  version: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
