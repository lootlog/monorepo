import { describe, expect, it } from "vitest";
import { SCORING_RULE_TEMPLATES } from "./scoring-rule-templates";

describe("SCORING_RULE_TEMPLATES", () => {
  it("has 5 templates", () => {
    expect(SCORING_RULE_TEMPLATES).toHaveLength(5);
  });

  it("each template has unique id", () => {
    const ids = SCORING_RULE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each template creates a rule with a unique generated id", () => {
    const ruleIds = SCORING_RULE_TEMPLATES.map((t) => t.createRule().id);
    expect(new Set(ruleIds).size).toBe(ruleIds.length);
  });

  it("each created rule has at least one condition", () => {
    for (const template of SCORING_RULE_TEMPLATES) {
      const rule = template.createRule();
      expect(rule.conditions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("each created rule is enabled by default", () => {
    for (const template of SCORING_RULE_TEMPLATES) {
      const rule = template.createRule();
      expect(rule.enabled).toBe(true);
    }
  });

  it("baseThreshold creates SET_BASE action", () => {
    const template = SCORING_RULE_TEMPLATES.find(
      (t) => t.id === "baseThreshold",
    );
    const rule = template?.createRule();
    expect(rule?.action.type).toBe("SET_BASE");
  });

  it("smallGroupBonus creates ADD_BONUS with two range conditions", () => {
    const template = SCORING_RULE_TEMPLATES.find(
      (t) => t.id === "smallGroupBonus",
    );
    const rule = template?.createRule();
    expect(rule?.action.type).toBe("ADD_BONUS");
    expect(rule?.conditions).toHaveLength(2);
    expect(
      rule?.conditions.every(
        (c) => c.type === "NUMERIC" && c.factor === "assignedMembersCount",
      ),
    ).toBe(true);
  });

  it("nightBonus creates ADD_BONUS with RESPAWN_WINDOW_COVERAGE condition", () => {
    const template = SCORING_RULE_TEMPLATES.find((t) => t.id === "nightBonus");
    const rule = template?.createRule();
    expect(rule?.action.type).toBe("ADD_BONUS");
    expect(rule?.conditions[0]?.type).toBe("RESPAWN_WINDOW_COVERAGE");
  });

  it("killTimeBonus creates ADD_BONUS with KILL_TIME_IN_WINDOW condition", () => {
    const template = SCORING_RULE_TEMPLATES.find(
      (t) => t.id === "killTimeBonus",
    );
    const rule = template?.createRule();
    expect(rule?.action.type).toBe("ADD_BONUS");
    expect(rule?.conditions[0]?.type).toBe("KILL_TIME_IN_WINDOW");
  });

  it("leaveGrace creates ZERO_BASE with 3 conditions", () => {
    const template = SCORING_RULE_TEMPLATES.find((t) => t.id === "leaveGrace");
    const rule = template?.createRule();
    expect(rule?.action.type).toBe("ZERO_BASE");
    expect(rule?.conditions).toHaveLength(3);
  });

  it("each template has i18n keys", () => {
    for (const template of SCORING_RULE_TEMPLATES) {
      expect(template.i18nKey).toMatch(/^events\.scoring\.template\./);
      expect(template.i18nDescriptionKey).toMatch(
        /^events\.scoring\.template\./,
      );
    }
  });
});
