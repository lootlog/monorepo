import { BandSection } from "@/components/common/band-section";
import { PageHeader } from "@/components/common/page-header";
import { MultiSelect } from "@/components/ui/multi-select";
import { NotificationCreateSkeleton } from "./notification-create-skeleton";
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
import { useFormState } from "react-hook-form";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { Plus } from "lucide-react";
import { Switch } from "@lootlog/ui/components/switch";
import { NotificationMessagePreview } from "./components/notification-message-preview";
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
  } = useNotificationRuleForm();

  const { isDirty } = useFormState({ control: form.control });

  if (isLoading) return <NotificationCreateSkeleton />;

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
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">
        {t(
          isCreateMode
            ? "settings.notifications.ruleDialog.createTitle"
            : "settings.notifications.ruleDialog.editTitle",
        )}
      </h1>
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <Form {...form}>
          {/* Room below the last section for the floating save bar. */}
          <form onSubmit={form.handleSubmit(handleSubmit)} className="pb-24">
            <BandSection
              id="rule-form-basics"
              title={t("settings.notifications.ruleDialog.sections.rule")}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
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
              <NotificationTriggerField
                form={form}
                t={t}
                getDefaultContentTemplate={getDefaultContentTemplate}
              />
              {!isCreateMode && (
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <FormLabel>
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
              )}
            </BandSection>

            <BandSection
              id="rule-form-when"
              title={t("settings.notifications.ruleDialog.sections.when")}
              description={
                isScheduledMessage
                  ? t("settings.notifications.ruleDialog.whenScheduledMessage")
                  : t("settings.notifications.ruleDialog.whenTimer")
              }
            >
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
                isAllWorlds={isAllWorlds}
                hasAllWorldTimerNpcSelection={hasAllWorldTimerNpcSelection}
              />
              <NotificationTimerFields
                isScheduledMessage={isScheduledMessage}
                form={form}
                t={t}
              />
              <NotificationScheduleFields form={form} t={t} />
            </BandSection>

            <BandSection
              id="rule-form-where"
              title={t("settings.notifications.ruleDialog.sections.where")}
              description={t(
                "settings.notifications.ruleDialog.targetsDescription",
              )}
            >
              <FormField
                control={form.control}
                name="targetIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("settings.notifications.fields.targets")}
                    </FormLabel>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="min-w-0 flex-1">
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
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        icon=<Plus className="size-4" />
                        className="shrink-0"
                        onClick={() => setIsCreateTargetDialogOpen(true)}
                      >
                        {t("settings.notifications.actions.addTargetShort")}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </BandSection>

            <BandSection
              id="rule-form-content"
              title={t("settings.notifications.ruleDialog.sections.content")}
            >
              <FormField
                control={form.control}
                name="contentTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
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
                      />
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <NotificationMessagePreview
                contentTemplate={contentTemplate}
                guildRoles={guildRoles}
              />
            </BandSection>

            <UnsavedChangesBar
              isDirty={isCreateMode || isDirty}
              isSubmitting={isSubmitting}
              onReset={isCreateMode ? navigateBack : () => form.reset()}
              unsavedChangesLabel={
                isCreateMode
                  ? t("settings.notifications.ruleDialog.unsavedNewRule")
                  : undefined
              }
              resetLabel={
                isCreateMode
                  ? t("settings.notifications.actions.cancel")
                  : undefined
              }
              saveLabel={
                isCreateMode
                  ? t("settings.notifications.actions.create")
                  : t("settings.notifications.actions.save")
              }
            />
          </form>
        </Form>
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
