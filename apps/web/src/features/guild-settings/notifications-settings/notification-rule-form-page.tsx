import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import * as z from "zod";
import { useNavigate, useParams } from "@tanstack/react-router";
import { MultiSelect } from "@/components/ui/multi-select";
import { getApiErrorMessage } from "@/features/events/utils/get-api-error-message";
import { useNpcs } from "@/hooks/api/game-data/use-npcs";
import { useWorlds } from "@/hooks/api/game-data/use-worlds";
import { useGuildRoles } from "@/hooks/api/guilds/use-guild-roles";
import {
  useCreateGuildNotificationRule,
  useGuildNotifications,
  useUpdateGuildNotificationRule,
  type GuildNotificationTarget,
} from "@/hooks/api/guilds/use-guild-notifications";
import {
  NotificationScheduleAnchor,
  NotificationScheduleIntervalType,
  NotificationScheduleStrategy,
  NotificationTriggerType,
} from "@lootlog/types";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Switch } from "@lootlog/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  getDefaultGuildNotificationRuleContentTemplate,
  getDefaultScheduledMessageContentTemplate,
  getGuildNotificationRuleNpcIds,
  getGuildNotificationRuleTargetIds,
  getGuildNotificationTargetLabel,
  getNotificationTriggerTranslationKey,
  mergeGuildNotificationTargets,
} from "./utils/notification-settings.utils";
import {
  formatDateTimeLocalInputValue,
  GUILD_NOTIFICATION_TIMEZONE,
  parseDateTimeLocalInputToIsoString,
} from "./utils/notification-schedule-time.utils";
import {
  NotificationTemplateEditor,
  createPreviewTemplateValues,
  renderTemplatePreview,
} from "./components/notification-template-editor";
import { NotificationTargetDialog } from "./components/notification-target-dialog";
import { ROUTES } from "@/config/routes";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { GuildRole } from "@/hooks/api/guilds/use-guild-roles";
import type { Components } from "react-markdown";

const ALL_WORLDS_VALUE = "__all_worlds__";
const ROLE_LINK_PREFIX = "role:";

const getRoleHexColor = (role: GuildRole) =>
  role.color === 0
    ? null
    : `#${role.color.toString(16).padStart(6, "0").toUpperCase()}`;

const replaceRoleMentions = (text: string, roles: GuildRole[]) => {
  const roleById = new Map(roles.map((role) => [role.id, role] as const));

  return text
    .replace(/<@&(\d+)>/g, (_match, roleId: string) => {
      const role = roleById.get(roleId);
      const name = role ? `@${role.name}` : `@${roleId}`;
      const color = role ? (getRoleHexColor(role) ?? "") : "";
      return `[${name}](${ROLE_LINK_PREFIX}${color})`;
    })
    .replace(/@(everyone|here)/g, (_match, keyword: string) => {
      return `[@${keyword}](${ROLE_LINK_PREFIX})`;
    });
};

const previewUrlTransform = (url: string) =>
  url.startsWith(ROLE_LINK_PREFIX) ? url : defaultUrlTransform(url);

const previewMarkdownComponents: Components = {
  a: ({ href, children }) => {
    if (href?.startsWith(ROLE_LINK_PREFIX)) {
      const color = href.slice(ROLE_LINK_PREFIX.length) || null;
      return (
        <span
          style={{
            backgroundColor: color
              ? `${color}22`
              : "color-mix(in oklab, var(--primary) 12%, transparent)",
            borderRadius: "2px",
            color: color ?? "var(--primary)",
          }}
        >
          {children}
        </span>
      );
    }
    return <a href={href}>{children}</a>;
  },
};

