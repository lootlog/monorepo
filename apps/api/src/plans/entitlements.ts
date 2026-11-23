import type {
  AdminOrganizationEntitlement,
  AdminUserEntitlement,
  OrganizationEntitlementChange,
  OrganizationLimits,
  Plan,
  PlanGrant,
  UserEntitlementChange,
  UserEntitlements,
} from "@lootlog/schema/plans";
import { eq } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { omit } from "es-toolkit";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  organizationEntitlementTable,
  userEntitlementTable,
} from "#src/database/drizzle/plan.schema";
import { ORGANIZATION_PLANS, USER_PLANS } from "./plan-catalog.js";

type Database = typeof ApiDatabase.Service;

type Reader = Pick<Database, "select">;

type Writer = Pick<Database, "insert" | "delete">;

export type OrganizationEntitlementRow =
  typeof organizationEntitlementTable.$inferSelect;

export type UserEntitlementRow = typeof userEntitlementTable.$inferSelect;

interface StoredGrant {
  readonly plan: OrganizationEntitlementRow["plan"];
  readonly planValidUntil: Date | null;
}

const activePlan = (grant: StoredGrant | undefined, now: Date): Plan =>
  grant?.plan && (grant.planValidUntil === null || grant.planValidUntil > now)
    ? grant.plan
    : "free";

export const organizationLimits = (
  row: OrganizationEntitlementRow | undefined,
  now: Date,
): OrganizationLimits => {
  const plan = ORGANIZATION_PLANS[activePlan(row, now)];

  return {
    notificationRules: row?.notificationRuleLimit ?? plan.notificationRules,
    documents: row?.documentLimit ?? plan.documents,
  };
};

export const userEntitlements = (
  row: UserEntitlementRow | undefined,
  now: Date,
): UserEntitlements => {
  const plan = USER_PLANS[activePlan(row, now)];

  return {
    notificationRules: row?.notificationRuleLimit ?? plan.notificationRules,
    watchedItems: row?.watchedItemLimit ?? plan.watchedItems,
    customThemes: row?.customThemeLimit ?? plan.customThemes,
    apiKeys: row?.apiKeyLimit ?? plan.apiKeys,
    characterAuras: row?.characterAuras ?? plan.characterAuras,
  };
};

const currentTime = Effect.map(
  Clock.currentTimeMillis,
  (millis) => new Date(millis),
);

const findOrganizationEntitlement = (database: Reader, guildId: string) =>
  database
    .select()
    .from(organizationEntitlementTable)
    .where(eq(organizationEntitlementTable.guildId, guildId))
    .limit(1)
    .pipe(Effect.map((rows) => rows[0]));

const findUserEntitlement = (database: Reader, userId: string) =>
  database
    .select()
    .from(userEntitlementTable)
    .where(eq(userEntitlementTable.userId, userId))
    .limit(1)
    .pipe(Effect.map((rows) => rows[0]));

export const readOrganizationLimits = (database: Reader, guildId: string) =>
  Effect.zipWith(
    findOrganizationEntitlement(database, guildId),
    currentTime,
    organizationLimits,
  );

export const readUserEntitlements = (database: Reader, userId: string) =>
  Effect.zipWith(
    findUserEntitlement(database, userId),
    currentTime,
    userEntitlements,
  );

export const readUserLimits = (database: Reader, userId: string) =>
  readUserEntitlements(database, userId).pipe(
    Effect.map((entitlements) => omit(entitlements, ["characterAuras"])),
  );

const storedGrant = (grant: PlanGrant) =>
  grant.plan === "free"
    ? { plan: null, planValidUntil: null }
    : {
        plan: grant.plan,
        planValidUntil: grant.validUntil ? new Date(grant.validUntil) : null,
      };

const grantView = (row: StoredGrant | undefined): PlanGrant =>
  row?.plan
    ? {
        plan: row.plan,
        validUntil: row.planValidUntil?.toISOString() ?? null,
      }
    : { plan: "free", validUntil: null };

