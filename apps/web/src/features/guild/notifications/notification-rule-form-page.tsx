import { MultiSelect } from "@/components/ui/multi-select";
import { CreateNotificationRuleDtoScheduleAnchor as NotificationScheduleAnchor } from "@lootlog/api-client/models/main/create-notification-rule-dto-schedule-anchor";
import { CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType } from "@lootlog/api-client/models/main/create-notification-rule-dto-schedule-interval-type";
import { CreateNotificationRuleDtoTriggerType as NotificationTriggerType } from "@lootlog/api-client/models/main/create-notification-rule-dto-trigger-type";
import type { CreateNotificationRuleDtoTriggerType } from "@lootlog/api-client/models/main/create-notification-rule-dto-trigger-type";
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
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Switch } from "@lootlog/ui/components/switch";
import { Textarea } from "@lootlog/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { getNotificationTriggerTranslationKey } from "./utils/notification-settings.utils";
import {
  formatDateTimeLocalInputValue,
  GUILD_NOTIFICATION_TIMEZONE,
} from "./utils/notification-schedule-time.utils";
import { ALL_WORLDS_VALUE } from "./utils/notification-rule-form.schema";
import { NotificationTemplateEditor } from "./components/notification-template-editor";
import { NotificationTargetDialog } from "./components/notification-target-dialog";
import { NotificationRulePreviewPanel } from "./components/notification-rule-preview-panel";
import { useNotificationRuleForm } from "./hooks/use-notification-rule-form";

export const NotificationRuleFormPage = () => {
  const {
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
  } = useNotificationRuleForm();

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background/50">
        <div className="flex flex-col gap-3 px-3 py-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="hidden lg:block">
              <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
                <Skeleton className="mb-3 h-5 w-24" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {t("settings.notifications.errors.loadFailed")}
        </p>
      </div>
    );
  }

  if (!isCreateMode && !rule) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {t("settings.notifications.errors.ruleNotFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 px-3 py-3">
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
                              if (!value) return;
                              field.onChange(value);
                              const nextType =
                                value as CreateNotificationRuleDtoTriggerType;
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
                                <SelectValue>
                                  {field.value
                                    ? t(
                                        getNotificationTriggerTranslationKey(
                                          field.value,
                                        ),
                                      )
                                    : null}
                                </SelectValue>
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
                                onValueChange={(value) => {
                                  if (!value) return;
                                  field.onChange(value);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue>
                                      {field.value === ALL_WORLDS_VALUE
                                        ? t("settings.notifications.allWorlds")
                                        : field.value}
                                    </SelectValue>
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
                          name="manualNpcEntry"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/70 bg-background/30 px-3 py-3">
                              <div className="pr-3">
                                <FormLabel className="text-sm font-medium">
                                  {t(
                                    "settings.notifications.manualNpcEntry.checkbox",
                                  )}
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  {t(
                                    "settings.notifications.manualNpcEntry.hint",
                                  )}
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={handleManualNpcEntryChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {isManualNpcEntry ? (
                          <FormField
                            control={form.control}
                            name="manualNpcIds"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                  {t(
                                    "settings.notifications.fields.manualNpcIds",
                                  )}
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
                                  <Textarea
                                    {...field}
                                    value={field.value ?? ""}
                                    rows={4}
                                    placeholder={t(
                                      "settings.notifications.placeholders.manualNpcIds",
                                    )}
                                    className="font-mono"
                                  />
                                </FormControl>
                                <p className="text-xs text-muted-foreground">
                                  {t(
                                    "settings.notifications.manualNpcEntry.fieldHint",
                                  )}
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
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
                        )}
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
                                onValueChange={(value) => {
                                  if (!value) return;
                                  field.onChange(value);
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
                                  onValueChange={(value) => {
                                    if (!value) return;
                                    field.onChange(value);
                                  }}
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
                              key={`${rule?.id ?? "create"}-${watchedTriggerType}-${formResetKey}`}
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
                                onValueChange={(value) => {
                                  if (!value) return;
                                  field.onChange(value);
                                }}
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
              <NotificationRulePreviewPanel
                contentTemplate={contentTemplate}
                guildRoles={guildRoles}
              />
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
