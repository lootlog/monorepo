import { describe, expect, it } from "vitest";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import {
  evaluateEventScoring,
  type EvaluationContext,
} from "./scoring-applied-rules";

const BASE_RULES: EventScoringRules = {
  version: 1,
  timezone: "Europe/Warsaw",
  hardCapPoints: 2.0,
  minTrackingPercentForBonuses: 50,
  rules: [
    {
      id: "base-75",
      name: "Base 75%",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 75,
        },
      ],
      action: { type: "SET_BASE", points: 1.0 },
    },
    {
      id: "base-50",
      name: "Base 50%",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 50,
        },
      ],
      action: { type: "SET_BASE", points: 0.5 },
    },
    {
      id: "leave-grace",
      name: "Leave grace",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "trackingDurationPercentage",
          operator: ">=",
          value: 75,
        },
        {
          type: "BOOLEAN",
          factor: "memberPresentAtKill",
          value: false,
        },
        {
          type: "NUMERIC",
          factor: "minutesSinceLeaveToKill",
          operator: ">",
          value: 10,
        },
      ],
      action: { type: "ZERO_BASE" },
    },
    {
      id: "bonus-group",
      name: "Small group",
      enabled: true,
      conditions: [
        {
          type: "NUMERIC",
          factor: "assignedMembersCount",
          operator: ">=",
          value: 1,
        },
        {
          type: "NUMERIC",
          factor: "assignedMembersCount",
          operator: "<=",
          value: 4,
        },
      ],
      action: { type: "ADD_BONUS", points: 0.5 },
    },
  ],
};

function createContext(
  overrides: Partial<EvaluationContext> = {},
): EvaluationContext {
  const now = new Date();
  const killTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
  );
  const respawnStartTime = new Date(killTime.getTime() - 7200 * 1000);

  return {
    trackingDurationPercentage: 80,
    trackingDurationSeconds: 5760,
    assignedMembersCount: 3,
    killTime,
    respawnStartTime,
    respawnDurationSeconds: 7200,
    respawnProgressPercentage: undefined,
    minutesSinceLeaveToKill: null,
    memberPresentAtKill: true,
    timeOnMapSeconds: 5760,
    afkPercentage: 0,
    wasPresent: true,
    ...overrides,
  };
}

