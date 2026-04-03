import type { BadgeProps } from "@lootlog/ui/components/badge";
import type {
  GuildNotificationRule,
  GuildNotificationTarget,
} from "@/hooks/api/guilds/use-guild-notifications";
import {
  NotificationScheduleAnchor,
  NotificationTriggerType,
} from "@lootlog/types";

export const getJobStatusBadgeProps = (
  status: string,
): { variant: BadgeProps["variant"]; className?: string } => {
  switch (status) {
    case "SENT":
      return {
        variant: "outline",
        className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
      };
    case "FAILED":
    case "CANCELED":
      return { variant: "destructive" };
    case "BLOCKED":
      return {
        variant: "outline",
        className: "bg-amber-500/15 text-amber-500 border-amber-500/20",
      };
    default:
      return { variant: "outline" };
  }
};

export const SUPPORTED_GUILD_NOTIFICATION_TRIGGER_TYPES = [
  NotificationTriggerType.TIMER_BEFORE_SPAWN,
  NotificationTriggerType.SCHEDULED_MESSAGE,
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
    case NotificationTriggerType.SCHEDULED_MESSAGE:
      return "settings.notifications.triggers.scheduledMessage";
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

export const getGuildNotificationRuleScheduleTranslationKey = (
  rule: Pick<GuildNotificationRule, "scheduleAnchor" | "scheduleOffsetMinutes">,
) => {
  if (
    rule.scheduleAnchor === NotificationScheduleAnchor.MAX_SPAWN &&
    rule.scheduleOffsetMinutes === 0
  ) {
    return "settings.notifications.schedule.maxSpawnExact";
  }

  if (rule.scheduleAnchor === NotificationScheduleAnchor.MAX_SPAWN) {
    return "settings.notifications.schedule.maxSpawnBefore";
  }

  if (rule.scheduleOffsetMinutes === 0) {
    return "settings.notifications.schedule.minSpawnExact";
  }

  return "settings.notifications.schedule.minSpawnBefore";
};

export const getDefaultGuildNotificationRuleContentTemplate = () =>
  "**{{npcName}}** respi od {{minSpawnTime}} do {{maxSpawnTime}}";

export const getDefaultScheduledMessageContentTemplate = () =>
  "## {{ruleName}}\n\n{{scheduledFor}}";
