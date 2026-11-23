import { describe, expect, it } from "bun:test";
import { readAdminConfig } from "./config.js";

const base = {
  AUTH_RPC_URL: "http://auth:4100",
  API_RPC_URL: "http://api:4100",
  RPC_TOKEN_ADMIN_TO_AUTH: "auth-edge-token",
  RPC_TOKEN_ADMIN_TO_API: "api-edge-token",
  ADMIN_ORIGIN: "https://admin.example.test/",
  LOOTLOG_WEB_URL: "https://example.test",
};

const access = {
  CF_ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
  CF_ACCESS_AUD: "aud",
  ADMIN_OPERATOR_EMAILS: "Operator@Example.test, second@example.test",
};

describe("readAdminConfig", () => {
  it.each([
    ["an Access application", { ...access, CF_ACCESS_AUD: "" }],
    ["an operator", { ...access, ADMIN_OPERATOR_EMAILS: " , " }],
  ])("refuses to start a production build without %s", (_case, overrides) => {
    expect(() => readAdminConfig({ ...base, ...overrides }, true)).toThrow();
  });

  it("requires the RPC edge tokens of a production build unless ENV names local", () => {
    const { RPC_TOKEN_ADMIN_TO_API: _token, ...withoutToken } = base;
    const production = { ...withoutToken, ...access };

    expect(() => readAdminConfig(production, true)).toThrow();
    expect(() =>
      readAdminConfig({ ...production, ENV: "prod" }, true),
    ).toThrow();
    expect(() =>
      readAdminConfig({ ...production, ENV: "local" }, true),
    ).not.toThrow();
  });

  it("never grants the development operator to a production build", () => {
    const config = readAdminConfig(
      { ...base, ...access, ADMIN_DEV_OPERATOR: "dev@localhost" },
      true,
    );

    expect(config.devOperator).toBeUndefined();
    expect([...config.operatorEmails]).toEqual([
      "operator@example.test",
      "second@example.test",
    ]);
    expect(config.origin).toBe("https://admin.example.test");
  });

  it("uses the development operator only while no Access application is configured", () => {
    expect(readAdminConfig(base, false).devOperator).toBe("dev@localhost");
    expect(
      readAdminConfig({ ...base, ...access }, false).devOperator,
    ).toBeUndefined();
  });
});
