import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNavigate, useParams } from "@tanstack/react-router";
import { getApiErrorMessage } from "@/features/guild/events/utils/get-api-error-message";
import { CreateNotificationRuleDtoScheduleAnchor as NotificationScheduleAnchor } from "@lootlog/client/main";
import { CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType } from "@lootlog/client/main";
import { CreateNotificationRuleDtoScheduleStrategy as NotificationScheduleStrategy } from "@lootlog/client/main";
import { CreateNotificationRuleDtoTriggerType as NotificationTriggerType } from "@lootlog/client/main";
import type { CreateNotificationRuleDtoTriggerType } from "@lootlog/client/main";
import type { NotificationTargetResponseDto } from "@lootlog/client/main";
import type { NotificationRuleResponseDto } from "@lootlog/client/main";
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
  getNotificationsGuildControllerGetGuildRulesQueryKey,
  getNotificationsGuildControllerGetGuildTargetsQueryKey,
  useNotificationsGuildControllerCreateGuildRule,
  useNotificationsGuildControllerGetGuildRules,
  useNotificationsGuildControllerGetGuildTargets,
  useNotificationsGuildControllerUpdateGuildRule,
} from "@lootlog/client/main";
import { invalidateGuildNotificationQueries } from "../notifications-api";
import { useRolesControllerGetGuildRoles } from "@lootlog/client/main";
import { useGuildsControllerGetWorldsByGuildId } from "@lootlog/client/main";
import {
  getNpcsControllerGetNpcsQueryKey,
  useNpcsControllerGetNpcs,
} from "@lootlog/client/search";

const getDefaultContentTemplate = (
  triggerType: CreateNotificationRuleDtoTriggerType,
) =>
  triggerType === NotificationTriggerType.SCHEDULED_MESSAGE
    ? getDefaultScheduledMessageContentTemplate()
    : getDefaultGuildNotificationRuleContentTemplate();

const getEmptyRuleFormValues = (): RuleFormValues => ({
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
});

const stringifyNullable = (value: number | null | undefined, fallback = "") =>
  value === null || value === undefined ? fallback : String(value);

const formatRuleDate = (value: string | null, timezone: string | null) =>
  value
    ? formatDateTimeLocalInputValue(
        value,
        timezone ?? GUILD_NOTIFICATION_TIMEZONE,
      )
    : "";

const getRuleFormDefaultValues = (
  rule: NotificationRuleResponseDto | undefined,
): RuleFormValues => {
  if (!rule) {
    return getEmptyRuleFormValues();
  }

  const triggerType =
    rule.triggerType ?? NotificationTriggerType.TIMER_BEFORE_SPAWN;
  const npcIds = getGuildNotificationRuleNpcIds(rule);

  return {
    name: rule.name ?? "",
    triggerType,
    world: rule.world ?? ALL_WORLDS_VALUE,
    npcIds,
    manualNpcEntry: false,
    manualNpcIds: npcIds.join("\n"),
    contentTemplate:
      rule.contentTemplate ?? getDefaultContentTemplate(triggerType),
    scheduleAnchor: rule.scheduleAnchor ?? NotificationScheduleAnchor.MIN_SPAWN,
    scheduleOffsetMinutes: stringifyNullable(rule.scheduleOffsetMinutes, "0"),
    scheduledAt: formatRuleDate(rule.scheduledAt, rule.scheduleTimezone),
    scheduleIntervalType:
      rule.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE,
    scheduleIntervalValue: stringifyNullable(rule.scheduleIntervalValue),
    scheduleTimeOfDay: rule.scheduleTimeOfDay ?? "",
    scheduleWeekday: stringifyNullable(rule.scheduleWeekday),
    scheduledUntil: formatRuleDate(rule.scheduledUntil, rule.scheduleTimezone),
    targetIds: getGuildNotificationRuleTargetIds(rule),
    enabled: rule.enabled ?? true,
  };
};

const getNotificationFieldVisibility = (
  triggerType: CreateNotificationRuleDtoTriggerType,
  intervalType: NotificationScheduleIntervalType | undefined,
) => {
  const isScheduledMessage =
    triggerType === NotificationTriggerType.SCHEDULED_MESSAGE;
  const isRecurring =
    isScheduledMessage &&
    intervalType !== undefined &&
    intervalType !== NotificationScheduleIntervalType.ONCE;

  return {
    isScheduledMessage,
    isRecurring,
    showScheduledAtField:
      isScheduledMessage &&
      (intervalType === NotificationScheduleIntervalType.ONCE ||
        intervalType === NotificationScheduleIntervalType.HOURLY),
    showTimeOfDayField:
      isScheduledMessage &&
      (intervalType === NotificationScheduleIntervalType.DAILY ||
        intervalType === NotificationScheduleIntervalType.WEEKLY),
    showWeekdayField:
      isScheduledMessage &&
      intervalType === NotificationScheduleIntervalType.WEEKLY,
    showIntervalValueField:
      isScheduledMessage &&
      intervalType === NotificationScheduleIntervalType.HOURLY,
  };
};

