import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";
import { MultiSelect } from "@/components/ui/multi-select";
import { getApiErrorMessage } from "@/features/events/utils/get-api-error-message";
import { useNpcs } from "@/hooks/api/game-data/use-npcs";
import { useWorlds } from "@/hooks/api/game-data/use-worlds";
import {
  useCreateGuildNotificationRule,
  useCreateGuildNotificationTarget,
  useGuildAvailableNotificationTargets,
  useUpdateGuildNotificationRule,
  type GuildNotificationRule,
  type GuildNotificationTarget,
} from "@/hooks/api/guilds/use-guild-notifications";
import { NotificationTriggerType } from "@lootlog/types";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
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
  getGuildNotificationRuleNpcIds,
  getGuildNotificationRuleTargetIds,
  getGuildNotificationTargetLabel,
  getNotificationTriggerTranslationKey,
  mergeGuildNotificationTargets,
} from "../utils/notification-settings.utils";

const ALL_WORLDS_VALUE = "__all_worlds__";

const ruleFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string(),
    triggerType: z.nativeEnum(NotificationTriggerType),
    world: z.string(),
    npcIds: z.array(z.string()),
    leadTimeMinutes: z
      .string()
      .trim()
      .min(1, t("settings.notifications.validation.leadTimeRequired"))
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) > 0,
        t("settings.notifications.validation.leadTimePositive"),
      ),
    targetIds: z
      .array(z.string())
      .min(1, t("settings.notifications.validation.targetRequired")),
    enabled: z.boolean(),
  });

const quickTargetSchema = (t: (key: string) => string) =>
  z.object({
    externalId: z
      .string()
      .trim()
      .min(1, t("settings.notifications.validation.channelRequired")),
    displayName: z.string(),
  });

type RuleFormValues = z.infer<ReturnType<typeof ruleFormSchema>>;
type QuickTargetFormValues = z.infer<ReturnType<typeof quickTargetSchema>>;

type NotificationRuleDialogProps = {
  open: boolean;
  rule?: GuildNotificationRule;
  targets: GuildNotificationTarget[];
  onOpenChange: (open: boolean) => void;
};

