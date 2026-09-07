import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { makeGatewayAuth } from "../src/auth/auth-service.js";

import {
  createGatewayFetch,
  type GatewayApplicationService,
} from "../src/app.js";

const auth = makeGatewayAuth({
  allowedWebOrigins: new Set(["https://lootlog.example"]),
  allowedExtensionOrigins: new Set(),
});
const application = {
  config: { websocketPath: "/ws" },
  runPromise: Effect.runPromise,
  auth,
} as unknown as GatewayApplicationService;

const server = { upgrade: () => false };

describe("gateway HTTP boundary", () => {
  test("keeps the health contract independent from websocket auth", async () => {
    const response = await createGatewayFetch(application)(
      new Request("https://gateway.example/healthz"),
      server,
    );
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ status: "ok" });
  });

  test("rejects credentials in websocket URLs before upgrade", async () => {
    const response = await createGatewayFetch(application)(
      new Request("https://gateway.example/ws?ticket=secret"),
      server,
    );
    expect(response?.status).toBe(400);
  });

  test.each([
    { origin: "https://classic.margonem.pl", status: 401 },
    { origin: "https://attacker.example", status: 403 },
  ])("rejects unauthorized upgrades: %j", async ({ origin, status }) => {
    let upgraded = false;
    const response = await createGatewayFetch(application)(
      new Request("https://gateway.example/ws", { headers: { origin } }),
      {
        upgrade: () => {
          upgraded = true;
          return true;
        },
      },
    );
    expect(response?.status).toBe(status);
    expect(upgraded).toBe(false);
  });

  test.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])(
    "negotiates feed (%s) and volunteer (%s) opt-in while echoing only the wire protocol",
    async (supportsFeed, supportsNotificationVolunteer) => {
      let upgradeOptions:
        | {
            readonly headers?: HeadersInit;
            readonly data: {
              readonly supportsFeed?: boolean;
              readonly supportsNotificationVolunteer?: boolean;
            };
          }
        | undefined;
      const authenticated = {
        config: { websocketPath: "/ws" },
        runPromise: Effect.runPromise,
        auth,
      } as unknown as GatewayApplicationService;
      const request = new Request("https://gateway.example/ws", {
        headers: {
          origin: "https://classic.margonem.pl",
          "x-auth-user-id": "user-1",
          "x-auth-discord-id": "discord-1",
          "sec-websocket-protocol": `lootlog.realtime.v1${supportsFeed ? ", lootlog.feed.v1" : ""}${supportsNotificationVolunteer ? ", lootlog.notification-volunteer.v1" : ""}`,
        },
      });
      const response = await createGatewayFetch(authenticated)(request, {
        upgrade: (_request, options) => {
          upgradeOptions = options;
          return true;
        },
      });
      expect(response).toBeUndefined();
      expect(upgradeOptions?.data).toMatchObject({
        userId: "user-1",
        discordId: "discord-1",
      });
      expect(upgradeOptions?.data.supportsFeed).toBe(supportsFeed);
      expect(upgradeOptions?.data.supportsNotificationVolunteer).toBe(
        supportsNotificationVolunteer,
      );
      expect(upgradeOptions?.headers).toEqual({
        "sec-websocket-protocol": "lootlog.realtime.v1",
      });
    },
  );

  test("uses readable JSON frames locally when the browser strips public subprotocols", async () => {
    let upgradeOptions:
      | {
          readonly data: { readonly frameEncoding?: string };
          readonly headers?: HeadersInit;
        }
      | undefined;
    const authenticated = {
      config: { websocketPath: "/ws", environment: "local" },
      runPromise: Effect.runPromise,
      auth,
    } as unknown as GatewayApplicationService;
    const request = new Request("https://gateway.example/ws", {
      headers: {
        origin: "https://classic.margonem.pl",
        "x-auth-user-id": "user-1",
        "x-auth-discord-id": "discord-1",
      },
    });

    await createGatewayFetch(authenticated)(request, {
      upgrade: (_request, options) => {
        upgradeOptions = options;
        return true;
      },
    });

    expect(upgradeOptions?.data.frameEncoding).toBe("json");
    expect(upgradeOptions?.headers).toBeUndefined();
  });
});
