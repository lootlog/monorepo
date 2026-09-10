import { Button } from "@lootlog/ui/components/button";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Textarea } from "@lootlog/ui/components/textarea";
import { BookOpenText, Settings, Trophy } from "lucide-react";
import {
  useEventCreateDialog,
  type EventCreateDialogProps,
} from "./use-event-create-dialog";

import { ScoringModeSelector } from "../scoring/scoring-mode-selector";
import { ScoringRulesEditor } from "../scoring/scoring-rules-editor";

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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!createEvent.isPending) handleClose(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.createDialog.title")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {step === 1
                  ? t(
                      "events.scoring.chooseMode",
                      "Krok 1/2: wybierz tryb punktacji",
                    )
                  : t(
                      "events.scoring.configureEvent",
                      "Krok 2/2: skonfiguruj event",
                    )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.nameLabel")}
              </Label>
              <Input
                {...form.register("name")}
                placeholder={t("events.createDialog.namePlaceholder")}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.worldLabel")}
              </Label>
              <Input
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
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t(
                  "events.settings.participationConfirmation",
                  "Potwierdzenie udziału (minuty)",
                )}
              </Label>
              <Input
                type="number"
                min={0}
                {...form.register("participationConfirmationMinutes", {
                  valueAsNumber: true,
                })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <BookOpenText className="size-3" />
                {t("events.rulebook.label", "Regulamin eventu")}
              </Label>
              <Textarea
                {...form.register("rulebookMarkdown")}
                placeholder={t(
                  "events.rulebook.placeholder",
                  "Wpisz regulamin eventu, zasady uczestnictwa i dodatkowe informacje.",
                )}
                className="min-h-[140px] text-sm"
              />
            </div>

            {scoringMode === "ADVANCED" && (
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Settings className="size-3" />
                  {t("events.scoring.title")}
                </Label>
                <ScoringRulesEditor
                  value={form.watch("scoringRules")}
                  onChange={(value) =>
                    form.setValue("scoringRules", value, { shouldDirty: true })
                  }
                />
              </div>
            )}
          </form>
        )}

        <div className="px-5 py-3 border-t bg-muted/30 shrink-0 flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={createEvent.isPending}
            onClick={() => {
              if (step === 1) {
                handleClose(false);

                return;
              }

              setStep(1);
            }}
            className="flex-1"
            size="sm"
          >
            {step === 1
              ? t("events.createDialog.cancel")
              : t("events.createDialog.back", "Wstecz")}
          </Button>

          {step === 1 ? (
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={() => setStep(2)}
            >
              {t("events.createDialog.next", "Dalej")}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="flex-1"
              loading={createEvent.isPending}
              onClick={form.handleSubmit(onSubmit)}
            >
              {t("events.createDialog.create")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
