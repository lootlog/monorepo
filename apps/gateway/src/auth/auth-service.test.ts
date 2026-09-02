import { describe, expect, test } from "bun:test";
import { AuthService } from "./auth-service.js";
import type { GatewayConfiguration } from "#src/config/gateway-config";

const config = {
  authUrl: "http://auth.local",
  allowedWebOrigins: new Set(["https://lootlog.example"]),
} as unknown as GatewayConfiguration;

describe("AuthService websocket upgrade boundary", () => {
  const service = new AuthService(config);

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
});
