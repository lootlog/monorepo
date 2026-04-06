import { randomUUID } from "node:crypto";
import { afterEach, vi } from "vitest";

vi.mock("src/config/env", () => ({
  env: {
    ENV: "local",
    PORT: 4000,
    SERVICE_NAME: "api",
    RABBITMQ_URI: "amqp://localhost:5672",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    REDIS_PASSWORD: "",
    REDIS_USERNAME: "default",
    AUTH_SERVICE_URL: "http://localhost:3001",
    BATTLELOG_SERVICE_URL: "http://battlelog-service:4000",
    DISCORD_BOT_SERVICE_URL: "http://discord-bot:4000",
    RESERVATIONS_CARDS_URL: "http://localhost:4000/cards",
    MAPS_API_URL: "http://localhost:4000/maps",
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
