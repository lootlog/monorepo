import { inArray } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import { requestApiKeyAccess } from "./forward-auth-identity.js";

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