const ruleFormSchema = (
  t: (key: string, options?: Record<string, unknown>) => string,
  maxNpcCount: number,
) =>
  z
    .object({
      name: z.string(),
      triggerType: z.nativeEnum(NotificationTriggerType),
      world: z.string().optional(),
      npcIds: z.array(z.string()).optional(),
      contentTemplate: z
        .string()
        .trim()
        .min(1, t("settings.notifications.validation.templateRequired")),
      scheduleAnchor: z.nativeEnum(NotificationScheduleAnchor).optional(),
      scheduleOffsetMinutes: z.string().optional(),
      scheduledAt: z.string().optional(),
      scheduleIntervalType: z
        .nativeEnum(NotificationScheduleIntervalType)
        .optional(),
      scheduleIntervalValue: z.string().optional(),
      scheduleTimeOfDay: z.string().optional(),
      scheduleWeekday: z.string().optional(),
      scheduledUntil: z.string().optional(),
      targetIds: z
        .array(z.string())
        .min(1, t("settings.notifications.validation.targetRequired")),
      enabled: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (data.triggerType === NotificationTriggerType.TIMER_BEFORE_SPAWN) {
        if (!data.world || data.world === ALL_WORLDS_VALUE) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("settings.notifications.validation.worldRequired"),
            path: ["world"],
          });
        }
        if (!data.npcIds || data.npcIds.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("settings.notifications.validation.npcRequired"),
            path: ["npcIds"],
          });
        }
        if (data.npcIds && data.npcIds.length > maxNpcCount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("settings.notifications.validation.maxNpcCount", {
              count: maxNpcCount,
            }),
            path: ["npcIds"],
          });
        }
        if (!data.scheduleAnchor) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(
              "settings.notifications.validation.scheduleOffsetRequired",
            ),
            path: ["scheduleAnchor"],
          });
        }
        const offset = data.scheduleOffsetMinutes?.trim();
        if (!offset || offset.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(
              "settings.notifications.validation.scheduleOffsetRequired",
            ),
            path: ["scheduleOffsetMinutes"],
          });
        } else if (!Number.isInteger(Number(offset)) || Number(offset) < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(
              "settings.notifications.validation.scheduleOffsetNonNegative",
            ),
            path: ["scheduleOffsetMinutes"],
          });
        }
      }

      if (data.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE) {
        const interval =
          data.scheduleIntervalType ?? NotificationScheduleIntervalType.ONCE;

        if (
          interval === NotificationScheduleIntervalType.ONCE ||
          interval === NotificationScheduleIntervalType.HOURLY
        ) {
          if (!data.scheduledAt) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t(
                "settings.notifications.validation.scheduledAtRequired",
              ),
              path: ["scheduledAt"],
            });
          } else {
            const scheduledAtIsoString = parseDateTimeLocalInputToIsoString(
              data.scheduledAt,
              GUILD_NOTIFICATION_TIMEZONE,
            );

            if (
              !scheduledAtIsoString ||
              new Date(scheduledAtIsoString).getTime() <= Date.now()
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t(
                  "settings.notifications.validation.scheduledAtFuture",
                ),
                path: ["scheduledAt"],
              });
            }
          }
        }

        if (interval === NotificationScheduleIntervalType.HOURLY) {
          const val = Number(data.scheduleIntervalValue);
          if (
            !data.scheduleIntervalValue ||
            !Number.isInteger(val) ||
            val < 1 ||
            val > 24
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t(
                "settings.notifications.validation.intervalValueRange",
              ),
              path: ["scheduleIntervalValue"],
            });
          }
        }

        if (
          interval === NotificationScheduleIntervalType.DAILY ||
          interval === NotificationScheduleIntervalType.WEEKLY
        ) {
          if (
            !data.scheduleTimeOfDay ||
            !/^\d{2}:\d{2}$/.test(data.scheduleTimeOfDay)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("settings.notifications.validation.timeOfDayRequired"),
              path: ["scheduleTimeOfDay"],
            });
          }
        }

        if (interval === NotificationScheduleIntervalType.WEEKLY) {
          if (
            data.scheduleWeekday === undefined ||
            data.scheduleWeekday === ""
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("settings.notifications.validation.weekdayRequired"),
              path: ["scheduleWeekday"],
            });
          }
        }
      }
    });

type RuleFormValues = z.infer<ReturnType<typeof ruleFormSchema>>;

