import { toggleAvailableGuild } from "@/features/settings/components/shared/settings-guild-picker";
import { readCurrentSettingsDocuments } from "@/features/settings/persistence/settings-patch-client";
import {
  getGameAccountPreferences,
  useUpdateGameAccountPreferences,
} from "@/features/settings/persistence/use-game-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { getEffectiveDetectorSettings } from "@/lib/game-account-preferences";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import type { DetectorRoutingRule } from "@lootlog/schema/account-preferences";

export const LEVEL_MIN = 0;

export const LEVEL_MAX = 500;

export const clampLevel = (value: number) => {
  return Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, value));
};

const createRoutingRuleId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `detector-rule-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createEmptyRoutingRule = (): DetectorRoutingRule => ({
  id: createRoutingRuleId(),
  minLevel: LEVEL_MIN,
  maxLevel: LEVEL_MAX,
  guildIds: [],
});

export const normalizeRoutingRuleText = (name?: string) => {
  if (name === undefined) {
    return undefined;
  }

  const trimmedName = name.trim();

  return trimmedName.length > 0 ? trimmedName : undefined;
};

const normalizeRoutingRules = (
  routingRules: DetectorRoutingRule[],
  availableGuildIds: string[],
) => {
  return routingRules.map((rule) => {
    const name = normalizeRoutingRuleText(rule.name);
    const normalizedMinLevel = clampLevel(Math.trunc(rule.minLevel));
    const normalizedMaxLevel = clampLevel(Math.trunc(rule.maxLevel));
    const minLevel = Math.min(normalizedMinLevel, normalizedMaxLevel);
    const maxLevel = Math.max(normalizedMinLevel, normalizedMaxLevel);
    const world = normalizeRoutingRuleText(rule.world);

    const normalizedGuildIds = availableGuildIds.filter(
      (guildId, index, ids) => {
        return (
          rule.guildIds.includes(guildId) && ids.indexOf(guildId) === index
        );
      },
    );

    return {
      ...rule,
      name,
      minLevel,
      maxLevel,
      world,
      guildIds: normalizedGuildIds,
    };
  });
};

const areRoutingRulesEqual = (
  left: DetectorRoutingRule[],
  right: DetectorRoutingRule[],
) => {
  return (
    left.length === right.length &&
    left.every((rule, index) => {
      const comparedRule = right[index];

      return (
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
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
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
    if (!accountId || !guilds) {
      return;
    }

    const currentRoutingRules = readRoutingRules();

    const nextRoutingRules = normalizeRoutingRules(
      produce(currentRoutingRules),
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
        guildIds: toggleAvailableGuild(guilds ?? [], rule.guildIds, guildId),
      })),
    setLevelRange: (ruleId: string, [minLevel, maxLevel]: [number, number]) =>
      updateRule(ruleId, (rule) => ({ ...rule, minLevel, maxLevel })),
    setWorld: (ruleId: string, world: string) =>
      updateRule(ruleId, (rule) => ({ ...rule, world })),
    setName: (ruleId: string, name: string) =>
      updateRule(ruleId, (rule) => ({ ...rule, name })),
  };
}
