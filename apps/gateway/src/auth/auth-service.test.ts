import { describe, expect, mock, test } from "bun:test";
import { Effect, Fiber } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import { makeGatewayAuth } from "./auth-service.js";
import type { GatewayConfiguration } from "#src/config/gateway-config";

const config = {
  authUrl: "http://auth.local",
  allowedWebOrigins: new Set(["https://lootlog.example"]),
} as unknown as GatewayConfiguration;

describe("AuthService websocket upgrade boundary", () => {
  const unavailableClient = {
    get: () => Effect.die("HTTP must not run"),
  } as unknown as HttpClientValue;
  const service = makeGatewayAuth(config, unavailableClient);

  test("accepts configured first-party and Margonem origins", () => {
    expect(service.isAllowedOrigin("https://lootlog.example/")).toBe(true);
    expect(service.isAllowedOrigin("https://berufs.margonem.pl")).toBe(true);
    expect(service.isAllowedOrigin("https://attacker.example")).toBe(false);
    expect(service.isAllowedOrigin(null)).toBe(false);
  });

  test("prefers the first-party session cookie", () => {
    const request = new Request("https://gateway.example/ws", {
      headers: {
        cookie: "lootlog.session=abc",
        authorization: "Bearer ticket",
      },
    });
    expect(service.readCredential(request)).toEqual({
      kind: "session-cookie",
      value: "lootlog.session=abc",
    });
  });

  test("accepts one-time bearer tickets only from the upgrade header", () => {
    const request = new Request("https://gateway.example/ws", {
      headers: {
        authorization: "Bearer one-time-ticket",
        origin: "https://classic.margonem.pl",
      },
    });
    expect(service.readCredential(request)).toEqual({
      kind: "one-time-ticket",
      value: "one-time-ticket",
      origin: "https://classic.margonem.pl",
    });
    expect(
      service.readCredential(
        new Request("https://gateway.example/ws?ticket=leaked"),
      ),
    ).toBeNull();
  });

  test("accepts a browser ticket from Sec-WebSocket-Protocol without putting it in the URL", () => {
    const encoded = Buffer.from("single-use-ticket").toString("base64url");
    const request = new Request("https://gateway.example/ws", {
      headers: {
        cookie: "lootlog.session=stale",
        origin: "https://classic.margonem.pl",
        "sec-websocket-protocol": `lootlog.realtime.v1, lootlog.ticket.v1.${encoded}`,
      },
    });
    expect(service.readCredential(request)).toEqual({
      kind: "one-time-ticket",
      value: "single-use-ticket",
      origin: "https://classic.margonem.pl",
    });
    expect(
      service.readCredential(
        new Request("https://gateway.example/ws", {
          headers: { "sec-websocket-protocol": "lootlog.ticket.v1.***" },
        }),
      ),
    ).toBeNull();
  });

  test("verifies a session through Effect HttpClient and preserves identity headers", async () => {
    const get = mock((_url: string, _options: unknown) =>
      Effect.succeed({
        status: 200,
        headers: {
          "x-auth-discord-id": "discord-1",
          "x-auth-user-id": "user-1",
        },
      }),
    );
    const auth = makeGatewayAuth(config, { get } as unknown as HttpClientValue);

    await expect(
      Effect.runPromise(
        auth.verify({ kind: "session-cookie", value: "session=abc" }),
      ),
    ).resolves.toEqual({ discordId: "discord-1", userId: "user-1" });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]?.[1]).toMatchObject({
      headers: { cookie: "session=abc" },
    });
  });

  test("does not retry a failed one-time-ticket verification", async () => {
    const get = mock(() => Effect.fail(new Error("transport")));
    const auth = makeGatewayAuth(config, { get } as unknown as HttpClientValue);

    await expect(
      Effect.runPromise(
        auth.verify({
          kind: "one-time-ticket",
          value: "ticket",
          origin: "https://classic.margonem.pl",
        }),
      ),
    ).resolves.toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });

  test("propagates interruption through the verification request", async () => {
    let interrupted = false;
    const get = mock(() =>
      Effect.never.pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            interrupted = true;
          }),
        ),
      ),
    );
    const auth = makeGatewayAuth(config, { get } as unknown as HttpClientValue);
    const fiber = Effect.runFork(
      auth.verify({ kind: "session-cookie", value: "session=abc" }),
    );
    while (get.mock.calls.length === 0) await Promise.resolve();

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(interrupted).toBe(true);
  });
});
