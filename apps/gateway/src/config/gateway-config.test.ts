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
  it.each([
    "https://attacker.example",
    "chrome-extension://*",
    "chrome-extension://bad",
    "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/path",
  ])("rejects invalid extension configuration: %s", async (origin) => {
    await expect(
      Effect.runPromise(
        loadGatewayConfiguration.pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromUnknown({
              ...requiredEnvironment,
              ALLOWED_EXTENSION_ORIGINS: origin,
            }),
          ),
        ),
      ),
    ).rejects.toThrow();
  });

  it("loads explicit extension origins independently from web origins", async () => {
    const origin = "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const config = await Effect.runPromise(
      loadGatewayConfiguration.pipe(
        Effect.provideService(
          ConfigProvider.ConfigProvider,
          ConfigProvider.fromUnknown({
            ...requiredEnvironment,
            ALLOWED_EXTENSION_ORIGINS: ` ${origin}/, `,
          }),
        ),
      ),
    );
    expect(config.allowedExtensionOrigins).toEqual(new Set([origin]));
    expect(config.allowedWebOrigins.has(origin)).toBe(false);
  });

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
    expect(config.allowedExtensionOrigins).toEqual(new Set());
    expect(config.websocketPath).toBe("/ws");
  });
});
