import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNavigate, useParams } from "@tanstack/react-router";
import { getApiErrorMessage } from "@/features/guild/events/utils/get-api-error-message";
import {
  CreateNotificationRuleDtoScheduleAnchor as NotificationScheduleAnchor,
  CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType,
  CreateNotificationRuleDtoScheduleStrategy as NotificationScheduleStrategy,
  CreateNotificationRuleDtoTriggerType as NotificationTriggerType,
  type CreateNotificationRuleDtoTriggerType,
  type NotificationTargetResponseDto,
} from "@/lib/api/generated/main/model";
import { useQueryClient } from "@tanstack/react-query";
import {
  getDefaultGuildNotificationRuleContentTemplate,
  getDefaultScheduledMessageContentTemplate,
  getGuildNotificationRuleNpcIds,
  getGuildNotificationRuleTargetIds,
  getGuildNotificationTargetLabel,
  mergeGuildNotificationTargets,
} from "../utils/notification-settings.utils";
import {
  formatDateTimeLocalInputValue,
  GUILD_NOTIFICATION_TIMEZONE,
  parseDateTimeLocalInputToIsoString,
} from "../utils/notification-schedule-time.utils";
import {
  ruleFormSchema,
  ALL_WORLDS_VALUE,
  type RuleFormValues,
} from "../utils/notification-rule-form.schema";
import {
  buildNotificationRuleNpcFilterPayload,
  getNotificationRuleNpcIdsForSubmit,
} from "../utils/notification-rule-form-npc.utils";
import { ROUTES } from "@/config/routes";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  guildNotificationRulesQueryKey,
  guildNotificationTargetsQueryKey,
  invalidateGuildNotificationQueries,
} from "../notifications-api";
import {
  useNotificationsGuildControllerCreateGuildRule,
  useNotificationsGuildControllerGetGuildRules,
  useNotificationsGuildControllerGetGuildTargets,
  useNotificationsGuildControllerUpdateGuildRule,
} from "@/lib/api/generated/main/notifications/notifications";
import { useRolesControllerGetGuildRoles } from "@/lib/api/generated/main/roles/roles";
import { useGuildsControllerGetWorldsByGuildId } from "@/lib/api/generated/main/guilds/guilds";
import {
  getNpcsControllerGetNpcsQueryKey,
  useNpcsControllerGetNpcs,
} from "@/lib/api/generated/search/npcs/npcs";

