import { describe, expect, it } from "vitest";
import {
  evaluateEventScoring,
  normalizeEventScoringRules,
  type EventScoringRules,
} from "./index";

const rules: EventScoringRules = {
  version: 1,
  timezone: "Europe/Warsaw",
  hardCapPoints: 2,
  minTrackingPercentForBonuses: 50,
  rules: [
    {
      id: "base",
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 75,
        },
      ],
      action: { type: "SET_BASE", points: 1 },
    },
    {
      id: "night",
      conditions: [
        {
          type: "KILL_TIME_IN_WINDOW",
          from: "22:00",
          to: "03:00",
        },
      ],
      action: { type: "ADD_BONUS", points: 0.5 },
    },
  ],
};

describe("@lootlog/scoring", () => {
  it("evaluates the same domain rules for every consumer", () => {
    const result = evaluateEventScoring({
      mode: "ADVANCED",
      rules,
      context: {
        eligible: true,
        trackingDurationPercentage: 80,
        trackingDurationSeconds: 4800,
        assignedMembersCount: 3,
        killTime: new Date("2026-01-15T22:30:00.000Z"),
        respawnStartTime: new Date("2026-01-15T20:30:00.000Z"),
        memberPresentAtKill: true,
        timeOnMapSeconds: 4800,
        afkPercentage: 0,
        wasPresent: true,
      },
    });

    expect(result).toEqual({
      totalPoints: 1.5,
      basePoints: 1,
      bonusPoints: 0.5,
      appliedBonuses: [{ ruleId: "night", ruleName: null, points: 0.5 }],
      appliedRules: [
        {
          ruleId: "base",
          ruleName: null,
          points: 1,
          actionType: "SET_BASE",
        },
        {
          ruleId: "night",
          ruleName: null,
          points: 0.5,
          actionType: "ADD_BONUS",
        },
      ],
    });
  });

  it("normalizes invalid input to independent default rules", () => {
    const first = normalizeEventScoringRules(null);
    first.rules[0]!.enabled = false;

    expect(normalizeEventScoringRules(null).rules[0]!.enabled).toBe(true);
  });
});
