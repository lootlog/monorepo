import {
  unusedBattles,
  unusedBattleAnalytics,
  unusedBattleMetadata,
  unusedDeleteQueue,
  unusedWeaponKills,
} from "../../test/battle-fixtures.js";
import { makeBattlelogOperations } from "../battles/battlelog-operations.js";
import { afterAll, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { OperationError } from "@lootlog/instrumentation/operation";
import { ResourceNotFoundError } from "@lootlog/protocol/http/errors";
import { makeBattlelogTestBoundary } from "../../test/battlelog-test-boundary.js";

const boundary = makeBattlelogTestBoundary(
  makeBattlelogOperations(
    unusedBattles,
    unusedBattleAnalytics,
    unusedBattleMetadata,
    unusedDeleteQueue,
    unusedWeaponKills,
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
    expect(await response.json()).toEqual({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("answers a missing battle with the declared 404 body", async () => {
    const operations = makeBattlelogOperations(
      unusedBattles,
      unusedBattleAnalytics,
      unusedBattleMetadata,
      unusedDeleteQueue,
      unusedWeaponKills,
    );

    const missing = makeBattlelogTestBoundary({
      ...operations,
      publicBattles: {
        ...operations.publicBattles,
        getPublicBattle: (battleId) =>
          Effect.fail(
            new OperationError({
              operation: "PublicBattlesController_getPublicBattle",
              cause: new ResourceNotFoundError(
                `Public battle with ID ${battleId} not found`,
              ),
            }),
          ),
      },
    });

    try {
      const response = await missing.handler(
        new Request("http://battlelog.test/battles/public/missing"),
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        code: "NOT_FOUND",
        message: "Public battle with ID missing not found",
      });
    } finally {
      await missing.dispose();
    }
  });
});

for (const [method, path] of [
  ["POST", "/battles"],
  ["PATCH", "/battles/battle-id"],
] as const) {
  it(`returns 400 for malformed JSON in ${method} ${path}`, async () => {
    const response = await handler(
      new Request(`http://battlelog.test${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          authorization: "Bearer cleanup-test-secret",
          "x-auth-user-id": "user",
          "x-auth-discord-id": "discord",
        },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      details: {
        issues: [{ path: [], message: "Expected a valid JSON body" }],
      },
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
});
