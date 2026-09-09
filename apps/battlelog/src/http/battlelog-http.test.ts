import {
  unusedBattles,
  unusedBattleAnalytics,
  unusedDeleteQueue,
} from "../../test/battle-fixtures.js";
import { makeBattlelogOperations } from "../battles/battlelog-operations.js";
import { afterAll, describe, expect, it } from "bun:test";
import { makeBattlelogTestBoundary } from "./battlelog-http.js";

const boundary = makeBattlelogTestBoundary(
  makeBattlelogOperations(
    unusedBattles,
    unusedBattleAnalytics,
    unusedDeleteQueue,
  ),
);
const handler = boundary.handler;
afterAll(() => boundary.dispose());

describe("Battlelog HTTP boundary", () => {
  it("returns the readiness response without initializing external resources", async () => {
    const response = await handler(
      new Request("http://battlelog.test/healthz"),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("rejects authenticated routes without first-party forward-auth headers", async () => {
    const response = await handler(
      new Request("http://battlelog.test/battles/@me"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ statusCode: 401 });
  });
});

for (const [method, path] of [
  ["POST", "/battles"],
  ["PATCH", "/battles/battle-id"],
  ["POST", "/internal/delete-user-data"],
]) {
  it(`returns 400 for malformed JSON in ${method} ${path}`, async () => {
    const response = await handler(
      new Request(`http://battlelog.test${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          "x-auth-user-id": "user",
          "x-auth-discord-id": "discord",
        },
        body: "{",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Bad Request",
      message: "Invalid JSON body",
      statusCode: 400,
    });
  });
}

it("rejects personal-data and write grants before executing battle operations", async () => {
  const access = {
    keyId: "key",
    organizationIds: ["123"],
    mode: "read",
    personalData: false,
    expiresAt: null,
  };
  const keyHeaders = {
    "x-auth-user-id": "user",
    "x-auth-discord-id": "discord",
    "x-auth-api-key-access": JSON.stringify(access),
  };
  expect(
    (
      await handler(
        new Request("http://battlelog.test/battles/@me", {
          headers: keyHeaders,
        }),
      )
    ).status,
  ).toBe(403);
  keyHeaders["x-auth-api-key-access"] = JSON.stringify({
    ...access,
    personalData: true,
  });
  expect(
    (
      await handler(
        new Request("http://battlelog.test/battles", {
          method: "POST",
          headers: keyHeaders,
          body: "{}",
        }),
      )
    ).status,
  ).toBe(403);
  keyHeaders["x-auth-api-key-access"] = JSON.stringify({
    ...access,
    personalData: true,
    mode: "read-write",
  });
  expect(
    (
      await handler(
        new Request("http://battlelog.test/internal/delete-user-data", {
          method: "POST",
          headers: keyHeaders,
          body: "{}",
        }),
      )
    ).status,
  ).toBe(403);
});
