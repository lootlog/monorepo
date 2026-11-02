import { inArray } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import {
  requestApiKeyAccess,
  requestScopedIdentity,
} from "./forward-auth-identity.js";

/** Constrain source queries before pagination, aggregation, or write fanout. */
export const apiKeyOrganizationFilter = (column: AnyPgColumn) =>
  Effect.map(requestApiKeyAccess, (access) =>
    access === undefined
      ? undefined
      : inArray(column, [...access.organizationIds]),
  );

export const apiKeyCacheSuffix = Effect.map(requestApiKeyAccess, (access) =>
  access === undefined ? "" : `:api-key:${access.keyId}`,
);

/**
 * The Organizations an API key request may act on with any of `permissions`:
 * granted to the key and to its User. `undefined` for a session, which keeps
 * the scope of the endpoint it calls.
 */
export const apiKeyAccessibleGuilds = (
  database: typeof ApiDatabase.Service,
  permissions: ReadonlyArray<Permission> = [Permission.LOOTLOG_ACCESS],
) =>
  Effect.gen(function* () {
    if (!(yield* requestApiKeyAccess)) return undefined;
    const identity = yield* requestScopedIdentity;

    const rows = yield* selectAccessibleGuilds(
      database,
      identity.discordId,
      permissions,
    );

    return rows.map(({ guild }) => guild);
  });
