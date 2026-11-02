import { describe, expect, it } from "bun:test";
import { Cause, Effect, Exit } from "effect";
import { HttpServerResponse } from "effect/http";
import { SqlError, UniqueViolation } from "effect/sql/SqlError";
import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import {
  InvalidRequestError,
  PermissionDeniedError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { SettingsRequestError } from "#src/settings-documents/settings-documents.service";
import {
  RecordsDataError,
  toRecordsHttpResponse,
} from "./records.operations.js";
import {
  SettingsOperationError,
  toSettingsHttpResponse,
} from "../settings/settings.operations.js";
import {
  AccountOrganizationOperationError,
  toAccountOrganizationHttpResponse,
} from "../account-organization/account-organization.operations.js";

describe("business failures survive HTTP mapping", () => {
  it.each([
    [
      new ResourceNotFoundError({ code: "CANT_DELETE_LOOT" }),
      404,
      "CANT_DELETE_LOOT",
    ],
    [
      new InvalidRequestError({ code: "MISSING_LOOT_SHARE" }),
      400,
      "MISSING_LOOT_SHARE",
    ],
    [
      new PermissionDeniedError({ code: "CANT_UPDATE_LOOT" }),
      403,
      "CANT_UPDATE_LOOT",
    ],
  ] as const)(
    "returns the declared loot failure %#",
    async (cause, status, code) => {
      const response = HttpServerResponse.toWeb(
        await Effect.runPromise(
          toRecordsHttpResponse(Effect.fail(new RecordsDataError({ cause }))),
        ),
      );

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ code });
    },
  );

  it("separates a human message from the default code", async () => {
    const response = HttpServerResponse.toWeb(
      await Effect.runPromise(
        toRecordsHttpResponse(
          Effect.fail(
            new RecordsDataError({
              cause: new ResourceConflictError("Conflicting loot share"),
            }),
          ),
        ),
      ),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "CONFLICT",
      message: "Conflicting loot share",
    });
  });

  it("preserves rejected Organization details for the game client", async () => {
    const body = {
      code: "NO_GUILDS_ON_THE_CHARACTER_WHITELIST",
      details: {
        submittedGuilds: [],
        rejectedGuilds: [
          { id: "guild-a", reason: "NOT_ON_CHARACTER_WHITELIST" },
        ],
      },
    };

    const response = HttpServerResponse.toWeb(
      await Effect.runPromise(
        toRecordsHttpResponse(
          Effect.fail(
            new RecordsDataError({ cause: new InvalidRequestError(body) }),
          ),
        ),
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(body);
  });

  it.each([
    [400, "INVALID_REQUEST", "Unknown settings domain"],
    [403, "FORBIDDEN", "Guild settings are not accessible"],
  ] as const)(
    "returns settings status %s and its reason",
    async (status, code, message) => {
      const response = HttpServerResponse.toWeb(
        await Effect.runPromise(
          toSettingsHttpResponse(
            Effect.fail(
              new SettingsOperationError({
                cause: new SettingsRequestError({ status, message }),
              }),
            ),
          ),
        ),
      );

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ code, message });
    },
  );

  it("preserves configuration validation reasons", async () => {
    const response = HttpServerResponse.toWeb(
      await Effect.runPromise(
        toAccountOrganizationHttpResponse(
          Effect.fail(
            new AccountOrganizationOperationError({
              cause: new InvalidRequestError({
                code: "GUILDS_RESERVATION_DURATION_RANGE_INVALID",
              }),
            }),
          ),
        ),
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: "GUILDS_RESERVATION_DURATION_RANGE_INVALID",
    });
  });

  it("maps the vanity URL unique constraint to a public conflict", async () => {
    const cause = new EffectDrizzleQueryError({
      query: "update guild",
      params: [],
      cause: Cause.fail(
        new SqlError({
          reason: new UniqueViolation({
            cause: new Error("private database detail"),
            constraint: "Guild_vanityUrl_key",
          }),
        }),
      ),
    });

    const response = HttpServerResponse.toWeb(
      await Effect.runPromise(
        toAccountOrganizationHttpResponse(
          Effect.fail(new AccountOrganizationOperationError({ cause })),
        ),
      ),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "GUILDS_VANITY_URL_TAKEN",
    });
  });

  it("keeps unrelated database constraints as internal failures", async () => {
    const cause = new EffectDrizzleQueryError({
      query: "update guild",
      params: [],
      cause: Cause.fail(
        new SqlError({
          reason: new UniqueViolation({
            cause: new Error("private database detail"),
            constraint: "another_constraint",
          }),
        }),
      ),
    });

    const exit = await Effect.runPromiseExit(
      toAccountOrganizationHttpResponse(
        Effect.fail(new AccountOrganizationOperationError({ cause })),
      ),
    );

    expect(Exit.isFailure(exit)).toBe(true);

    if (Exit.isFailure(exit)) expect(Cause.hasDies(exit.cause)).toBe(true);
  });
});
