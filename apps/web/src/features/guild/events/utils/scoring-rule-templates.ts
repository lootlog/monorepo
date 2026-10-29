import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringCondition,
  type EventScoringRule,
  type EventScoringRules,
} from "@lootlog/domain/scoring";
import type { GroupSizeRange } from "@lootlog/domain/scoring-presence";
import i18n from "@/i18n/config";

export const makeRuleId = () =>
  `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface ScoringRuleTemplate {
  id: string;
  i18nKey: string;
  i18nDescriptionKey: string;
  createRule: () => EventScoringRule;
}

const templateKeys = (id: string) => {
  const i18nKey = `events.scoring.template.${id}`;

  return { i18nKey, i18nDescriptionKey: `${i18nKey}Desc` };
};

/**
 * Builds a template from a default preset rule. The created rule is named with
 * the template's translated label, which is what players see in the editor.
 */
const createPresetTemplate = (
  id: string,
  presetId: string,
): ScoringRuleTemplate => {
  const keys = templateKeys(id);

  return {
    id,
    ...keys,
    createRule: () => {
      const preset = DEFAULT_ADVANCED_EVENT_SCORING_RULES.rules.find(
        (rule) => rule.id === presetId,
      );

      if (!preset) throw new Error(`Unknown scoring preset: ${presetId}`);

      return {
        ...structuredClone(preset),
        id: makeRuleId(),
        name: i18n.t(keys.i18nKey),
      };
    },
  };
};

const windowShare = (value: number): EventScoringCondition => ({
  type: "NUMERIC",
  factor: "trackingDurationPercentage",
  operator: ">=",
  value,
});

const ownTimeInGroup = (size: GroupSizeRange): EventScoringCondition => ({
  type: "GROUP_SIZE",
  counting: "TIMELINE",
  size,
  minSharePercentage: 50,
  minTimePercentage: 90,
});

const createTemplate = (
  id: string,
  rule: Omit<EventScoringRule, "id" | "name" | "enabled">,
): ScoringRuleTemplate => {
  const keys = templateKeys(id);

  return {
    id,
    ...keys,
    createRule: () => ({
      ...structuredClone(rule),
      id: makeRuleId(),
      name: i18n.t(keys.i18nKey),
      enabled: true,
    }),
  };
};

const HALF_BASE = createTemplate("halfBase", {
  conditions: [windowShare(50)],
  action: { type: "SET_BASE", points: 0.5 },
});

const FULL_FROM_START = createTemplate("fullFromStart", {
  conditions: [
    { type: "RESPAWN_JOIN", toleranceSeconds: 300 },
    windowShare(90),
  ],
  action: { type: "SET_BASE", points: 1 },
});

const SMALL_GROUP_BASE = createTemplate("smallGroupBase", {
  conditions: [
    windowShare(50),
    ownTimeInGroup({ comparison: "AT_MOST", value: 4, to: 4 }),
  ],
  action: { type: "SET_BASE", points: 2 },
});

const SOLO_BASE = createTemplate("soloBase", {
  conditions: [
    windowShare(50),
    ownTimeInGroup({ comparison: "EXACT", value: 1, to: 1 }),
  ],
  action: { type: "SET_BASE", points: 3 },
});

export const SCORING_RULE_TEMPLATES: ScoringRuleTemplate[] = [
  FULL_FROM_START,
  SOLO_BASE,
  SMALL_GROUP_BASE,
  createPresetTemplate("baseThreshold", "base-75"),
  createPresetTemplate("smallGroupBonus", "bonus-small-group"),
  createPresetTemplate("nightBonus", "bonus-night"),
  createPresetTemplate("killTimeBonus", "bonus-pvp"),
  createPresetTemplate("leaveGrace", "leave-grace"),
];

/**
 * The solo / small group / regular base rulebook. The last matching base rule
 * wins, so the rules go from the lowest base to the highest: a solo member
 * also matches the small group, and solo must come after it to keep 3 pkt.
 * Bonuses already on the list are kept after the base rules, and the cap is
 * raised so the highest base with every bonus is not cut.
 */
export const applyGroupRulebook = (
  scoringRules: EventScoringRules,
): EventScoringRules => {
  const baseRules = [
    HALF_BASE,
    FULL_FROM_START,
    SMALL_GROUP_BASE,
    SOLO_BASE,
  ].map((template) => template.createRule());

  const bonusRules = scoringRules.rules.filter(
    (rule) => rule.action.type === "ADD_BONUS",
  );

  const highestTotal = bonusRules.reduce(
    (total, rule) =>
      rule.action.type === "ADD_BONUS" ? total + rule.action.points : total,
    3,
  );

  return {
    ...scoringRules,
    hardCapPoints: Math.max(scoringRules.hardCapPoints, highestTotal),
    rules: [...baseRules, ...bonusRules],
  };
};
