import type { TFunction } from "i18next";
import type { EventScoringRule } from "@lootlog/domain/scoring";
import { formatScoringConditions } from "../../utils/scoring-rule-labels";

export const getScoringRuleName = (rule: EventScoringRule, t: TFunction) => {
  if (rule.name) return rule.name;

  if (rule.action.type === "ADD_BONUS") {
    return t("events.scoring.unnamedBonus");
  }

  return rule.id;
};

export const getScoringRuleCondition = (rule: EventScoringRule, t: TFunction) =>
  formatScoringConditions(rule.conditions, t);
