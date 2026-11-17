import { expect, it } from "vitest";
import { SCORING_RULE_TEMPLATES } from "./scoring-rule-templates";

it("creates every template rule with a unique generated id", () => {
  const ruleIds = SCORING_RULE_TEMPLATES.map((t) => t.createRule().id);
  expect(new Set(ruleIds).size).toBe(ruleIds.length);
});

it("creates independent editable rule conditions", () => {
  const template = SCORING_RULE_TEMPLATES.find(
    (entry) => entry.id === "smallGroupBonus",
  );

  const first = template?.createRule();
  const second = template?.createRule();

  if (!first || !second) throw new Error("Missing small group template");
  first.conditions.length = 0;
  expect(second.conditions).toHaveLength(2);
  expect(template?.createRule().conditions).toHaveLength(2);
});
