import { intersection } from "es-toolkit";
import {
  DETECTOR_LEVEL_MAX,
  DETECTOR_LEVEL_MIN,
  normalizeRoutingRules,
} from "@lootlog/domain/account-preferences";
import { toggleAvailableGuild } from "@/lib/selected-lootlog-guild";
import { readCurrentSettingsDocuments } from "@/features/settings/persistence/settings-patch-client";
import {
  getGameAccountPreferences,
  useUpdateGameAccountPreferences,
} from "@/features/settings/persistence/use-game-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { getEffectiveDetectorSettings } from "@/lib/game-account-preferences";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import type { DetectorRoutingRule } from "@lootlog/schema/account-preferences";

const createRoutingRuleId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `detector-rule-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createEmptyRoutingRule = (): DetectorRoutingRule => ({
  id: createRoutingRuleId(),
  minLevel: DETECTOR_LEVEL_MIN,
  maxLevel: DETECTOR_LEVEL_MAX,
  guildIds: [],
});

export const normalizeRoutingRuleText = (name?: string) => {
  if (name === undefined) {
    return undefined;
  }

  const trimmedName = name.trim();

  return trimmedName.length > 0 ? trimmedName : undefined;
};

/** Keeps only the accessible guilds a rule routes to, in the player's guild order. */
const restrictToAvailableGuilds = (
  routingRules: DetectorRoutingRule[],
  availableGuildIds: string[],
) =>
  routingRules.map((rule) => ({
    ...rule,
    guildIds: intersection(availableGuildIds, rule.guildIds),
  }));

const areRoutingRulesEqual = (
  left: DetectorRoutingRule[],
  right: DetectorRoutingRule[],
) => {
  return (
    left.length === right.length &&
    left.every((rule, index) => {
      const comparedRule = right[index];

      return (
        comparedRule !== undefined &&
        rule.id === comparedRule.id &&
        normalizeRoutingRuleText(rule.name) ===
          normalizeRoutingRuleText(comparedRule.name) &&
        rule.minLevel === comparedRule.minLevel &&
        rule.maxLevel === comparedRule.maxLevel &&
        normalizeRoutingRuleText(rule.world) ===
          normalizeRoutingRuleText(comparedRule.world) &&
        rule.guildIds.length === comparedRule.guildIds.length &&
        rule.guildIds.every((guildId, guildIndex) => {
          return guildId === comparedRule.guildIds[guildIndex];
        })
      );
    })
  );
};

/**
 * Delivery rules for the detector. Every edit is written straight through the
 * shared settings patch queue, which updates the cache optimistically and
 * re-applies pending patches when a server response lands. The rule list is
 * read from the cache at the moment of the edit, not from the render that
 * produced the click: a re-render lags the cache by a tick, so the previous
 * click of a rapid series would otherwise be dropped from the saved list.
 */
export function useDetectorRoutingForm() {
  const { accountId, settings } = useCurrentGameAccountDetectorSettings();

  const {
    guildsQuery: { data: accessibleGuilds },
    orderedGuilds: guilds,
  } = useLootlogGuilds();

  const { mutate } = useUpdateGameAccountPreferences();

  const readRoutingRules = () =>
    getEffectiveDetectorSettings(
      accountId
        ? getGameAccountPreferences(readCurrentSettingsDocuments(), accountId)
        : undefined,
    ).routingRules;

  const save = (
    produce: (current: DetectorRoutingRule[]) => DetectorRoutingRule[],
  ) => {
    if (!accountId || !accessibleGuilds) {
      return;
    }

    const currentRoutingRules = readRoutingRules();

    const nextRoutingRules = restrictToAvailableGuilds(
      normalizeRoutingRules(produce(currentRoutingRules)),
      guilds.map((guild) => guild.id),
    );

    if (areRoutingRulesEqual(nextRoutingRules, currentRoutingRules)) {
      return;
    }

    mutate({ detector: { routingRules: nextRoutingRules } });
  };

  const updateRule = (
    ruleId: string,
    produce: (rule: DetectorRoutingRule) => DetectorRoutingRule,
  ) =>
    save((current) =>
      current.map((rule) => (rule.id === ruleId ? produce(rule) : rule)),
    );

  return {
    guilds,
    routingRules: settings.routingRules,
    addRoutingRule: () =>
      save((current) => [...current, createEmptyRoutingRule()]),
    removeRule: (ruleId: string) =>
      save((current) => current.filter((rule) => rule.id !== ruleId)),
    toggleGuild: (ruleId: string, guildId: string) =>
      updateRule(ruleId, (rule) => ({
        ...rule,
        guildIds: toggleAvailableGuild(guilds, rule.guildIds, guildId),
      })),
    setLevelRange: (ruleId: string, [minLevel, maxLevel]: [number, number]) =>
      updateRule(ruleId, (rule) => ({ ...rule, minLevel, maxLevel })),
    setWorld: (ruleId: string, world: string) =>
      updateRule(ruleId, (rule) => ({ ...rule, world })),
    setName: (ruleId: string, name: string) =>
      updateRule(ruleId, (rule) => ({ ...rule, name })),
  };
}
