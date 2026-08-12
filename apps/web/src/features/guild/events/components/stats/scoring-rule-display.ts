import type { TFunction } from "i18next";
import type { EventScoringRule } from "@lootlog/scoring";
import { formatScoringCondition } from "../../utils/scoring-rule-labels";

export const getScoringRuleName = (rule: EventScoringRule, t: TFunction) => {
  if (rule.name) return rule.name;
  if (rule.action.type === "ADD_BONUS") {
    return t("events.scoring.unnamedBonus");
  }
  return rule.id;
};

export const getScoringRuleCondition = (
  rule: EventScoringRule,
  t: TFunction,
) => {
  if (rule.conditions.length === 0) {
    return t("events.scoring.always");
  }

  return rule.conditions
    .map((condition) => formatScoringCondition(condition, t))
    .join(` ${t("events.scoring.andLabel")} `);
};
