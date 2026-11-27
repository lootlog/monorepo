import { Schema } from "effect";
import { DateTimeString, NonNegativeSafeInteger } from "./http-scalars.js";

export const PLANS = ["free", "premium"] as const;

export const Plan = Schema.Literals(PLANS);

export type Plan = typeof Plan.Type;

export const PLAN_LIMIT_BOUNDS = { min: 0, max: 1_000 } as const;

const PlanLimit = Schema.Int.check(
  Schema.isBetween({
    minimum: PLAN_LIMIT_BOUNDS.min,
    maximum: PLAN_LIMIT_BOUNDS.max,
  }),
);

export const OrganizationLimits = Schema.Struct({
  notificationRules: NonNegativeSafeInteger,
  documents: NonNegativeSafeInteger,
});

export type OrganizationLimits = typeof OrganizationLimits.Type;

export const UserLimits = Schema.Struct({
  notificationRules: NonNegativeSafeInteger,
  watchedItems: NonNegativeSafeInteger,
  customThemes: NonNegativeSafeInteger,
  apiKeys: NonNegativeSafeInteger,
  equipmentSets: NonNegativeSafeInteger,
});

export type UserLimits = typeof UserLimits.Type;

export const UserEntitlements = Schema.Struct({
  ...UserLimits.fields,
  characterAuras: Schema.Boolean,
});

export type UserEntitlements = typeof UserEntitlements.Type;

const OrganizationOverrides = Schema.Struct({
  notificationRules: Schema.NullOr(PlanLimit),
  documents: Schema.NullOr(PlanLimit),
});

export const UserOverrides = Schema.Struct({
  notificationRules: Schema.NullOr(PlanLimit),
  watchedItems: Schema.NullOr(PlanLimit),
  customThemes: Schema.NullOr(PlanLimit),
  apiKeys: Schema.NullOr(PlanLimit),
  equipmentSets: Schema.NullOr(PlanLimit),
  characterAuras: Schema.NullOr(Schema.Boolean),
});

export type UserOverrides = typeof UserOverrides.Type;

export const PlanGrant = Schema.Struct({
  plan: Plan,
  validUntil: Schema.NullOr(DateTimeString),
});

export type PlanGrant = typeof PlanGrant.Type;

export const OrganizationEntitlementChange = Schema.Struct({
  grant: PlanGrant,
  overrides: OrganizationOverrides,
});

export type OrganizationEntitlementChange =
  typeof OrganizationEntitlementChange.Type;

export const UserEntitlementChange = Schema.Struct({
  grant: PlanGrant,
  overrides: UserOverrides,
});

export type UserEntitlementChange = typeof UserEntitlementChange.Type;

const Changed = Schema.NullOr(
  Schema.Struct({
    by: Schema.NullOr(Schema.String),
    at: DateTimeString,
  }),
);

export const AdminOrganizationEntitlement = Schema.Struct({
  grant: PlanGrant,
  activePlan: Plan,
  overrides: OrganizationOverrides,
  plans: Schema.Struct({
    free: OrganizationLimits,
    premium: OrganizationLimits,
  }),
  effective: OrganizationLimits,
  changed: Changed,
});

export type AdminOrganizationEntitlement =
  typeof AdminOrganizationEntitlement.Type;

export const AdminUserEntitlement = Schema.Struct({
  grant: PlanGrant,
  activePlan: Plan,
  overrides: UserOverrides,
  plans: Schema.Struct({ free: UserEntitlements, premium: UserEntitlements }),
  effective: UserEntitlements,
  changed: Changed,
});

export type AdminUserEntitlement = typeof AdminUserEntitlement.Type;