export const useNotificationRuleForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false });
  const ruleId = (params as { ruleId?: string }).ruleId;
  const isCreateMode = ruleId === undefined;

  const targetsQuery = useNotificationsGuildControllerGetGuildTargets(
    { guildId: guildId ?? "" },
    {
      query: {
        queryKey: guildNotificationTargetsQueryKey(guildId ?? ""),
      },
    },
  );
  const rulesQuery = useNotificationsGuildControllerGetGuildRules(
    { guildId: guildId ?? "" },
    {
      query: {
        queryKey: guildNotificationRulesQueryKey(guildId ?? ""),
      },
    },
  );
  const targets = targetsQuery.data ?? [];
  const maxNpcCount = rulesQuery.data?.limits?.maxNpcsPerRule ?? 5;
  const rule = isCreateMode
    ? undefined
    : rulesQuery.data?.items.find((r) => String(r.id) === ruleId);

  const createRule = useNotificationsGuildControllerCreateGuildRule({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateGuildNotificationQueries(queryClient, guildId);
      },
    },
  });
  const updateRule = useNotificationsGuildControllerUpdateGuildRule({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateGuildNotificationQueries(queryClient, guildId);
      },
    },
  });
  const { data: worlds = [] } = useGuildsControllerGetWorldsByGuildId({
    guildId: guildId ?? "",
  });
  const { data: guildRoles = [] } = useRolesControllerGetGuildRoles({
    guildId: guildId ?? "",
  });
  const [npcSearch, setNpcSearch] = useState("");
  const [extraTargets, setExtraTargets] = useState<
    NotificationTargetResponseDto[]
  >([]);
  const [formResetKey, setFormResetKey] = useState(0);
  const [isCreateTargetDialogOpen, setIsCreateTargetDialogOpen] =
    useState(false);

  const getDefaultContentTemplate = (
    triggerType: CreateNotificationRuleDtoTriggerType,
  ) =>
    triggerType === NotificationTriggerType.SCHEDULED_MESSAGE
      ? getDefaultScheduledMessageContentTemplate()
      : getDefaultGuildNotificationRuleContentTemplate();

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema(t, maxNpcCount)),
    defaultValues: {
      name: "",
      triggerType: NotificationTriggerType.TIMER_BEFORE_SPAWN,
      world: ALL_WORLDS_VALUE,
      npcIds: [],
      manualNpcEntry: false,
      manualNpcIds: "",
      contentTemplate: getDefaultGuildNotificationRuleContentTemplate(),
      scheduleAnchor: NotificationScheduleAnchor.MIN_SPAWN,
      scheduleOffsetMinutes: "0",
      scheduledAt: "",
      scheduleIntervalType: NotificationScheduleIntervalType.ONCE,
      scheduleIntervalValue: "",
      scheduleTimeOfDay: "",
      scheduleWeekday: "",
      scheduledUntil: "",
      targetIds: [],
      enabled: true,
    },
  });

  useEffect(() => {
    const triggerType =
      rule?.triggerType ?? NotificationTriggerType.TIMER_BEFORE_SPAWN;

    form.reset({
      name: rule?.name ?? "",
      triggerType,
      world: rule?.world ?? ALL_WORLDS_VALUE,
      npcIds: rule ? getGuildNotificationRuleNpcIds(rule) : [],
      manualNpcEntry: false,
      manualNpcIds: rule ? getGuildNotificationRuleNpcIds(rule).join("\n") : "",
      contentTemplate:
        rule?.contentTemplate ?? getDefaultContentTemplate(triggerType),
      scheduleAnchor:
        rule?.scheduleAnchor ?? NotificationScheduleAnchor.MIN_SPAWN,
      scheduleOffsetMinutes:
        rule?.scheduleOffsetMinutes !== null &&
        rule?.scheduleOffsetMinutes !== undefined
          ? String(rule.scheduleOffsetMinutes)
          : "0",
      scheduledAt: rule?.scheduledAt
        ? formatDateTimeLocalInputValue(
            rule.scheduledAt,
            rule.scheduleTimezone ?? GUILD_NOTIFICATION_TIMEZONE,
          )
        : "",
      scheduleIntervalType:
        rule?.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE,
      scheduleIntervalValue:
        rule?.scheduleIntervalValue !== null &&
        rule?.scheduleIntervalValue !== undefined
          ? String(rule.scheduleIntervalValue)
          : "",
      scheduleTimeOfDay: rule?.scheduleTimeOfDay ?? "",
      scheduleWeekday:
        rule?.scheduleWeekday !== null && rule?.scheduleWeekday !== undefined
          ? String(rule.scheduleWeekday)
          : "",
      scheduledUntil: rule?.scheduledUntil
        ? formatDateTimeLocalInputValue(
            rule.scheduledUntil,
            rule.scheduleTimezone ?? GUILD_NOTIFICATION_TIMEZONE,
          )
        : "",
      targetIds: rule ? getGuildNotificationRuleTargetIds(rule) : [],
      enabled: rule?.enabled ?? true,
    });
    setNpcSearch("");
    setExtraTargets([]);
    setFormResetKey((prev) => prev + 1);
  }, [form, rule, t]);

  const mergedTargets = mergeGuildNotificationTargets(targets, extraTargets);
  const contentTemplate = form.watch("contentTemplate");
  const watchedTriggerType = form.watch("triggerType");
  const isScheduledMessage =
    watchedTriggerType === NotificationTriggerType.SCHEDULED_MESSAGE;
  const watchedIntervalType = form.watch("scheduleIntervalType");
  const isRecurring =
    isScheduledMessage &&
    watchedIntervalType !== undefined &&
    watchedIntervalType !== NotificationScheduleIntervalType.ONCE;
  const showScheduledAtField =
    isScheduledMessage &&
    (watchedIntervalType === NotificationScheduleIntervalType.ONCE ||
      watchedIntervalType === NotificationScheduleIntervalType.HOURLY);
  const showTimeOfDayField =
    isScheduledMessage &&
    (watchedIntervalType === NotificationScheduleIntervalType.DAILY ||
      watchedIntervalType === NotificationScheduleIntervalType.WEEKLY);
  const showWeekdayField =
    isScheduledMessage &&
    watchedIntervalType === NotificationScheduleIntervalType.WEEKLY;
  const showIntervalValueField =
    isScheduledMessage &&
    watchedIntervalType === NotificationScheduleIntervalType.HOURLY;
  const selectedWorld = form.watch("world");
  const isManualNpcEntry = form.watch("manualNpcEntry") ?? false;
  const selectedNpcIds = form.watch("npcIds") ?? [];
  const normalizedWorld =
    selectedWorld !== ALL_WORLDS_VALUE ? selectedWorld : undefined;
  const selectedNpcSearchParams = {
    ids: selectedNpcIds.map((npcId) => Number(npcId)),
    world: normalizedWorld,
  };
  const selectedNpcQuery = useNpcsControllerGetNpcs(selectedNpcSearchParams, {
    query: {
      queryKey: getNpcsControllerGetNpcsQueryKey(selectedNpcSearchParams),
      enabled: !isManualNpcEntry && selectedNpcIds.length > 0,
    },
  });
  const searchedNpcSearchParams = {
    search: npcSearch,
    world: normalizedWorld,
  };
  const searchedNpcQuery = useNpcsControllerGetNpcs(searchedNpcSearchParams, {
    query: {
      queryKey: getNpcsControllerGetNpcsQueryKey(searchedNpcSearchParams),
      enabled: !isManualNpcEntry && npcSearch.trim().length > 0,
    },
  });

  const npcOptionsMap = new Map<string, { value: string; label: string }>();

  for (const npc of [
    ...(selectedNpcQuery.data ?? []),
    ...(searchedNpcQuery.data ?? []),
  ]) {
    npcOptionsMap.set(String(npc.id), {
      value: String(npc.id),
      label: `${npc.name} ${t(`npcType.${npc.type}`)} (#${npc.id})`,
    });
  }

  const npcOptions = Array.from(npcOptionsMap.values());
  const targetOptions = mergedTargets.map((target) => ({
    value: String(target.id),
    label: getGuildNotificationTargetLabel(target),
  }));

  const worldOptions = [...worlds];

  if (rule?.world && !worldOptions.includes(rule.world)) {
    worldOptions.unshift(rule.world);
  }

  const isSubmitting = createRule.isPending || updateRule.isPending;
  const isLoading = targetsQuery.isLoading || rulesQuery.isLoading;
  const isError = targetsQuery.isError || rulesQuery.isError;

  const navigateBack = () => {
    if (guildId) {
      navigate({ to: ROUTES.guild.notifications.base(guildId) });
    }
  };

  const handleTargetCreated = (
    createdTarget: NotificationTargetResponseDto,
  ) => {
    setExtraTargets((currentTargets) => [...currentTargets, createdTarget]);
    form.setValue(
      "targetIds",
      Array.from(
        new Set([...form.getValues("targetIds"), String(createdTarget.id)]),
      ),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
    setIsCreateTargetDialogOpen(false);
  };

  const handleManualNpcEntryChange = (enabled: boolean) => {
    form.setValue("manualNpcEntry", enabled, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (!enabled) {
      return;
    }

    setNpcSearch("");

    const currentManualNpcIds = (form.getValues("manualNpcIds") ?? "").trim();

    if (currentManualNpcIds.length > 0) {
      return;
    }

    const currentSelectedNpcIds = form.getValues("npcIds") ?? [];

    if (currentSelectedNpcIds.length === 0) {
      return;
    }

    form.setValue("manualNpcIds", currentSelectedNpcIds.join("\n"), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleSubmit = async (values: RuleFormValues) => {
    const trimmedName = values.name.trim();
    const basePayload = {
      name: trimmedName.length > 0 ? trimmedName : null,
      contentTemplate: values.contentTemplate.trim(),
      triggerType: values.triggerType,
      targetIds: values.targetIds.map((targetId) => Number(targetId)),
      enabled: values.enabled,
    };

    const payload =
      values.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE
        ? {
            ...basePayload,
            scheduledAt: parseDateTimeLocalInputToIsoString(
              values.scheduledAt,
              GUILD_NOTIFICATION_TIMEZONE,
            ),
            scheduleIntervalType:
              values.scheduleIntervalType ??
              NotificationScheduleIntervalType.ONCE,
            scheduleIntervalValue: values.scheduleIntervalValue
              ? Number(values.scheduleIntervalValue)
              : undefined,
            scheduleTimeOfDay: values.scheduleTimeOfDay || undefined,
            scheduleWeekday:
              values.scheduleWeekday !== ""
                ? Number(values.scheduleWeekday)
                : undefined,
            scheduledUntil: parseDateTimeLocalInputToIsoString(
              values.scheduledUntil,
              GUILD_NOTIFICATION_TIMEZONE,
            ),
            scheduleTimezone: GUILD_NOTIFICATION_TIMEZONE,
          }
        : (() => {
            const npcFilterPayload = buildNotificationRuleNpcFilterPayload(
              getNotificationRuleNpcIdsForSubmit(values),
            );
            return {
              ...basePayload,
              world:
                values.world !== ALL_WORLDS_VALUE
                  ? (values.world ?? undefined)
                  : undefined,
              scheduleStrategy:
                NotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE,
              scheduleAnchor:
                values.scheduleAnchor ?? NotificationScheduleAnchor.MIN_SPAWN,
              scheduleOffsetMinutes: Number(values.scheduleOffsetMinutes),
              ...npcFilterPayload,
            };
          })();

    try {
      if (isCreateMode) {
        if (!guildId) {
          throw new Error("Missing guild id.");
        }

        await createRule.mutateAsync({
          pathParams: { guildId },
          data: payload,
        });
        toast.success(t("settings.notifications.toasts.ruleCreated"));
      } else if (rule) {
        if (!guildId) {
          throw new Error("Missing guild id.");
        }

        await updateRule.mutateAsync({
          pathParams: { guildId, ruleId: rule.id },
          data: payload,
        });
        toast.success(t("settings.notifications.toasts.ruleUpdated"));
      }

      navigateBack();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t(
            isCreateMode
              ? "settings.notifications.toasts.ruleCreateError"
              : "settings.notifications.toasts.ruleUpdateError",
          ),
      );
    }
  };

  return {
    t,
    form,
    rule,
    isCreateMode,
    isLoading,
    isError,
    isSubmitting,
    isScheduledMessage,
    isRecurring,
    showScheduledAtField,
    showTimeOfDayField,
    showWeekdayField,
    showIntervalValueField,
    maxNpcCount,
    npcSearch,
    setNpcSearch,
    npcOptions,
    searchedNpcQuery,
    targetOptions,
    worldOptions,
    mergedTargets,
    guildRoles,
    contentTemplate,
    watchedTriggerType,
    isManualNpcEntry,
    formResetKey,
    isCreateTargetDialogOpen,
    setIsCreateTargetDialogOpen,
    getDefaultContentTemplate,
    navigateBack,
    handleTargetCreated,
    handleManualNpcEntryChange,
    handleSubmit,
  };
};
