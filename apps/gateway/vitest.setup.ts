import { afterEach, vi } from "vitest";

process.env.ENV ??= "local";
process.env.PORT ??= "4000";
process.env.SERVICE_NAME ??= "gateway";
process.env.APP_VERSION ??= "0.0.1";
process.env.RABBITMQ_URI ??= "amqp://guest:guest@localhost:5672";
process.env.REDIS_HOST ??= "localhost";
process.env.REDIS_PORT ??= "6379";
process.env.REDIS_PASSWORD ??= "";
process.env.REDIS_USERNAME ??= "";
process.env.API_URL ??= "http://localhost:3000";
process.env.SERVICE_NAMESPACE ??= "test";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
