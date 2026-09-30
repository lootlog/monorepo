import { getNotificationFieldVisibility } from "../utils/notification-field-visibility";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { toast } from "sonner";
import { useNavigate, useParams } from "@tanstack/react-router";
import { getApiErrorMessage } from "@lootlog/client/transport";
import {
  CreateNotificationRuleDtoScheduleAnchor as NotificationScheduleAnchor,
  CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType,
  CreateNotificationRuleDtoScheduleStrategy as NotificationScheduleStrategy,
  CreateNotificationRuleDtoTriggerType as NotificationTriggerType,
  type CreateNotificationRuleDtoTriggerType,
  type NotificationTargetResponseDto,
  type NotificationRuleResponseDto,
  getNotificationsGuildControllerGetGuildRulesQueryKey,
  getNotificationsGuildControllerGetGuildTargetsQueryKey,
  useNotificationsGuildControllerCreateGuildRule,
  useNotificationsGuildControllerGetGuildRules,
  useNotificationsGuildControllerGetGuildTargets,
  useNotificationsGuildControllerUpdateGuildRule,
  useRolesControllerGetGuildRoles,
  useGuildsControllerGetWorldsByGuildId,
  type SearchTimersNpcResponseDtoOutput,
  type TimersControllerSearchNpcsWithTimerDataParams,
  getTimersControllerSearchNpcsWithTimerDataQueryKey,
  useTimersControllerSearchNpcsWithTimerData,
} from "@lootlog/client/main";

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
  findSelectedTimerNpc,
  getNotificationRuleNpcIdsForSubmit,
  getNotificationRuleNpcLookupParams,
  hasTimerNpcSelection,
  parseManualNotificationRuleNpcIds,
  parseNotificationRuleNpcSelection,
  toTimerNpcSearchSelection,
} from "../utils/notification-rule-form-npc.utils";
import { ROUTES } from "@/config/routes";
import { useGuildId } from "@/hooks/context/use-guild-id";

import { invalidateGuildNotificationQueries } from "../notifications-api";

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

const getScheduledUntilPayload = (
  values: RuleFormValues,
  isRecurring: boolean,
  savedScheduledUntil: string | null | undefined,
) => {
  if (!isRecurring) return undefined;

  const scheduledUntil = parseDateTimeLocalInputToIsoString(
    values.scheduledUntil,
    GUILD_NOTIFICATION_TIMEZONE,
  );

  if (scheduledUntil) return scheduledUntil;

  return savedScheduledUntil ? null : undefined;
};

const getScheduledMessagePayload = (
  values: RuleFormValues,
  savedScheduledUntil: string | null | undefined,
) => {
  const visibleFields = getNotificationFieldVisibility(
    values.triggerType,
    values.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE,
  );

  return {
    scheduledAt: visibleFields.showScheduledAtField
      ? parseDateTimeLocalInputToIsoString(
          values.scheduledAt,
          GUILD_NOTIFICATION_TIMEZONE,
        )
      : undefined,
    scheduleIntervalType:
      values.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE,
    scheduleIntervalValue:
      visibleFields.showIntervalValueField && values.scheduleIntervalValue
        ? Number(values.scheduleIntervalValue)
        : undefined,
    scheduleTimeOfDay: visibleFields.showTimeOfDayField
      ? values.scheduleTimeOfDay || undefined
      : undefined,
    scheduleWeekday:
      visibleFields.showWeekdayField && values.scheduleWeekday !== ""
        ? Number(values.scheduleWeekday)
        : undefined,
    scheduledUntil: getScheduledUntilPayload(
      values,
      visibleFields.isRecurring,
      savedScheduledUntil,
    ),
    scheduleTimezone: GUILD_NOTIFICATION_TIMEZONE,
  };
};

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

// Leaves room for the same monster's timers on several worlds.
const TIMER_NPC_SEARCH_LIMIT = 50;

const NUMERIC_NPC_SEARCH_PATTERN = /^\d+$/;

