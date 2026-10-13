import type { TFunction } from "i18next";
import type {
  EventScoringAction,
  EventScoringRule,
} from "@lootlog/domain/scoring";
import { formatPoints } from "../../utils/format-points";
import {
  formatScoringAction,
  formatScoringConditions,
} from "../../utils/scoring-rule-labels";

export const getScoringRuleAction = (
  action: EventScoringAction,
  t: TFunction,
) => {
  if (action.type === "SET_BASE") {
    return t("events.scoring.actionSummary.basePoints", {
      points: formatPoints(action.points),
    });
  }

  if (action.type === "ADD_BONUS") {
    return t("events.scoring.actionSummary.bonusPoints", {
      points: formatPoints(action.points),
    });
  }

  return formatScoringAction(action, t);
};

export const getScoringRuleName = (rule: EventScoringRule, t: TFunction) => {
  if (rule.name) return rule.name;

  if (rule.action.type === "ADD_BONUS") {
    return t("events.scoring.unnamedBonus");
  }

  return rule.id;
};

export const getScoringRuleCondition = (rule: EventScoringRule, t: TFunction) =>
  formatScoringConditions(rule.conditions, t);
