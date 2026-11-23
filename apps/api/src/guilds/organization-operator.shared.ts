import type {
  AdminOrganizationStatus,
  OrganizationAuditDetails,
  OrganizationAuditEntry,
  OrganizationOperatorAction,
} from "@lootlog/schema/admin-organizations";
import { type SQL, and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import {
  isOperationalGuild,
  operationalGuild,
} from "#src/guilds/organization-operational";
import { RateLimitedError } from "@lootlog/protocol/http/errors";
import type { AccountOrganizationOperationError } from "#src/guilds/account-organization-data";

export type Database = typeof ApiDatabase.Service;

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface OrganizationOperator {
  readonly operatorUserId: string;
  readonly operatorName: string;
}

export class OrganizationNotFound extends TaggedErrorClass<
  OrganizationNotFound,
  { readonly brand: unique symbol }
>()("OrganizationNotFound", {}) {}

export class OrganizationSyncCooldown extends TaggedErrorClass<
  OrganizationSyncCooldown,
  { readonly brand: unique symbol }
>()("OrganizationSyncCooldown", {}) {}

export class OrganizationOperatorError extends TaggedErrorClass<
  OrganizationOperatorError,
  { readonly brand: unique symbol }
>()("OrganizationOperatorError", { cause: Schema.Defect() }) {}

export const countWhere = (condition: SQL | undefined) =>
  sql<number>`count(*) filter (where ${condition})`.mapWith(Number);

export const isoOrNull = (date: Date | null) => date?.toISOString() ?? null;

export const suspended = isNotNull(guildTable.suspendedAt);

export const statusWhere: Record<AdminOrganizationStatus, SQL | undefined> = {
  active: operationalGuild,
  suspended,
  inactive: and(eq(guildTable.active, false), isNull(guildTable.suspendedAt)),
};

export const statusOf = (guild: {
  readonly active: boolean;
  readonly suspendedAt: Date | null;
}): AdminOrganizationStatus =>
  guild.suspendedAt !== null
    ? "suspended"
    : isOperationalGuild(guild)
      ? "active"
      : "inactive";

export const activeMember = and(
  eq(memberTable.active, true),
  isNotNull(memberTable.globalUserId),
);

export const auditEntry = (row: {
  readonly id: number;
  readonly guildId: string;
  readonly guildName: string;
  readonly operatorName: string;
  readonly action: OrganizationOperatorAction;
  readonly details: OrganizationAuditDetails | null;
  readonly createdAt: Date;
}): OrganizationAuditEntry => ({
  id: String(row.id),
  organizationId: row.guildId,
  organizationName: row.guildName,
  actor: row.operatorName,
  action: row.action,
  details: row.details,
  createdAt: row.createdAt.toISOString(),
});

export const requireOrganization = (
  database: Pick<Database, "select">,
  guildId: string,
  lock = false,
) => {
  const query = database
    .select({ ownerId: guildTable.ownerId, vanityUrl: guildTable.vanityUrl })
    .from(guildTable)
    .where(eq(guildTable.id, guildId));

  return (lock ? query.for("no key update") : query).pipe(
    Effect.flatMap((rows) =>
      rows[0]
        ? Effect.succeed(rows[0])
        : Effect.fail(new OrganizationNotFound()),
    ),
  );
};

export const syncRefreshFailure = (error: AccountOrganizationOperationError) =>
  error.cause instanceof RateLimitedError
    ? new OrganizationSyncCooldown()
    : new OrganizationOperatorError({ cause: error });
