import { describe, expect, it } from "bun:test";
import { readAdminConfig } from "./config.js";

const base = {
  AUTH_INTERNAL_URL: "http://auth:4000",
  ADMIN_API_SECRET: "secret",
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
