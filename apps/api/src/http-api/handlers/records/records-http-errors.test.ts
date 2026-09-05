import { describe, expect, it } from "bun:test";
import { Cause, Effect, Exit } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { SqlError, UniqueViolation } from "effect/unstable/sql/SqlError";
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
    [new ResourceNotFoundError("CANT_DELETE_LOOT"), 404, "CANT_DELETE_LOOT"],
    [new InvalidRequestError("MISSING_LOOT_SHARE"), 400, "MISSING_LOOT_SHARE"],
    [new PermissionDeniedError("CANT_UPDATE_LOOT"), 403, "CANT_UPDATE_LOOT"],
    [
      new ResourceConflictError("Conflicting loot share"),
      409,
      "Conflicting loot share",
    ],
  ] as const)(
    "returns the declared loot failure %#",
    async (cause, status, message) => {
      const response = HttpServerResponse.toWeb(
        await Effect.runPromise(
          toRecordsHttpResponse(Effect.fail(new RecordsDataError({ cause }))),
        ),
      );
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ message });
    },
  );

  it("preserves rejected Organization details for the game client", async () => {
    const body = {
      message: "NO_GUILDS_ON_THE_CHARACTER_WHITELIST",
      submittedGuilds: [],
      rejectedGuilds: [{ id: "guild-a", reason: "NOT_ON_CHARACTER_WHITELIST" }],
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
    [400, "Unknown settings domain"],
    [403, "Guild settings are not accessible"],
  ] as const)(
    "returns settings status %s and its reason",
    async (status, message) => {
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
      expect(await response.json()).toEqual({ message });
    },
  );

  it("preserves configuration validation reasons", async () => {
    const response = HttpServerResponse.toWeb(
      await Effect.runPromise(
        toAccountOrganizationHttpResponse(
          Effect.fail(
            new AccountOrganizationOperationError({
              cause: new InvalidRequestError({
                message: "errors.guilds.reservations.durationRangeInvalid",
              }),
            }),
          ),
        ),
      ),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "errors.guilds.reservations.durationRangeInvalid",
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
      message: "errors.guilds.vanityUrlTaken",
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