const getTimerNpcSearchParams = (
  search: string,
  world: string | undefined,
): TimersControllerSearchNpcsWithTimerDataParams => {
  const term = search.trim();

  const criteria = NUMERIC_NPC_SEARCH_PATTERN.test(term)
    ? { npcIds: [Number(term)], templateIds: [Number(term)] }
    : { search: term };

  return { ...criteria, world, limit: TIMER_NPC_SEARCH_LIMIT };
};

const getNpcOptionLabel = (
  selection: string,
  timer: SearchTimersNpcResponseDtoOutput | undefined,
  t: TFunction,
) => {
  const { isTemplate, id } = parseNotificationRuleNpcSelection(selection);

  if (!timer) {
    return t(
      isTemplate
        ? "settings.notifications.npcOption.unmatchedTemplate"
        : "settings.notifications.npcOption.unmatched",
      { id },
    );
  }

  const type = t(`npcType.${timer.type}`);

  return isTemplate
    ? t("settings.notifications.npcOption.template", {
        name: timer.name,
        type,
        id,
      })
    : `${timer.name} ${type} (#${id})`;
};

/**
 * Saved selections are labelled from their timers; once the lookup has
 * answered, a selection without a visible timer stays listed as unmatched so
 * it can be inspected and removed.
 */
const getNpcOptions = (
  selected: { values: string[]; timers?: SearchTimersNpcResponseDtoOutput[] },
  searched: SearchTimersNpcResponseDtoOutput[],
  isAllWorlds: boolean,
  t: TFunction,
) => {
  const options = new Map<string, { value: string; label: string }>();

  if (selected.timers) {
    for (const value of selected.values) {
      const timer = findSelectedTimerNpc(value, selected.timers);
      options.set(value, { value, label: getNpcOptionLabel(value, timer, t) });
    }
  }

  for (const timer of searched) {
    const value = toTimerNpcSearchSelection(timer, isAllWorlds);

    if (value && !options.has(value)) {
      options.set(value, { value, label: getNpcOptionLabel(value, timer, t) });
    }
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

/** NPC options for a timer rule, read from the Organization's timers. */
const useTimerNpcSelection = (
  form: Pick<UseFormReturn<RuleFormValues>, "control">,
  guildId: string | undefined,
  npcSearch: string,
  t: TFunction,
) => {
  const [selectedWorld, manualNpcEntry, watchedNpcIds, manualNpcIds] = useWatch(
    {
      control: form.control,
      name: ["world", "manualNpcEntry", "npcIds", "manualNpcIds"],
    },
  );

  const isManualNpcEntry = manualNpcEntry ?? false;
  const selectedNpcIds = watchedNpcIds ?? [];

  const normalizedWorld =
    selectedWorld !== ALL_WORLDS_VALUE ? selectedWorld : undefined;

  const selectedNpcSearchParams = {
    ...getNotificationRuleNpcLookupParams(selectedNpcIds),
    world: normalizedWorld,
    limit: TIMER_NPC_SEARCH_LIMIT,
  };

  const searchPathParams = { guildId: guildId ?? "" };

  const selectedNpcQuery = useTimersControllerSearchNpcsWithTimerData(
    searchPathParams,
    selectedNpcSearchParams,
    {
      query: {
        queryKey: getTimersControllerSearchNpcsWithTimerDataQueryKey(
          searchPathParams,
          selectedNpcSearchParams,
        ),
        enabled: !!guildId && !isManualNpcEntry && selectedNpcIds.length > 0,
      },
    },
  );

  const searchedNpcSearchParams = getTimerNpcSearchParams(
    npcSearch,
    normalizedWorld,
  );

  const hasNpcSearch = npcSearch.trim().length > 0;

  const searchedNpcQuery = useTimersControllerSearchNpcsWithTimerData(
    searchPathParams,
    searchedNpcSearchParams,
    {
      query: {
        queryKey: getTimersControllerSearchNpcsWithTimerDataQueryKey(
          searchPathParams,
          searchedNpcSearchParams,
        ),
        enabled: !!guildId && !isManualNpcEntry && hasNpcSearch,
      },
    },
  );

  const isAllWorlds = normalizedWorld === undefined;

  const npcOptions = getNpcOptions(
    { values: selectedNpcIds, timers: selectedNpcQuery.data },
    searchedNpcQuery.data ?? [],
    isAllWorlds,
    t,
  );

  const activeNpcQuery = hasNpcSearch ? searchedNpcQuery : selectedNpcQuery;

  const npcSelections = isManualNpcEntry
    ? parseManualNotificationRuleNpcIds(manualNpcIds ?? "").ids
    : selectedNpcIds;

  return {
    isManualNpcEntry,
    npcOptions,
    npcSearchError:
      activeNpcQuery.isEnabled && activeNpcQuery.isError
        ? t("common.searchUnavailable")
        : undefined,
    isAllWorlds,
    hasAllWorldTimerNpcSelection:
      isAllWorlds && hasTimerNpcSelection(npcSelections),
    searchedNpcQuery,
  };
};

const notificationRuleRouteParams = z.object({ ruleId: z.string().optional() });

export const useNotificationRuleForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false });
  const ruleId = notificationRuleRouteParams.parse(params).ruleId;
  const isCreateMode = ruleId === undefined;
  const draftIdentity = JSON.stringify([guildId, ruleId]);

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

  const [draftOptions, setDraftOptions] = useState<{
    identity: string;
    npcSearch: string;
    extraTargets: NotificationTargetResponseDto[];
  }>({ identity: draftIdentity, npcSearch: "", extraTargets: [] });

  const { npcSearch, extraTargets } =
    draftOptions.identity === draftIdentity
      ? draftOptions
      : { npcSearch: "", extraTargets: [] };

  const setNpcSearch = (value: string) => {
    setDraftOptions({
      identity: draftIdentity,
      npcSearch: value,
      extraTargets,
    });
  };

  const [formResetKey, setFormResetKey] = useState(0);

  const [isCreateTargetDialogOpen, setIsCreateTargetDialogOpen] =
    useState(false);

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema(t, maxNpcCount)),
    defaultValues: getEmptyRuleFormValues(),
  });

  const initializedDraft = useRef<
    { identity: string; rule: typeof rule } | undefined
  >(undefined);

  useEffect(() => {
    const initialized = initializedDraft.current;

    if (
      (initialized?.identity === draftIdentity && initialized.rule === rule) ||
      (ruleId !== undefined && !rule)
    ) {
      return;
    }

    initializedDraft.current = { identity: draftIdentity, rule };

    // A refetch of the same rule refreshes untouched fields and keeps edits.
    const isRefetch = initialized?.identity === draftIdentity;

    const keepsContentDraft =
      isRefetch && form.getFieldState("contentTemplate").isDirty;

    form.reset(getRuleFormDefaultValues(rule), { keepDirtyValues: isRefetch });

    if (!keepsContentDraft) setFormResetKey((prev) => prev + 1);
  }, [draftIdentity, form, rule, ruleId]);

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

  const {
    isManualNpcEntry,
    npcOptions,
    npcSearchError,
    isAllWorlds,
    hasAllWorldTimerNpcSelection,
    searchedNpcQuery,
  } = useTimerNpcSelection(form, guildId, npcSearch, t);

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
    setDraftOptions((current) => {
      const currentDraft =
        current.identity === draftIdentity
          ? current
          : { npcSearch: "", extraTargets: [] };

      return {
        identity: draftIdentity,
        npcSearch: currentDraft.npcSearch,
        extraTargets: [...currentDraft.extraTargets, createdTarget],
      };
    });
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
            ...getScheduledMessagePayload(values, rule?.scheduledUntil),
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
    npcSearchError,
    isAllWorlds,
    hasAllWorldTimerNpcSelection,
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
