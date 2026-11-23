import type {
  OrganizationLimits,
  Plan,
  UserEntitlements,
} from "@lootlog/schema/plans";

export const ORGANIZATION_PLANS = {
  free: { notificationRules: 10, documents: 5 },
  premium: { notificationRules: 50, documents: 125 },
} as const satisfies Record<Plan, OrganizationLimits>;

export const USER_PLANS = {
  free: {
    notificationRules: 10,
    watchedItems: 10,
    customThemes: 2,
    apiKeys: 10,
    characterAuras: false,
  },
  premium: {
    notificationRules: 125,
    watchedItems: 50,
    customThemes: 25,
    apiKeys: 25,
    characterAuras: true,
  },
} as const satisfies Record<Plan, UserEntitlements>;
