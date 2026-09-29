import { expect, it } from "vitest";
import { getOnboardingSteps } from "./onboarding-steps";

const statuses = (signals: Parameters<typeof getOnboardingSteps>[0]) =>
  getOnboardingSteps(signals)?.map(({ id, status }) => `${id}:${status}`) ??
  null;

it("guides a new user without an Organization from the add-on onward", () => {
  expect(
    statuses({ organizationCount: 0, lifetimeKills: 0, recentBattles: 0 }),
  ).toEqual([
    "installAddon:current",
    "joinOrganization:upcoming",
    "catchingScope:upcoming",
  ]);
  expect(
    statuses({
      organizationCount: 0,
      lifetimeKills: undefined,
      recentBattles: undefined,
    }),
  ).toEqual([
    "installAddon:current",
    "joinOrganization:upcoming",
    "catchingScope:upcoming",
  ]);
});

it("marks the add-on installed once the game client recorded activity", () => {
  expect(
    statuses({
      organizationCount: 0,
      lifetimeKills: undefined,
      recentBattles: 2,
    }),
  ).toEqual([
    "installAddon:done",
    "joinOrganization:current",
    "catchingScope:upcoming",
  ]);
});

it("keeps guiding a member whose game client has recorded nothing", () => {
  expect(
    statuses({ organizationCount: 1, lifetimeKills: 0, recentBattles: 0 }),
  ).toEqual([
    "installAddon:current",
    "joinOrganization:done",
    "catchingScope:upcoming",
  ]);
});

it("never shows the checklist to active members or before membership is known", () => {
  expect(
    statuses({ organizationCount: 2, lifetimeKills: 5, recentBattles: 0 }),
  ).toBeNull();
  expect(
    statuses({
      organizationCount: 1,
      lifetimeKills: 0,
      recentBattles: undefined,
    }),
  ).toBeNull();
  expect(
    statuses({
      organizationCount: undefined,
      lifetimeKills: 0,
      recentBattles: 0,
    }),
  ).toBeNull();
});
