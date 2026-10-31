import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType,
  CreateNotificationRuleDtoTriggerType as NotificationTriggerType,
  useNotificationsGuildControllerDeleteGuildRule,
  useNotificationsGuildControllerRebuildGuildRuleJobs,
  useNotificationsGuildControllerTriggerGuildRuleTest,
  type GuildNotificationRulesResponseDto,
} from "@lootlog/client/main";
import { getApiErrorMessage } from "@lootlog/client/transport";
import { useQueryClient } from "@tanstack/react-query";
import { upperFirst } from "es-toolkit";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  getGuildNotificationMutationCallbacks,
  invalidateGuildNotificationQueries,
  prepareGuildNotificationMutation,
  removeGuildNotificationRuleFromCache,
  type GuildNotificationCacheSnapshot,
} from "../notifications-api";
import { formatNotificationDateInTimeZone } from "../utils/notification-schedule-time.utils";
import {
  getGuildNotificationRuleNpcCount,
  getGuildNotificationRuleScheduleTranslationKey,
  getGuildNotificationTargetLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";

type NotificationRuleTileProps = {
  rule: GuildNotificationRulesResponseDto["items"][number];
  actionsDisabled: boolean;
};

type NotificationRule = NotificationRuleTileProps["rule"];

type Translator = ReturnType<typeof useTranslation>["t"];

const getRecurringScheduleLabel = (rule: NotificationRule, t: Translator) => {
  if (rule.triggerType !== NotificationTriggerType.SCHEDULED_MESSAGE) {
    return undefined;
  }

  if (
    !rule.scheduleIntervalType ||
    rule.scheduleIntervalType === NotificationScheduleIntervalType.ONCE
  ) {
    return undefined;
  }

  if (rule.scheduleIntervalType === NotificationScheduleIntervalType.HOURLY) {
    return t("settings.notifications.intervalTypes.hourly").replace(
      "X",
      String(rule.scheduleIntervalValue ?? 1),
    );
  }

  if (rule.scheduleIntervalType === NotificationScheduleIntervalType.DAILY) {
    return `${t("settings.notifications.intervalTypes.daily")} ${rule.scheduleTimeOfDay ?? ""}`;
  }

  if (rule.scheduleIntervalType === NotificationScheduleIntervalType.WEEKLY) {
    return `${t(`settings.notifications.weekdays.${rule.scheduleWeekday ?? 0}`)} ${rule.scheduleTimeOfDay ?? ""}`;
  }

  return "";
};

const getNpcLabel = (rule: NotificationRule, t: Translator) => {
  if (rule.triggerType !== NotificationTriggerType.TIMER_BEFORE_SPAWN) {
    return undefined;
  }

  const npcCount = getGuildNotificationRuleNpcCount(rule);

  return npcCount > 0
    ? t("settings.notifications.npcCount", { count: npcCount })
    : t("settings.notifications.allNpcs");
};

/** When and where the rule sends, as the parts of one sentence. */
const getRuleSummary = (
  rule: NotificationRule,
  t: Translator,
  labels: {
    recurringScheduleLabel: string | undefined;
    scheduledAtLabel: string | undefined;
    timerScheduleLabel: string | undefined;
    npcLabel: string | undefined;
  },
) => {
  if (rule.triggerType === NotificationTriggerType.FACTION_WAR) {
    return [t("settings.notifications.factionWarSummary")];
  }

  const world = rule.world
    ? upperFirst(rule.world)
    : t("settings.notifications.allWorlds");

  if (rule.triggerType !== NotificationTriggerType.SCHEDULED_MESSAGE) {
    return [labels.timerScheduleLabel, world, labels.npcLabel].filter(
      (part) => part !== undefined,
    );
  }

  if (labels.recurringScheduleLabel) {
    return rule.scheduleIntervalType === NotificationScheduleIntervalType.WEEKLY
      ? [
          t("settings.notifications.intervalTypes.weekly"),
          labels.recurringScheduleLabel,
        ]
      : [labels.recurringScheduleLabel];
  }

  return [
    t("settings.notifications.intervalTypes.once"),
    labels.scheduledAtLabel,
  ].filter((part) => part !== undefined);
};

const getNotificationRuleTileViewModel = (
  rule: NotificationRule,
  t: Translator,
) => {
  const triggerLabel = t(
    getNotificationTriggerTranslationKey(rule.triggerType),
  );

  const recurringScheduleLabel = getRecurringScheduleLabel(rule, t);

  const scheduledAtLabel =
    rule.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE &&
    rule.scheduledAt
      ? formatNotificationDateInTimeZone(
          rule.scheduledAt,
          rule.scheduleTimezone ?? "Europe/Warsaw",
        )
      : undefined;

  const timerScheduleLabel =
    rule.scheduleAnchor !== null && rule.scheduleOffsetMinutes !== null
      ? t(getGuildNotificationRuleScheduleTranslationKey(rule), {
          minutes: rule.scheduleOffsetMinutes,
        })
      : undefined;

  const npcLabel = getNpcLabel(rule, t);

  return {
    summary: getRuleSummary(rule, t, {
      recurringScheduleLabel,
      scheduledAtLabel,
      timerScheduleLabel,
      npcLabel,
    }),
    triggerLabel,
    displayName: rule.name ?? triggerLabel,
    enabledLabel: rule.enabled
      ? t("settings.notifications.states.enabled")
      : t("settings.notifications.states.disabled"),
    recurringScheduleLabel,
    scheduledAtLabel,
    timerScheduleLabel,
    npcLabel,
  };
};

export const useNotificationRuleActions = ({
  rule,
  actionsDisabled,
}: NotificationRuleTileProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const deleteRule = useNotificationsGuildControllerDeleteGuildRule<
    unknown,
    GuildNotificationCacheSnapshot | undefined
  >({
    mutation: {
      onMutate: async (variables) => {
        if (!guildId) {
          return undefined;
        }

        const previousNotifications = await prepareGuildNotificationMutation(
          queryClient,
          guildId,
        );

        removeGuildNotificationRuleFromCache(
          queryClient,
          guildId,
          variables.pathParams.ruleId,
        );

        return previousNotifications;
      },
      ...getGuildNotificationMutationCallbacks(queryClient, guildId),
    },
  });

  const rebuildRuleJobs = useNotificationsGuildControllerRebuildGuildRuleJobs({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateGuildNotificationQueries(queryClient, guildId);
      },
    },
  });

  const triggerRuleTest = useNotificationsGuildControllerTriggerGuildRuleTest({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateGuildNotificationQueries(queryClient, guildId);
      },
    },
  });

  const targetLabels = rule.targets.map(({ target }) => {
    const label = getGuildNotificationTargetLabel(target);

    if (!target.active) {
      return `${label} ${t("settings.notifications.targetInactive")}`;
    }

    return label;
  });

  const viewModel = getNotificationRuleTileViewModel(rule, t);

  const hasTestableTargets = rule.targets.some(
    ({ target }) => target.active && target.canSend,
  );

  const isActionDisabled =
    actionsDisabled ||
    deleteRule.isPending ||
    rebuildRuleJobs.isPending ||
    triggerRuleTest.isPending;

  const handleRebuildJobs = async () => {
    if (!guildId) {
      const error = new Error("Missing guild id.");
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.ruleJobsRebuildError"),
      );

      return;
    }

    try {
      await rebuildRuleJobs.mutateAsync({
        pathParams: { guildId, ruleId: rule.id },
      });
      toast.success(t("settings.notifications.toasts.ruleJobsRebuilt"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.ruleJobsRebuildError"),
      );
    }
  };

  const handleTriggerTest = async () => {
    if (!guildId) {
      const error = new Error("Missing guild id.");
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.ruleTestTriggerError"),
      );

      return;
    }

    try {
      await triggerRuleTest.mutateAsync({
        pathParams: { guildId, ruleId: rule.id },
      });
      toast.success(t("settings.notifications.toasts.ruleTestTriggered"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.ruleTestTriggerError"),
      );
    }
  };

  const handleDelete = async () => {
    if (!guildId) {
      const error = new Error("Missing guild id.");
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.ruleDeleteError"),
      );
      throw error;
    }

    try {
      await deleteRule.mutateAsync({
        pathParams: { guildId, ruleId: rule.id },
      });
      toast.success(t("settings.notifications.toasts.ruleDeleted"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.ruleDeleteError"),
      );
      throw error;
    }
  };

  return {
    viewModel,
    rule,
    t,
    targetLabels,
    isActionDisabled,
    hasTestableTargets,
    triggerRuleTest,
    handleTriggerTest,
    rebuildRuleJobs,
    handleRebuildJobs,
    guildId,
    handleDelete,
  };
};
