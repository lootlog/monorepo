import { inArray } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import { Capability } from "@lootlog/schema/permissions";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import {
  requestApiKeyAccess,
  requestApiKeyCaller,
} from "./forward-auth-identity.js";

export const apiKeyOrganizationFilter = (column: AnyPgColumn) =>
  Effect.map(requestApiKeyAccess, (access) =>
    access === undefined
      ? undefined
      : inArray(column, [...access.organizationIds]),
  );

export const apiKeyCacheSuffix = Effect.map(requestApiKeyAccess, (access) =>
  access === undefined ? "" : `:api-key:${access.keyId}`,
);

export const apiKeyCallerGuilds = (
  database: typeof ApiDatabase.Service,
  permissions: ReadonlyArray<Capability> = [Capability.LOOTLOG_ACCESS],
) =>
  Effect.gen(function* () {
    const caller = yield* requestApiKeyCaller;

    if (!caller) return undefined;

    const rows = yield* selectAccessibleGuilds(
      database,
      caller.discordId,
      permissions,
    );

    return {
      discordId: caller.discordId,
      guilds: rows.map(({ guild }) => guild),
    };
  });

export const apiKeyAccessibleGuilds = (
  database: typeof ApiDatabase.Service,
  permissions?: ReadonlyArray<Capability>,
) =>
  Effect.map(
    apiKeyCallerGuilds(database, permissions),
    (scope) => scope?.guilds,
  );