const getWorldOptions = (
  worlds: string[],
  ruleWorld: string | null | undefined,
) => {
  const options = [...worlds];
  if (ruleWorld && !options.includes(ruleWorld)) {
    options.unshift(ruleWorld);
  }
  return options;
};

const getNpcOptions = (
  npcs: Array<{ id: number; name: string; type: string }>,
  t: (key: string) => string,
) => {
  const options = new Map<string, { value: string; label: string }>();
  for (const npc of npcs) {
    options.set(String(npc.id), {
      value: String(npc.id),
      label: `${npc.name} ${t(`npcType.${npc.type}`)} (#${npc.id})`,
    });
  }
  return Array.from(options.values());
};

const useNotificationRuleData = (
  guildId: string | undefined,
  ruleId: string | undefined,
) => {
  const queryGuildId = guildId ?? "";
  const targetsQuery = useNotificationsGuildControllerGetGuildTargets(
    { guildId: queryGuildId },
    {
      query: {
        queryKey: getNotificationsGuildControllerGetGuildTargetsQueryKey({
          guildId: queryGuildId,
        }),
      },
    },
  );
  const rulesQuery = useNotificationsGuildControllerGetGuildRules(
    { guildId: queryGuildId },
    {
      query: {
        queryKey: getNotificationsGuildControllerGetGuildRulesQueryKey({
          guildId: queryGuildId,
        }),
      },
    },
  );
  const { data: worlds = [] } = useGuildsControllerGetWorldsByGuildId({
    guildId: queryGuildId,
  });
  const { data: guildRoles = [] } = useRolesControllerGetGuildRoles({
    guildId: queryGuildId,
  });
  const rule = ruleId
    ? rulesQuery.data?.items.find((item) => String(item.id) === ruleId)
    : undefined;

  return {
    targetsQuery,
    rulesQuery,
    worlds,
    guildRoles,
    rule,
    maxNpcCount: rulesQuery.data?.limits?.maxNpcsPerRule ?? 5,
  };
};

export const useNotificationRuleForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false });
  const ruleId = (params as { ruleId?: string }).ruleId;
  const isCreateMode = ruleId === undefined;
  const { targetsQuery, rulesQuery, worlds, guildRoles, rule, maxNpcCount } =
    useNotificationRuleData(guildId, ruleId);
  const targets = targetsQuery.data ?? [];

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
  const [npcSearch, setNpcSearch] = useState("");
  const [extraTargets, setExtraTargets] = useState<
    NotificationTargetResponseDto[]
  >([]);
  const [formResetKey, setFormResetKey] = useState(0);
  const [isCreateTargetDialogOpen, setIsCreateTargetDialogOpen] =
    useState(false);

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema(t, maxNpcCount)),
    defaultValues: getEmptyRuleFormValues(),
  });

  useEffect(() => {
    form.reset(getRuleFormDefaultValues(rule));
    setNpcSearch("");
    setExtraTargets([]);
    setFormResetKey((prev) => prev + 1);
  }, [form, rule, t]);

  const mergedTargets = mergeGuildNotificationTargets(targets, extraTargets);
  const contentTemplate = form.watch("contentTemplate");
  const watchedTriggerType = form.watch("triggerType");
  const watchedIntervalType = form.watch("scheduleIntervalType");
  const {
    isScheduledMessage,
    isRecurring,
    showScheduledAtField,
    showTimeOfDayField,
    showWeekdayField,
    showIntervalValueField,
  } = getNotificationFieldVisibility(watchedTriggerType, watchedIntervalType);
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

  const npcOptions = getNpcOptions(
    [...(selectedNpcQuery.data ?? []), ...(searchedNpcQuery.data ?? [])],
    t,
  );
  const targetOptions = mergedTargets.map((target) => ({
    value: String(target.id),
    label: getGuildNotificationTargetLabel(target),
  }));

  const worldOptions = getWorldOptions(worlds, rule?.world);

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
