import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringRule,
} from "@lootlog/domain/scoring";

export const makeRuleId = () =>
  `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface ScoringRuleTemplate {
  id: string;
  i18nKey: string;
  i18nDescriptionKey: string;
  createRule: () => EventScoringRule;
}

const createPresetRule = (presetId: string, name: string): EventScoringRule => {
  const preset = DEFAULT_ADVANCED_EVENT_SCORING_RULES.rules.find(
    (rule) => rule.id === presetId,
  );
  if (!preset) throw new Error(`Unknown scoring preset: ${presetId}`);
  return { ...structuredClone(preset), id: makeRuleId(), name };
};

export const SCORING_RULE_TEMPLATES: ScoringRuleTemplate[] = [
  {
    id: "baseThreshold",
    i18nKey: "events.scoring.template.baseThreshold",
    i18nDescriptionKey: "events.scoring.template.baseThresholdDesc",
    createRule: () => createPresetRule("base-75", "Base threshold"),
  },
  {
    id: "smallGroupBonus",
    i18nKey: "events.scoring.template.smallGroupBonus",
    i18nDescriptionKey: "events.scoring.template.smallGroupBonusDesc",
    createRule: () =>
      createPresetRule("bonus-small-group", "Small group bonus"),
  },
  {
    id: "nightBonus",
    i18nKey: "events.scoring.template.nightBonus",
    i18nDescriptionKey: "events.scoring.template.nightBonusDesc",
    createRule: () => createPresetRule("bonus-night", "Night bonus"),
  },
  {
    id: "killTimeBonus",
    i18nKey: "events.scoring.template.killTimeBonus",
    i18nDescriptionKey: "events.scoring.template.killTimeBonusDesc",
    createRule: () => createPresetRule("bonus-pvp", "Kill time bonus"),
  },
  {
    id: "leaveGrace",
    i18nKey: "events.scoring.template.leaveGrace",
    i18nDescriptionKey: "events.scoring.template.leaveGraceDesc",
    createRule: () => createPresetRule("leave-grace", "Leave grace"),
  },
];
