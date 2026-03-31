import type {
  GuildNotificationRule,
  GuildNotificationTarget,
} from "@/hooks/api/guilds/use-guild-notifications";
import { NotificationTriggerType } from "@lootlog/types";

export const SUPPORTED_GUILD_NOTIFICATION_TRIGGER_TYPES = [
  NotificationTriggerType.TIMER_BEFORE_SPAWN,
] as const;

export const getNotificationTriggerTranslationKey = (
  triggerType: NotificationTriggerType,
) => {
  switch (triggerType) {
    case NotificationTriggerType.TIMER_BEFORE_SPAWN:
      return "settings.notifications.triggers.timerBeforeSpawn";
    case NotificationTriggerType.NPC_SPAWNED:
      return "settings.notifications.triggers.npcSpawned";
    case NotificationTriggerType.WATCHED_ITEM_DROPPED:
      return "settings.notifications.triggers.watchedItemDropped";
  }
};

export const isSupportedGuildNotificationTrigger = (
  triggerType: NotificationTriggerType,
) =>
  SUPPORTED_GUILD_NOTIFICATION_TRIGGER_TYPES.includes(
    triggerType as (typeof SUPPORTED_GUILD_NOTIFICATION_TRIGGER_TYPES)[number],
  );

export const getGuildNotificationTargetLabel = (
  target: Pick<GuildNotificationTarget, "displayName" | "externalId">,
) => target.displayName ?? target.externalId;

export const getGuildNotificationRuleTargetIds = (
  rule: Pick<GuildNotificationRule, "targets">,
) => rule.targets.map(({ target }) => String(target.id));

export const getGuildNotificationRuleNpcIds = (
  rule: Pick<GuildNotificationRule, "filters">,
) => {
  const npcIds = new Set<string>();
  const filters = rule.filters;

  if (!filters) {
    return [];
  }

  if (typeof filters.npcId === "number") {
    npcIds.add(String(filters.npcId));
  }

  if (Array.isArray(filters.npcIds)) {
    for (const npcId of filters.npcIds) {
      if (typeof npcId === "number") {
        npcIds.add(String(npcId));
      }
    }
  }

  return Array.from(npcIds);
};

export const getGuildNotificationRuleNpcCount = (
  rule: Pick<GuildNotificationRule, "filters">,
) => getGuildNotificationRuleNpcIds(rule).length;

export const getGuildNotificationTargetUsageCount = (
  targetId: number,
  rules: GuildNotificationRule[],
) =>
  rules.reduce((usageCount, rule) => {
    if (rule.targets.some(({ target }) => target.id === targetId)) {
      return usageCount + 1;
    }

    return usageCount;
  }, 0);

export const mergeGuildNotificationTargets = (
  baseTargets: GuildNotificationTarget[],
  extraTargets: GuildNotificationTarget[],
) => {
  const mergedTargets = new Map<number, GuildNotificationTarget>();

  for (const target of baseTargets) {
    mergedTargets.set(target.id, target);
  }

  for (const target of extraTargets) {
    mergedTargets.set(target.id, target);
  }

  return Array.from(mergedTargets.values()).sort((leftTarget, rightTarget) =>
    getGuildNotificationTargetLabel(leftTarget).localeCompare(
      getGuildNotificationTargetLabel(rightTarget),
      "pl",
    ),
  );
};
