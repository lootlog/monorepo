import { describe, expect, test } from "bun:test";
import { makeGatewayAuth } from "./auth-service.js";

const config = {
  allowedExtensionOrigins: new Set([
    "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "moz-extension://3dceb390-cdec-4e9c-9a03-4c726adc48cc",
  ]),
  allowedWebOrigins: new Set(["https://lootlog.example"]),
};

describe("AuthService websocket upgrade boundary", () => {
  const service = makeGatewayAuth(config);

  test("accepts configured first-party and Margonem origins", () => {
    expect(service.isAllowedOrigin("https://lootlog.example/")).toBe(true);
    expect(service.isAllowedOrigin("https://berufs.margonem.pl")).toBe(true);
    expect(service.isAllowedOrigin("https://attacker.example")).toBe(false);
    expect(service.isAllowedOrigin(null)).toBe(false);
  });

  test("allows configured Chrome origins and classifies extensions as game clients", () => {
    for (const origin of config.allowedExtensionOrigins) {
      expect(service.isAllowedOrigin(origin)).toBe(true);
      expect(service.getPlatform(origin)).toBe("game");
      expect(service.isAllowedOrigin(`${origin}.attacker.example`)).toBe(false);
    }
    expect(
      service.isAllowedOrigin(
        "chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      ),
    ).toBe(false);
    expect(service.isAllowedOrigin("moz-extension://not-a-uuid")).toBe(false);
    expect(service.isAllowedOrigin("null")).toBe(false);
    expect(service.getPlatform("https://lootlog.example")).toBe("web-app");
    expect(service.getPlatform("https://berufs.margonem.pl")).toBe("game");
  });

  test("rejects unconfigured Firefox installation origins", () => {
    expect(
      service.isAllowedOrigin(
        "moz-extension://a7e55f76-3efa-4d42-90c3-9800d48d882e",
      ),
    ).toBe(false);
  });

  test("reads both verified identity headers", () => {
    expect(
      service.readIdentity(
        new Request("https://gateway.example/ws", {
          headers: {
            "X-Auth-User-Id": " user-1 ",
            "X-Auth-Discord-Id": " discord-1 ",
          },
        }),
      ),
    ).toEqual({ userId: "user-1", discordId: "discord-1" });
  });

  const incompleteIdentityHeaders: Array<Record<string, string>> = [
    {},
    { "x-auth-user-id": "user-1" },
    { "x-auth-discord-id": "discord-1" },
    { "x-auth-user-id": " ", "x-auth-discord-id": "discord-1" },
    { "x-auth-user-id": "user-1", "x-auth-discord-id": " " },
    { cookie: "lootlog.session=abc", authorization: "Bearer legacy" },
  ];
  test.each(incompleteIdentityHeaders)(
    "requires both nonempty proxy identity headers: %j",
    (headers) => {
      expect(
        service.readIdentity(
          new Request("https://gateway.example/ws", { headers }),
        ),
      ).toBeNull();
    },
  );
});
