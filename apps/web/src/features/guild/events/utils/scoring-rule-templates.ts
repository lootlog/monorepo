import type { EventScoringRule } from "@lootlog/domain/scoring";

const makeRuleId = () =>
  `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface ScoringRuleTemplate {
  id: string;
  i18nKey: string;
  i18nDescriptionKey: string;
  createRule: () => EventScoringRule;
}

export const SCORING_RULE_TEMPLATES: ScoringRuleTemplate[] = [
  {
    id: "baseThreshold",
    i18nKey: "events.scoring.template.baseThreshold",
    i18nDescriptionKey: "events.scoring.template.baseThresholdDesc",
    createRule: () => ({
      id: makeRuleId(),
      name: "Base threshold",
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
    }),
  },
  {
    id: "smallGroupBonus",
    i18nKey: "events.scoring.template.smallGroupBonus",
    i18nDescriptionKey: "events.scoring.template.smallGroupBonusDesc",
    createRule: () => ({
      id: makeRuleId(),
      name: "Small group bonus",
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
    }),
  },
  {
    id: "nightBonus",
    i18nKey: "events.scoring.template.nightBonus",
    i18nDescriptionKey: "events.scoring.template.nightBonusDesc",
    createRule: () => ({
      id: makeRuleId(),
      name: "Night bonus",
      enabled: true,
      conditions: [
        {
          type: "RESPAWN_WINDOW_COVERAGE",
          from: "03:00",
          to: "08:00",
          operator: ">=",
          value: 75,
        },
      ],
      action: { type: "ADD_BONUS", points: 0.5 },
    }),
  },
  {
    id: "killTimeBonus",
    i18nKey: "events.scoring.template.killTimeBonus",
    i18nDescriptionKey: "events.scoring.template.killTimeBonusDesc",
    createRule: () => ({
      id: makeRuleId(),
      name: "Kill time bonus",
      enabled: true,
      conditions: [
        {
          type: "KILL_TIME_IN_WINDOW",
          from: "08:00",
          to: "11:00",
        },
      ],
      action: { type: "ADD_BONUS", points: 0.5 },
    }),
  },
  {
    id: "leaveGrace",
    i18nKey: "events.scoring.template.leaveGrace",
    i18nDescriptionKey: "events.scoring.template.leaveGraceDesc",
    createRule: () => ({
      id: makeRuleId(),
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
    }),
  },
];
