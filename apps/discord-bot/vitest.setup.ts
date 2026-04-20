import { afterEach, vi } from "vitest";

process.env.PORT = "4000";
process.env.ENV = "local";
process.env.SERVICE_NAME = "discord-bot";
process.env.DISCORD_BOT_TOKEN = "test-token";
process.env.RABBITMQ_URI = "amqp://localhost";
process.env.SERVICE_NAMESPACE = "test";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
