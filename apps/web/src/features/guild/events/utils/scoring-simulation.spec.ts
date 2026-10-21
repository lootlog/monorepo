import { describe, expect, it } from "vitest";
import { DEFAULT_ADVANCED_EVENT_SCORING_RULES } from "@lootlog/domain/scoring";
import { applyGroupRulebook } from "./scoring-rule-templates";
import {
  SIMULATION_PRESETS,
  simulateScoringTimeline,
} from "./scoring-simulation";

const rulebook = applyGroupRulebook({
  ...DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  rules: [],
});

const simulate = (presetId: (typeof SIMULATION_PRESETS)[number]["id"]) => {
  const preset = SIMULATION_PRESETS.find((entry) => entry.id === presetId);

  if (!preset) throw new Error(`Missing preset ${presetId}`);

  return Object.fromEntries(
    simulateScoringTimeline(rulebook, preset.timeline).results.map((entry) => [
      entry.participant.name,
      entry.explanation.result.basePoints,
    ]),
  );
};

describe("timeline simulation with the solo / small group rulebook", () => {
  it("keeps the solo base when a second member joins for the last 5 minutes", () => {
    // The same kill recalculated by the API awards 3 and 0
    // (apps/api/test/event-scoring-presence.integration.test.ts).
    expect(simulate("lateSecondMember")).toEqual({
      "Gracz A": 3,
      "Gracz B": 0,
    });
  });

  it("gives both members of a handover the solo base", () => {
    expect(simulate("handover")).toEqual({ "Gracz A": 3, "Gracz B": 3 });
  });

  it("keeps the small-group base for four members through a short fifth arrival", () => {
    expect(simulate("shortFifthMember")).toEqual({
      "Gracz A": 2,
      "Gracz B": 2,
      "Gracz C": 2,
      "Gracz D": 2,
      "Gracz E": 0,
    });
  });

  it("awards the full base only to the member who joined within 5 minutes", () => {
    const rules = {
      ...rulebook,
      rules: rulebook.rules.filter(
        (rule) =>
          !rule.conditions.some((condition) => condition.type === "GROUP_SIZE"),
      ),
    };

    const preset = SIMULATION_PRESETS.find(
      (entry) => entry.id === "joinWithinTolerance",
    );

    if (!preset) throw new Error("Missing preset");

    expect(
      simulateScoringTimeline(rules, preset.timeline).results.map(
        (entry) => entry.explanation.result.basePoints,
      ),
    ).toEqual([1, 0.5]);
  });
});

it("raises the cap so the solo base and existing bonuses are not cut", () => {
  const result = applyGroupRulebook(DEFAULT_ADVANCED_EVENT_SCORING_RULES);

  expect(result.hardCapPoints).toBe(4.5);
  expect(result.rules.map((rule) => rule.action)).toEqual([
    { type: "SET_BASE", points: 0.5 },
    { type: "SET_BASE", points: 1 },
    { type: "SET_BASE", points: 2 },
    { type: "SET_BASE", points: 3 },
    { type: "ADD_BONUS", points: 0.5 },
    { type: "ADD_BONUS", points: 0.5 },
    { type: "ADD_BONUS", points: 0.5 },
  ]);
});