describe("evaluateEventScoring", () => {
  it("sets base points when tracking meets threshold", () => {
    const context = createContext({ trackingDurationPercentage: 80 });
    const result = evaluateEventScoring(BASE_RULES, context);

    expect(result.basePoints).toBe(0.5);
    expect(result.appliedRules.some((r) => r.ruleId === "base-75")).toBe(true);
    expect(result.appliedRules.some((r) => r.ruleId === "base-50")).toBe(true);
  });

  it("last matching SET_BASE wins", () => {
    const context = createContext({ trackingDurationPercentage: 80 });
    const result = evaluateEventScoring(BASE_RULES, context);

    // base-75 sets 1.0, then base-50 overwrites to 0.5 (evaluated in order)
    expect(result.basePoints).toBe(0.5);
  });

  it("does not set base when tracking is below all thresholds", () => {
    const context = createContext({ trackingDurationPercentage: 20 });
    const result = evaluateEventScoring(BASE_RULES, context);

    expect(result.basePoints).toBe(0);
    expect(result.totalPoints).toBe(0);
  });

  it("adds bonus for small group when tracking meets minimum", () => {
    const context = createContext({
      trackingDurationPercentage: 80,
      assignedMembersCount: 3,
    });
    const result = evaluateEventScoring(BASE_RULES, context);

    expect(result.bonusPoints).toBe(0.5);
    expect(result.appliedRules.some((r) => r.ruleId === "bonus-group")).toBe(
      true,
    );
  });

  it("does not add bonus when tracking is below minTrackingPercentForBonuses", () => {
    const context = createContext({
      trackingDurationPercentage: 40,
      assignedMembersCount: 3,
    });
    const result = evaluateEventScoring(BASE_RULES, context);

    expect(result.bonusPoints).toBe(0);
    expect(result.appliedRules.some((r) => r.ruleId === "bonus-group")).toBe(
      false,
    );
  });

  it("does not add bonus when group is too large", () => {
    const context = createContext({
      trackingDurationPercentage: 80,
      assignedMembersCount: 10,
    });
    const result = evaluateEventScoring(BASE_RULES, context);

    expect(result.bonusPoints).toBe(0);
  });

  it("zeroes base via ZERO_BASE when leave grace fires", () => {
    const context = createContext({
      trackingDurationPercentage: 80,
      memberPresentAtKill: false,
      minutesSinceLeaveToKill: 15,
    });
    const result = evaluateEventScoring(BASE_RULES, context);

    // base-75 sets 1.0, base-50 overwrites to 0.5, leave-grace zeroes it
    expect(result.basePoints).toBe(0);
    expect(result.appliedRules.some((r) => r.ruleId === "leave-grace")).toBe(
      true,
    );
  });

  it("does not zero base when leave time is short", () => {
    const context = createContext({
      trackingDurationPercentage: 80,
      memberPresentAtKill: false,
      minutesSinceLeaveToKill: 5,
    });
    const result = evaluateEventScoring(BASE_RULES, context);

    expect(result.basePoints).toBe(0.5);
    expect(result.appliedRules.some((r) => r.ruleId === "leave-grace")).toBe(
      false,
    );
  });

  it("caps total at hardCapPoints", () => {
    const rules: EventScoringRules = {
      ...BASE_RULES,
      hardCapPoints: 0.75,
    };
    const context = createContext({
      trackingDurationPercentage: 80,
      assignedMembersCount: 2,
    });
    const result = evaluateEventScoring(rules, context);

    expect(result.basePoints + result.bonusPoints).toBeGreaterThan(0.75);
    expect(result.totalPoints).toBe(0.75);
  });

  it("skips disabled rules", () => {
    const rules: EventScoringRules = {
      ...BASE_RULES,
      rules: BASE_RULES.rules.map((rule) =>
        rule.id === "base-75" ? { ...rule, enabled: false } : rule,
      ),
    };
    const context = createContext({ trackingDurationPercentage: 80 });
    const result = evaluateEventScoring(rules, context);

    expect(result.appliedRules.some((r) => r.ruleId === "base-75")).toBe(false);
  });

  it("returns zero for empty rules", () => {
    const rules: EventScoringRules = {
      ...BASE_RULES,
      rules: [],
    };
    const context = createContext();
    const result = evaluateEventScoring(rules, context);

    expect(result.totalPoints).toBe(0);
    expect(result.basePoints).toBe(0);
    expect(result.bonusPoints).toBe(0);
    expect(result.appliedRules).toHaveLength(0);
  });

  it("evaluates boolean condition correctly", () => {
    const rules: EventScoringRules = {
      ...BASE_RULES,
      rules: [
        {
          id: "present-only",
          name: "Present bonus",
          enabled: true,
          conditions: [
            { type: "BOOLEAN", factor: "memberPresentAtKill", value: true },
          ],
          action: { type: "ADD_BONUS", points: 0.25 },
        },
      ],
    };

    const present = createContext({ memberPresentAtKill: true });
    const absent = createContext({ memberPresentAtKill: false });

    expect(evaluateEventScoring(rules, present).bonusPoints).toBe(0.25);
    expect(evaluateEventScoring(rules, absent).bonusPoints).toBe(0);
  });

  it("stacks multiple bonuses", () => {
    const rules: EventScoringRules = {
      ...BASE_RULES,
      hardCapPoints: 10,
      rules: [
        {
          id: "bonus-a",
          name: "A",
          enabled: true,
          conditions: [],
          action: { type: "ADD_BONUS", points: 0.3 },
        },
        {
          id: "bonus-b",
          name: "B",
          enabled: true,
          conditions: [],
          action: { type: "ADD_BONUS", points: 0.7 },
        },
      ],
    };
    const context = createContext({ trackingDurationPercentage: 80 });
    const result = evaluateEventScoring(rules, context);

    expect(result.bonusPoints).toBe(1.0);
    expect(result.appliedRules).toHaveLength(2);
  });

  it("returns applied rules with correct metadata", () => {
    const context = createContext({
      trackingDurationPercentage: 80,
      assignedMembersCount: 2,
    });
    const result = evaluateEventScoring(BASE_RULES, context);

    const groupBonus = result.appliedRules.find(
      (r) => r.ruleId === "bonus-group",
    );
    expect(groupBonus).toBeDefined();
    expect(groupBonus?.ruleName).toBe("Small group");
    expect(groupBonus?.points).toBe(0.5);
    expect(groupBonus?.actionType).toBe("ADD_BONUS");
  });
});