export const NotificationRuleDialog = ({
  open,
  rule,
  targets,
  onOpenChange,
}: NotificationRuleDialogProps) => {
  const { t } = useTranslation();
  const isCreateMode = rule === undefined;
  const createRule = useCreateGuildNotificationRule();
  const updateRule = useUpdateGuildNotificationRule();
  const createTarget = useCreateGuildNotificationTarget();
  const { data: worlds = [] } = useWorlds();
  const { data: availableChannelsResponse, isLoading: isLoadingChannels } =
    useGuildAvailableNotificationTargets(open);
  const [npcSearch, setNpcSearch] = useState("");
  const [extraTargets, setExtraTargets] = useState<GuildNotificationTarget[]>(
    [],
  );
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema(t)),
    defaultValues: {
      name: "",
      triggerType: NotificationTriggerType.TIMER_BEFORE_SPAWN,
      world: ALL_WORLDS_VALUE,
      npcIds: [],
      leadTimeMinutes: "",
      targetIds: [],
      enabled: true,
    },
  });
  const quickTargetForm = useForm<QuickTargetFormValues>({
    resolver: zodResolver(quickTargetSchema(t)),
    defaultValues: {
      externalId: "",
      displayName: "",
    },
  });

  useEffect(() => {
    form.reset({
      name: rule?.name ?? "",
      triggerType:
        rule?.triggerType ?? NotificationTriggerType.TIMER_BEFORE_SPAWN,
      world: rule?.world ?? ALL_WORLDS_VALUE,
      npcIds: rule ? getGuildNotificationRuleNpcIds(rule) : [],
      leadTimeMinutes:
        rule?.leadTimeMinutes !== null && rule?.leadTimeMinutes !== undefined
          ? String(rule.leadTimeMinutes)
          : "",
      targetIds: rule ? getGuildNotificationRuleTargetIds(rule) : [],
      enabled: rule?.enabled ?? true,
    });
    quickTargetForm.reset({
      externalId: "",
      displayName: "",
    });
    setNpcSearch("");
    setExtraTargets([]);
    setIsQuickCreateOpen(false);
  }, [form, open, quickTargetForm, rule]);

  const mergedTargets = mergeGuildNotificationTargets(targets, extraTargets);
  const selectedWorld = form.watch("world");
  const selectedNpcIds = form.watch("npcIds");
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

  const existingTargetExternalIds = new Set(
    mergedTargets.map((targetItem) => targetItem.externalId),
  );
  const availableChannels =
    availableChannelsResponse?.channels.filter(
      (channel) => !existingTargetExternalIds.has(channel.channelId),
    ) ?? [];
  const isSubmitting =
    createRule.isPending || updateRule.isPending || createTarget.isPending;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNpcSearch("");
      setExtraTargets([]);
      setIsQuickCreateOpen(false);
      form.reset({
        name: rule?.name ?? "",
        triggerType:
          rule?.triggerType ?? NotificationTriggerType.TIMER_BEFORE_SPAWN,
        world: rule?.world ?? ALL_WORLDS_VALUE,
        npcIds: rule ? getGuildNotificationRuleNpcIds(rule) : [],
        leadTimeMinutes:
          rule?.leadTimeMinutes !== null && rule?.leadTimeMinutes !== undefined
            ? String(rule.leadTimeMinutes)
            : "",
        targetIds: rule ? getGuildNotificationRuleTargetIds(rule) : [],
        enabled: rule?.enabled ?? true,
      });
      quickTargetForm.reset({
        externalId: "",
        displayName: "",
      });
    }

    onOpenChange(nextOpen);
  };

  const handleQuickCreateToggle = (nextOpen: boolean) => {
    setIsQuickCreateOpen(nextOpen);

    if (!nextOpen) {
      quickTargetForm.reset({
        externalId: "",
        displayName: "",
      });
    }
  };

  const handleQuickTargetCreate = async (values: QuickTargetFormValues) => {
    const trimmedDisplayName = values.displayName.trim();

    try {
      const createdTarget = await createTarget.mutateAsync({
        externalId: values.externalId,
        displayName:
          trimmedDisplayName.length > 0 ? trimmedDisplayName : undefined,
      });

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
      toast.success(t("settings.notifications.toasts.targetCreated"));
      handleQuickCreateToggle(false);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.targetCreateError"),
      );
    }
  };

  const handleSubmit = async (values: RuleFormValues) => {
    const trimmedName = values.name.trim();
    const numericNpcIds = values.npcIds.map((npcId) => Number(npcId));
    const npcFilterPayload =
      numericNpcIds.length === 1
        ? { npcId: numericNpcIds[0] }
        : { npcIds: numericNpcIds };
    const payload = {
      name: trimmedName.length > 0 ? trimmedName : null,
      triggerType: NotificationTriggerType.TIMER_BEFORE_SPAWN,
      world: values.world !== ALL_WORLDS_VALUE ? values.world : null,
      leadTimeMinutes: Number(values.leadTimeMinutes),
      targetIds: values.targetIds.map((targetId) => Number(targetId)),
      enabled: values.enabled,
      ...npcFilterPayload,
    };

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

      handleDialogOpenChange(false);
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
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader className="border-b bg-muted/30 px-5 py-4">
          <DialogTitle className="px-0 pt-0 text-base">
            {t(
              isCreateMode
                ? "settings.notifications.ruleDialog.createTitle"
                : "settings.notifications.ruleDialog.editTitle",
            )}
          </DialogTitle>
          <DialogDescription className="px-0">
            {t(
              isCreateMode
                ? "settings.notifications.ruleDialog.createDescription"
                : "settings.notifications.ruleDialog.editDescription",
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col overflow-hidden"
          >
            <ScrollArea className="max-h-[calc(90vh-180px)]">
              <div className="space-y-5 px-5 py-5">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.notifications.fields.trigger")}
                  </p>
                  <div className="rounded-xl border border-border/70 bg-background/30 px-3 py-3">
                    <p className="text-sm font-medium">
                      {t(
                        getNotificationTriggerTranslationKey(
                          NotificationTriggerType.TIMER_BEFORE_SPAWN,
                        ),
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "settings.notifications.ruleDialog.triggerDescription",
                      )}
                    </p>
                  </div>
                </div>

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
                      <FormControl>
                        <MultiSelect
                          options={npcOptions}
                          value={field.value}
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
                          emptyMessage={t("settings.notifications.empty.npcs")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadTimeMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {t("settings.notifications.fields.leadTimeMinutes")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          placeholder={t(
                            "settings.notifications.placeholders.leadTimeMinutes",
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          onClick={() =>
                            handleQuickCreateToggle(!isQuickCreateOpen)
                          }
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

                {isQuickCreateOpen ? (
                  <Form {...quickTargetForm}>
                    <div className="space-y-4 rounded-xl border border-dashed border-border/80 bg-background/20 p-4">
                      <div>
                        <p className="text-sm font-medium">
                          {t("settings.notifications.quickTargetDialog.title")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "settings.notifications.quickTargetDialog.description",
                          )}
                        </p>
                      </div>
                      <FormField
                        control={quickTargetForm.control}
                        name="externalId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {t("settings.notifications.fields.channel")}
                            </FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={
                                isLoadingChannels ||
                                availableChannels.length === 0
                              }
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={t(
                                      "settings.notifications.placeholders.channel",
                                    )}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableChannels.map((channel) => (
                                  <SelectItem
                                    key={channel.channelId}
                                    value={channel.channelId}
                                  >
                                    {channel.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                            {isLoadingChannels ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Spinner className="size-3.5" />
                                {t(
                                  "settings.notifications.loading.availableChannels",
                                )}
                              </div>
                            ) : null}
                            {!isLoadingChannels &&
                            availableChannels.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "settings.notifications.empty.availableChannels",
                                )}
                              </p>
                            ) : null}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={quickTargetForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {t("settings.notifications.fields.displayName")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t(
                                  "settings.notifications.placeholders.displayName",
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickCreateToggle(false)}
                          disabled={createTarget.isPending}
                        >
                          {t("settings.notifications.actions.cancel")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={quickTargetForm.handleSubmit(
                            handleQuickTargetCreate,
                          )}
                          disabled={
                            createTarget.isPending ||
                            availableChannels.length === 0
                          }
                        >
                          {createTarget.isPending ? (
                            <Spinner className="size-4" />
                          ) : (
                            t("settings.notifications.actions.createTarget")
                          )}
                        </Button>
                      </div>
                    </div>
                  </Form>
                ) : null}

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
              </div>
            </ScrollArea>

            <DialogFooter className="border-t bg-muted/20 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
