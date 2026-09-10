import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { MultiSelect } from "@/components/ui/multi-select";
import { NotificationFormSkeleton } from "./notification-form-skeleton";
import { NotificationNpcFields } from "./notification-npc-fields";
import { NotificationScheduleFields } from "./notification-schedule-fields";
import { NotificationTimerFields } from "./notification-timer-fields";
import { NotificationTriggerField } from "./notification-trigger-field";

import { Button } from "@lootlog/ui/components/button";

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
import { Switch } from "@lootlog/ui/components/switch";
import { NotificationRulePreviewPanel } from "./components/notification-rule-preview-panel";
import { NotificationTargetDialog } from "./components/notification-target-dialog";
import { NotificationTemplateEditor } from "./components/notification-template-editor";
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
    maxNpcCount,
    npcSearch,
    setNpcSearch,
    npcOptions,
    npcSearchError,
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
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="flex flex-col gap-3 px-3 py-3">
          <NotificationFormSkeleton />
        </div>
      </div>
    );
  }

  if (isError || (!isCreateMode && !rule)) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-3" role="alert">
        <PageHeader
          title={t(
            isCreateMode
              ? "settings.notifications.ruleDialog.createTitle"
              : "settings.notifications.ruleDialog.editTitle",
          )}
          description={t(
            isError
              ? "settings.notifications.errors.loadFailed"
              : "settings.notifications.errors.ruleNotFound",
          )}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 px-3 py-3">
          <PageHeader
            title={t(
              isCreateMode
                ? "settings.notifications.ruleDialog.createTitle"
                : "settings.notifications.ruleDialog.editTitle",
            )}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SectionCard className="lg:col-span-2">
              <SectionCardContent className="flex flex-col gap-3">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="flex flex-col gap-5"
                  >
                    <NotificationTriggerField
                      form={form}
                      t={t}
                      getDefaultContentTemplate={getDefaultContentTemplate}
                      isScheduledMessage={isScheduledMessage}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {t("settings.notifications.fields.name")}
                          </FormLabel>
                          <FormControl
                            render=<Input
                              {...field}
                              placeholder={t(
                                "settings.notifications.placeholders.name",
                              )}
                            />
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <NotificationNpcFields
                      isScheduledMessage={isScheduledMessage}
                      form={form}
                      t={t}
                      worldOptions={worldOptions}
                      handleManualNpcEntryChange={handleManualNpcEntryChange}
                      isManualNpcEntry={isManualNpcEntry}
                      maxNpcCount={maxNpcCount}
                      npcOptions={npcOptions}
                      npcSearch={npcSearch}
                      setNpcSearch={setNpcSearch}
                      searchedNpcQuery={searchedNpcQuery}
                      npcSearchError={npcSearchError}
                    />

                    <NotificationScheduleFields form={form} t={t} />

                    <FormField
                      control={form.control}
                      name="contentTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {t("settings.notifications.fields.contentTemplate")}
                          </FormLabel>
                          <FormControl
                            render=<NotificationTemplateEditor
                              key={`${rule?.id ?? "create"}-${watchedTriggerType}-${formResetKey}`}
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              roles={guildRoles}
                              triggerType={watchedTriggerType}
                              disabled={isSubmitting}
                              previewButtonClassName="lg:hidden"
                            />
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <NotificationTimerFields
                      isScheduledMessage={isScheduledMessage}
                      form={form}
                      t={t}
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
                              onClick={() => setIsCreateTargetDialogOpen(true)}
                            >
                              {t("settings.notifications.actions.addTarget")}
                            </Button>
                          </div>
                          <FormControl
                            render=<MultiSelect
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
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isCreateMode ? (
                      <FormField
                        control={form.control}
                        name="enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between border-b border-border/70 py-3">
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
                            <FormControl
                              render=<Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            />
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
                      <Button type="submit" loading={isSubmitting}>
                        {isCreateMode
                          ? t("settings.notifications.actions.create")
                          : t("settings.notifications.actions.save")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </SectionCardContent>
            </SectionCard>

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
