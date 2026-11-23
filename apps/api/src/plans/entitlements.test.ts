import { describe, expect, it } from "bun:test";
import {
  type OrganizationEntitlementRow,
  organizationLimits,
  type UserEntitlementRow,
  userEntitlements,
} from "./entitlements.js";
import { ORGANIZATION_PLANS, USER_PLANS } from "./plan-catalog.js";

const now = new Date("2026-11-23T12:00:00.000Z");

const organizationRow = (
  values: Partial<OrganizationEntitlementRow> = {},
): OrganizationEntitlementRow => ({
  guildId: "guild",
  plan: null,
  planValidUntil: null,
  notificationRuleLimit: null,
  documentLimit: null,
  updatedByUserId: "operator",
  updatedAt: now,
  ...values,
});

const userRow = (
  values: Partial<UserEntitlementRow> = {},
): UserEntitlementRow => ({
  userId: "user",
  plan: null,
  planValidUntil: null,
  planExpiryAnnouncedAt: null,
  notificationRuleLimit: null,
  watchedItemLimit: null,
  customThemeLimit: null,
  apiKeyLimit: null,
  characterAuras: null,
  updatedByUserId: "operator",
  updatedAt: now,
  ...values,
});

describe("plan entitlements", () => {
  it("falls back to the free plan once a premium plan expires, but keeps the operator's overrides", () => {
    const expired = organizationRow({
      plan: "premium",
      planValidUntil: new Date("2026-11-23T11:59:59.999Z"),
      documentLimit: 40,
    });

    expect(organizationLimits(expired, now)).toEqual({
      notificationRules: ORGANIZATION_PLANS.free.notificationRules,
      documents: 40,
    });
  });

  it("keeps premium until its last moment and forever when it has no end", () => {
    expect(
      userEntitlements(
        userRow({
          plan: "premium",
          planValidUntil: new Date("2026-11-23T12:00:00.001Z"),
        }),
        now,
      ),
    ).toEqual(USER_PLANS.premium);
    expect(userEntitlements(userRow({ plan: "premium" }), now)).toEqual(
      USER_PLANS.premium,
    );
  });

  it("lets an override take character auras away from a premium User", () => {
    expect(
      userEntitlements(userRow({ plan: "premium", characterAuras: false }), now)
        .characterAuras,
    ).toBe(false);
  });
});