const changedView = (
  row:
    | { readonly updatedByUserId: string | null; readonly updatedAt: Date }
    | undefined,
) =>
  row ? { by: row.updatedByUserId, at: row.updatedAt.toISOString() } : null;

const organizationEntitlementView = (
  row: OrganizationEntitlementRow | undefined,
  now: Date,
): AdminOrganizationEntitlement => ({
  grant: grantView(row),
  activePlan: activePlan(row, now),
  overrides: {
    notificationRules: row?.notificationRuleLimit ?? null,
    documents: row?.documentLimit ?? null,
  },
  plans: ORGANIZATION_PLANS,
  effective: organizationLimits(row, now),
  changed: changedView(row),
});

const userEntitlementView = (
  row: UserEntitlementRow | undefined,
  now: Date,
): AdminUserEntitlement => ({
  grant: grantView(row),
  activePlan: activePlan(row, now),
  overrides: {
    notificationRules: row?.notificationRuleLimit ?? null,
    watchedItems: row?.watchedItemLimit ?? null,
    customThemes: row?.customThemeLimit ?? null,
    apiKeys: row?.apiKeyLimit ?? null,
    characterAuras: row?.characterAuras ?? null,
  },
  plans: USER_PLANS,
  effective: userEntitlements(row, now),
  changed: changedView(row),
});

export const readOrganizationEntitlementView = (
  database: Reader,
  guildId: string,
) =>
  Effect.zipWith(
    findOrganizationEntitlement(database, guildId),
    currentTime,
    organizationEntitlementView,
  );

export const readUserEntitlementView = (database: Reader, userId: string) =>
  Effect.zipWith(
    findUserEntitlement(database, userId),
    currentTime,
    userEntitlementView,
  );

const grantsNothing = ({
  grant,
  overrides,
}: OrganizationEntitlementChange | UserEntitlementChange) =>
  grant.plan === "free" &&
  Object.values(overrides).every((value) => value === null);

export const writeOrganizationEntitlement = (
  database: Writer,
  guildId: string,
  change: OrganizationEntitlementChange,
  operatorUserId: string,
  now: Date,
) => {
  const { grant, overrides } = change;

  const values = {
    ...storedGrant(grant),
    notificationRuleLimit: overrides.notificationRules,
    documentLimit: overrides.documents,
  };

  if (grantsNothing(change))
    return database
      .delete(organizationEntitlementTable)
      .where(eq(organizationEntitlementTable.guildId, guildId))
      .pipe(Effect.asVoid);

  const stored = { ...values, updatedByUserId: operatorUserId, updatedAt: now };

  return database
    .insert(organizationEntitlementTable)
    .values({ guildId, ...stored })
    .onConflictDoUpdate({
      target: organizationEntitlementTable.guildId,
      set: stored,
    })
    .pipe(Effect.asVoid);
};

export const writeUserEntitlement = (
  database: Writer,
  userId: string,
  change: UserEntitlementChange,
  operatorUserId: string,
  now: Date,
) => {
  const { grant, overrides } = change;

  const values = {
    ...storedGrant(grant),
    notificationRuleLimit: overrides.notificationRules,
    watchedItemLimit: overrides.watchedItems,
    customThemeLimit: overrides.customThemes,
    apiKeyLimit: overrides.apiKeys,
    characterAuras: overrides.characterAuras,
  };

  if (grantsNothing(change))
    return database
      .delete(userEntitlementTable)
      .where(eq(userEntitlementTable.userId, userId))
      .pipe(Effect.asVoid);

  const stored = {
    ...values,
    planExpiryAnnouncedAt:
      values.planValidUntil !== null && values.planValidUntil <= now
        ? now
        : null,
    updatedByUserId: operatorUserId,
    updatedAt: now,
  };

  return database
    .insert(userEntitlementTable)
    .values({ userId, ...stored })
    .onConflictDoUpdate({ target: userEntitlementTable.userId, set: stored })
    .pipe(Effect.asVoid);
};