export const NotificationRuleFormPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const guildId = useGuildId();
  const params = useParams({ strict: false });
  const ruleId = (params as { ruleId?: string }).ruleId;
  const isCreateMode = ruleId === undefined;

  const { data } = useGuildNotifications();
  const targets = data?.targets ?? [];
  const maxNpcCount = data?.limits?.maxNpcsPerRule ?? 5;
  const rule = isCreateMode
    ? undefined
    : data?.rules.find((r) => String(r.id) === ruleId);

  const createRule = useCreateGuildNotificationRule();
  const updateRule = useUpdateGuildNotificationRule();
  const { data: worlds = [] } = useWorlds();
  const { data: guildRoles = [] } = useGuildRoles();
  const [npcSearch, setNpcSearch] = useState("");
  const [extraTargets, setExtraTargets] = useState<GuildNotificationTarget[]>(
    [],
  );
  const [isCreateTargetDialogOpen, setIsCreateTargetDialogOpen] =
    useState(false);
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema(t, maxNpcCount)),
    defaultValues: {
      name: "",
      triggerType: NotificationTriggerType.TIMER_BEFORE_SPAWN,
      world: ALL_WORLDS_VALUE,
      npcIds: [],
      contentTemplate: getDefaultGuildNotificationRuleContentTemplate(t),
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

  const getDefaultContentTemplate = (triggerType: NotificationTriggerType) =>
    triggerType === NotificationTriggerType.SCHEDULED_MESSAGE
      ? getDefaultScheduledMessageContentTemplate(t)
      : getDefaultGuildNotificationRuleContentTemplate(t);

  useEffect(() => {
    const triggerType =
      rule?.triggerType ?? NotificationTriggerType.TIMER_BEFORE_SPAWN;

    form.reset({
      name: rule?.name ?? "",
      triggerType,
      world: rule?.world ?? ALL_WORLDS_VALUE,
      npcIds: rule ? getGuildNotificationRuleNpcIds(rule) : [],
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
  }, [form, rule, t]);

  const mergedTargets = mergeGuildNotificationTargets(targets, extraTargets);
  const previewTemplateValues = createPreviewTemplateValues(t);
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
  const selectedNpcIds = form.watch("npcIds") ?? [];
  const normalizedWorld =
    selectedWorld !== ALL_WORLDS_VALUE ? selectedWorld : undefined;
  const selectedNpcQuery = useNpcs({
    selectedNpcs: selectedNpcIds.join(","),
    world: normalizedWorld,
    enabled: selectedNpcIds.length > 0,
  });
  const searchedNpcQuery = useNpcs({
    search: npcSearch,
    world: normalizedWorld,
    enabled: npcSearch.trim().length > 0,
  });

  const npcOptionsMap = new Map<string, { value: string; label: string }>();

  for (const npc of selectedNpcQuery.data ?? []) {
    npcOptionsMap.set(String(npc.id), {
      value: String(npc.id),
      label: `${npc.name} (#${npc.id})`,
    });
  }

  for (const npc of searchedNpcQuery.data ?? []) {
    npcOptionsMap.set(String(npc.id), {
      value: String(npc.id),
      label: `${npc.name} (#${npc.id})`,
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

  const navigateBack = () => {
    if (guildId) {
      navigate({ to: ROUTES.guild.settings.notifications(guildId) });
    }
  };

  const handleTargetCreated = (createdTarget: GuildNotificationTarget) => {
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
            const numericNpcIds = (values.npcIds ?? []).map((npcId) =>
              Number(npcId),
            );
            const npcFilterPayload =
              numericNpcIds.length === 1
                ? { npcId: numericNpcIds[0] }
                : { npcIds: numericNpcIds };
            return {
              ...basePayload,
              world:
                values.world !== ALL_WORLDS_VALUE
                  ? (values.world ?? null)
                  : null,
              scheduleStrategy:
                NotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE,
              scheduleAnchor: values.scheduleAnchor!,
              scheduleOffsetMinutes: Number(values.scheduleOffsetMinutes),
              ...npcFilterPayload,
            };
          })();

    try {
      if (isCreateMode) {
        await createRule.mutateAsync(payload);
        toast.success(t("settings.notifications.toasts.ruleCreated"));
      } else if (rule) {
        await updateRule.mutateAsync({
          ruleId: rule.id,
          ...payload,
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 px-3 pb-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="flex flex-col gap-5"
                  >
                    <FormField
                      control={form.control}
                      name="triggerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {t("settings.notifications.fields.triggerType")}
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const nextType = value as NotificationTriggerType;
                              form.setValue(
                                "contentTemplate",
                                getDefaultContentTemplate(nextType),
                              );
                              if (
                                nextType ===
                                NotificationTriggerType.SCHEDULED_MESSAGE
                              ) {
                                form.setValue("world", ALL_WORLDS_VALUE);
                                form.setValue("npcIds", []);
                              } else {
                                form.setValue("scheduledAt", "");
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem
                                value={
                                  NotificationTriggerType.TIMER_BEFORE_SPAWN
                                }
                              >
                                {t(
                                  getNotificationTriggerTranslationKey(
                                    NotificationTriggerType.TIMER_BEFORE_SPAWN,
                                  ),
                                )}
                              </SelectItem>
                              <SelectItem
                                value={
                                  NotificationTriggerType.SCHEDULED_MESSAGE
                                }
                              >
                                {t(
                                  getNotificationTriggerTranslationKey(
                                    NotificationTriggerType.SCHEDULED_MESSAGE,
                                  ),
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {isScheduledMessage
                              ? t(
                                  "settings.notifications.ruleDialog.triggerDescriptionScheduledMessage",
                                )
                              : t(
                                  "settings.notifications.ruleDialog.triggerDescription",
                                )}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {t("settings.notifications.fields.name")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t(
                                "settings.notifications.placeholders.name",
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isScheduledMessage ? (
                      <>
                        <FormField
                          control={form.control}
                          name="world"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t("settings.notifications.fields.world")}
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={ALL_WORLDS_VALUE}>
                                    {t("settings.notifications.allWorlds")}
                                  </SelectItem>
                                  {worldOptions.map((world) => (
                                    <SelectItem key={world} value={world}>
                                      {world}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="npcIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t("settings.notifications.fields.npcs")}
                              </FormLabel>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t(
                                  "settings.notifications.validation.maxNpcCount",
                                  {
                                    count: maxNpcCount,
                                  },
                                )}
                              </p>
                              <FormControl>
                                <MultiSelect
                                  options={npcOptions}
                                  value={field.value ?? []}
                                  onValueChange={field.onChange}
                                  onClose={field.onChange}
                                  placeholder={t(
                                    "settings.notifications.placeholders.npcs",
                                  )}
                                  controlledSearch
                                  searchValue={npcSearch}
                                  onSearchChange={setNpcSearch}
                                  loading={searchedNpcQuery.isFetching}
                                  searchPlaceholder={t(
                                    "settings.notifications.placeholders.searchNpcs",
                                  )}
                                  emptyMessage={t(
                                    "settings.notifications.empty.npcs",
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : null}

                    {isScheduledMessage ? (
                      <>
                        <FormField
                          control={form.control}
                          name="scheduleIntervalType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t(
                                  "settings.notifications.fields.scheduleIntervalType",
                                )}
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem
                                    value={
                                      NotificationScheduleIntervalType.ONCE
                                    }
                                  >
                                    {t(
                                      "settings.notifications.intervalTypes.once",
                                    )}
                                  </SelectItem>
                                  <SelectItem
                                    value={
                                      NotificationScheduleIntervalType.HOURLY
                                    }
                                  >
                                    {t(
                                      "settings.notifications.intervalTypes.hourly",
                                    )}
                                  </SelectItem>
                                  <SelectItem
                                    value={
                                      NotificationScheduleIntervalType.DAILY
                                    }
                                  >
                                    {t(
                                      "settings.notifications.intervalTypes.daily",
                                    )}
                                  </SelectItem>
                                  <SelectItem
                                    value={
                                      NotificationScheduleIntervalType.WEEKLY
                                    }
                                  >
                                    {t(
                                      "settings.notifications.intervalTypes.weekly",
                                    )}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {showIntervalValueField ? (
                          <FormField
                            control={form.control}
                            name="scheduleIntervalValue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                  {t(
                                    "settings.notifications.fields.scheduleIntervalValue",
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    max="24"
                                    step="1"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : null}

                        {showWeekdayField ? (
                          <FormField
                            control={form.control}
                            name="scheduleWeekday"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                  {t(
                                    "settings.notifications.fields.scheduleWeekday",
                                  )}
                                </FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                                      <SelectItem key={day} value={String(day)}>
                                        {t(
                                          `settings.notifications.weekdays.${day}`,
                                        )}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : null}

                        {showTimeOfDayField ? (
                          <FormField
                            control={form.control}
                            name="scheduleTimeOfDay"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                  {t(
                                    "settings.notifications.fields.scheduleTimeOfDay",
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="time"
                                    placeholder={t(
                                      "settings.notifications.placeholders.scheduleTimeOfDay",
                                    )}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : null}

                        {showScheduledAtField ? (
                          <FormField
                            control={form.control}
                            name="scheduledAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                  {t(
                                    "settings.notifications.fields.scheduledAt",
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="datetime-local"
                                    min={formatDateTimeLocalInputValue(
                                      new Date().toISOString(),
                                      GUILD_NOTIFICATION_TIMEZONE,
                                    )}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : null}

                        {isRecurring ? (
                          <FormField
                            control={form.control}
                            name="scheduledUntil"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                  {t(
                                    "settings.notifications.fields.scheduledUntil",
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="datetime-local"
                                    placeholder={t(
                                      "settings.notifications.placeholders.scheduledUntil",
                                    )}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : null}
                      </>
                    ) : null}

                    <FormField
                      control={form.control}
                      name="contentTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {t("settings.notifications.fields.contentTemplate")}
                          </FormLabel>
                          <FormControl>
                            <NotificationTemplateEditor
                              key={`${rule?.id ?? "create"}-${watchedTriggerType}`}
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              roles={guildRoles}
                              triggerType={watchedTriggerType}
                              disabled={isSubmitting}
                              previewButtonClassName="lg:hidden"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isScheduledMessage ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="scheduleAnchor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t(
                                  "settings.notifications.fields.scheduleAnchor",
                                )}
                              </FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem
                                    value={NotificationScheduleAnchor.MIN_SPAWN}
                                  >
                                    {t(
                                      "settings.notifications.scheduleAnchors.minSpawn",
                                    )}
                                  </SelectItem>
                                  <SelectItem
                                    value={NotificationScheduleAnchor.MAX_SPAWN}
                                  >
                                    {t(
                                      "settings.notifications.scheduleAnchors.maxSpawn",
                                    )}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="scheduleOffsetMinutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t(
                                  "settings.notifications.fields.scheduleOffsetMinutes",
                                )}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  inputMode="numeric"
                                  min="0"
                                  step="1"
                                  placeholder={t(
                                    "settings.notifications.placeholders.scheduleOffsetMinutes",
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ) : null}

                    <FormField
                      control={form.control}
                      name="targetIds"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {t("settings.notifications.fields.targets")}
                              </FormLabel>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t(
                                  "settings.notifications.ruleDialog.targetsDescription",
                                )}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setIsCreateTargetDialogOpen(true)}
                            >
                              {t("settings.notifications.actions.addTarget")}
                            </Button>
                          </div>
                          <FormControl>
                            <MultiSelect
                              options={targetOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              onClose={field.onChange}
                              placeholder={t(
                                "settings.notifications.placeholders.targets",
                              )}
                              searchPlaceholder={t(
                                "settings.notifications.placeholders.searchTargets",
                              )}
                              emptyMessage={t(
                                "settings.notifications.empty.targetsSelect",
                              )}
                              commandSearch
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isCreateMode ? (
                      <FormField
                        control={form.control}
                        name="enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/70 bg-background/30 px-3 py-3">
                            <div>
                              <FormLabel className="text-sm font-medium">
                                {t("settings.notifications.fields.enabled")}
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "settings.notifications.fields.enabledDescription",
                                )}
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-2 border-t border-border/50 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={navigateBack}
                        disabled={isSubmitting}
                      >
                        {t("settings.notifications.actions.cancel")}
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <Spinner className="size-4" />
                        ) : isCreateMode ? (
                          t("settings.notifications.actions.create")
                        ) : (
                          t("settings.notifications.actions.save")
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </Card>
            </div>

            <div className="hidden lg:block">
              <Card className="sticky top-0 gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("settings.notifications.templateEditor.previewLabel")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "settings.notifications.templateEditor.previewDescription",
                  )}
                </p>
                <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-4 text-sm">
                  <div className="max-w-none whitespace-pre-wrap break-words text-foreground [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_hr]:border-border [&_li]:ml-4 [&_p]:leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_strong]:font-semibold">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={previewMarkdownComponents}
                      urlTransform={previewUrlTransform}
                    >
                      {replaceRoleMentions(
                        renderTemplatePreview(
                          contentTemplate,
                          previewTemplateValues,
                        ),
                        guildRoles,
                      )}
                    </ReactMarkdown>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("settings.notifications.templateEditor.previewNotice")}
                </p>
              </Card>
            </div>
          </div>
        </div>
      </ScrollArea>

      <NotificationTargetDialog
        open={isCreateTargetDialogOpen}
        mode="create"
        existingTargets={mergedTargets}
        onOpenChange={setIsCreateTargetDialogOpen}
        onCreated={handleTargetCreated}
      />
    </div>
  );
};
