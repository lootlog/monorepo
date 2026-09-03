import { describe, expect, it } from "bun:test";
import { ConfigProvider, Effect } from "effect";
import { loadGatewayConfiguration } from "./gateway-config.js";

const requiredEnvironment = {
  PORT: "4004",
  API_URL: "http://api.internal",
  AUTH_URL: "http://auth.internal",
  RABBITMQ_URI: "amqp://rabbit.internal",
  ACTIVITY_EVENT_SIGNATURE_SECRET: "test-secret",
  REDIS_HOST: "redis.internal",
  REDIS_PORT: "6379",
  REDIS_USERNAME: "gateway",
  REDIS_PASSWORD: "redis-secret",
};

describe("loadGatewayConfiguration", () => {
  it("allows both reverse-proxy and direct Vite origins by default", async () => {
    const config = await Effect.runPromise(
      loadGatewayConfiguration.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown(requiredEnvironment),
        ),
      ),
    );

    expect(config.allowedWebOrigins).toEqual(
      new Set(["http://localhost", "http://localhost:3000"]),
    );
    expect(config.websocketPath).toBe("/ws");
  });
});
