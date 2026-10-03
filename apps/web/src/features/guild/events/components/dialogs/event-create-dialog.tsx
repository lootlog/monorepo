import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Textarea } from "@lootlog/ui/components/textarea";
import { BookOpenText, Settings, Trophy } from "lucide-react";
import { useId } from "react";
import { Controller } from "react-hook-form";
import { DialogActionFooter } from "./dialog-action-footer";
import {
  useEventCreateDialog,
  type EventCreateDialogProps,
} from "./use-event-create-dialog";

import { ScoringModeSelector } from "../scoring/scoring-mode-selector";
import { ScoringRulesEditor } from "../scoring/scoring-rules-editor";
import { hasValidScoringNumbers } from "../../utils/scoring-number-validation";

export const EventCreateDialog = ({
  open,
  onOpenChange,
}: EventCreateDialogProps) => {
  const {
    createEvent,
    handleClose,
    t,
    step,
    scoringMode,
    form,
    onSubmit,
    setStep,
  } = useEventCreateDialog({ open, onOpenChange });

  const nameInputId = useId();
  const worldInputId = useId();
  const participationInputId = useId();
  const rulebookInputId = useId();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!createEvent.isPending) handleClose(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <IconDialogHeader
          icon={Trophy}
          title={t("events.createDialog.title")}
          description={
            step === 1
              ? t("events.scoring.chooseMode")
              : t("events.scoring.configureEvent")
          }
        />

        {step === 1 ? (
          <div className="p-5 space-y-4 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              {t("events.scoring.modeHint")}
            </p>
            <ScoringModeSelector
              value={scoringMode}
              onChange={(nextMode) =>
                form.setValue("scoringMode", nextMode, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-5 space-y-5 overflow-y-auto"
          >
            <div className="space-y-2">
              <Label
                htmlFor={nameInputId}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {t("events.createDialog.nameLabel")}
              </Label>
              <Input
                id={nameInputId}
                {...form.register("name")}
                placeholder={t("events.createDialog.namePlaceholder")}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={worldInputId}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {t("events.createDialog.worldLabel")}
              </Label>
              <Input
                id={worldInputId}
                {...form.register("world")}
                placeholder={t("events.createDialog.worldPlaceholder")}
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("events.createDialog.startsAtLabel")}
                </Label>
                <DateTimePicker
                  value={form.watch("startsAt")}
                  onChange={(value) => form.setValue("startsAt", value)}
                  placeholder={t("events.createDialog.startsAtPlaceholder")}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("events.createDialog.endsAtLabel")}
                </Label>
                <DateTimePicker
                  value={form.watch("endsAt")}
                  onChange={(value) => form.setValue("endsAt", value)}
                  placeholder={t("events.createDialog.endsAtPlaceholder")}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={participationInputId}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {t("events.settings.participationConfirmation")}
              </Label>
              <Input
                id={participationInputId}
                type="number"
                min={0}
                {...form.register("participationConfirmationMinutes", {
                  valueAsNumber: true,
                })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={rulebookInputId}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"
              >
                <BookOpenText className="size-3" />
                {t("events.rulebook.label")}
              </Label>
              <Textarea
                id={rulebookInputId}
                {...form.register("rulebookMarkdown")}
                placeholder={t("events.rulebook.placeholder")}
                className="min-h-[140px] text-sm"
              />
            </div>

            {scoringMode === "ADVANCED" && (
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Settings className="size-3" />
                  {t("events.scoring.title")}
                </Label>
                <Controller
                  control={form.control}
                  name="scoringRules"
                  rules={{
                    validate: (value) =>
                      hasValidScoringNumbers(value) ||
                      t("events.scoring.validation.invalidRules"),
                  }}
                  render={({ field, fieldState }) => (
                    <ScoringRulesEditor
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      ref={field.ref}
                    />
                  )}
                />
              </div>
            )}
          </form>
        )}

        {step === 1 ? (
          <DialogActionFooter
            cancelLabel={t("events.createDialog.cancel")}
            confirmLabel={t("events.createDialog.next")}
            confirmType="button"
            isPending={false}
            onCancel={() => handleClose(false)}
            onConfirm={() => setStep(2)}
          />
        ) : (
          <DialogActionFooter
            cancelLabel={t("events.createDialog.back")}
            confirmLabel={t("events.createDialog.create")}
            confirmType="button"
            isPending={createEvent.isPending}
            onCancel={() => setStep(1)}
            onConfirm={form.handleSubmit(onSubmit)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
