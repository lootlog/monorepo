import type { PlanGrant } from "@lootlog/schema/plans";

export const PLAN_VALIDITY_CHOICES = [
  "keep",
  "unlimited",
  "30d",
  "90d",
  "365d",
] as const;

export type PlanValidityChoice = (typeof PLAN_VALIDITY_CHOICES)[number];

const EXTENSION_DAYS = { "30d": 30, "90d": 90, "365d": 365 } as const;

const DAY_MS = 24 * 60 * 60 * 1_000;

export const planValidUntil = (
  current: PlanGrant,
  choice: PlanValidityChoice,
  now: number,
): string | null => {
  if (choice === "keep") return current.validUntil;

  if (choice === "unlimited") return null;

  const currentEnd =
    current.plan === "premium" && current.validUntil !== null
      ? Date.parse(current.validUntil)
      : now;

  return new Date(
    Math.max(currentEnd, now) + EXTENSION_DAYS[choice] * DAY_MS,
  ).toISOString();
};
