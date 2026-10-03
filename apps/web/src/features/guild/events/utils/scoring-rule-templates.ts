import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringRule,
} from "@lootlog/domain/scoring";
import i18n from "@/i18n/config";

export const makeRuleId = () =>
  `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface ScoringRuleTemplate {
  id: string;
  i18nKey: string;
  i18nDescriptionKey: string;
  createRule: () => EventScoringRule;
}

/**
 * Builds a template from a default preset rule. The created rule is named with
 * the template's translated label, which is what players see in the editor.
 */
const createPresetTemplate = (
  id: string,
  presetId: string,
): ScoringRuleTemplate => {
  const i18nKey = `events.scoring.template.${id}`;

  return {
    id,
    i18nKey,
    i18nDescriptionKey: `${i18nKey}Desc`,
    createRule: () => {
      const preset = DEFAULT_ADVANCED_EVENT_SCORING_RULES.rules.find(
        (rule) => rule.id === presetId,
      );

      if (!preset) throw new Error(`Unknown scoring preset: ${presetId}`);

      return {
        ...structuredClone(preset),
        id: makeRuleId(),
        name: i18n.t(i18nKey),
      };
    },
  };
};

export const SCORING_RULE_TEMPLATES: ScoringRuleTemplate[] = [
  createPresetTemplate("baseThreshold", "base-75"),
  createPresetTemplate("smallGroupBonus", "bonus-small-group"),
  createPresetTemplate("nightBonus", "bonus-night"),
  createPresetTemplate("killTimeBonus", "bonus-pvp"),
  createPresetTemplate("leaveGrace", "leave-grace"),
];
