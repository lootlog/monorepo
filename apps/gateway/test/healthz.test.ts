import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import {
  createGatewayFetch,
  type GatewayApplicationService,
} from "../src/app.js";

const application = {
  config: { websocketPath: "/ws" },
  runPromise: Effect.runPromise,
  auth: {
    isAllowedOrigin: () => false,
    readCredential: () => null,
  },
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

  test("echoes only the public protocol and never the ticket protocol", async () => {
    let upgradeOptions: { readonly headers?: HeadersInit } | undefined;
    const authenticated = {
      config: { websocketPath: "/ws" },
      runPromise: Effect.runPromise,
      auth: {
        isAllowedOrigin: () => true,
        readCredential: () => ({
          kind: "one-time-ticket",
          value: "ticket",
          origin: "https://classic.margonem.pl",
        }),
        verify: () =>
          Effect.succeed({ userId: "user-1", discordId: "discord-1" }),
        getPlatform: () => "game",
      },
    } as unknown as GatewayApplicationService;
    const request = new Request("https://gateway.example/ws", {
      headers: {
        origin: "https://classic.margonem.pl",
        "sec-websocket-protocol":
          "lootlog.realtime.v1, lootlog.ticket.v1.c2VjcmV0",
      },
    });
    await createGatewayFetch(authenticated)(request, {
      upgrade: (_request, options) => {
        upgradeOptions = options;
        return true;
      },
    });
    expect(upgradeOptions?.headers).toEqual({
      "sec-websocket-protocol": "lootlog.realtime.v1",
    });
  });

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
      auth: {
        isAllowedOrigin: () => true,
        readCredential: () => ({
          kind: "one-time-ticket",
          value: "ticket",
          origin: "https://classic.margonem.pl",
        }),
        verify: () =>
          Effect.succeed({ userId: "user-1", discordId: "discord-1" }),
        getPlatform: () => "game",
      },
    } as unknown as GatewayApplicationService;
    const request = new Request("https://gateway.example/ws", {
      headers: {
        origin: "https://classic.margonem.pl",
        "sec-websocket-protocol": "lootlog.ticket.v1.c2VjcmV0",
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
