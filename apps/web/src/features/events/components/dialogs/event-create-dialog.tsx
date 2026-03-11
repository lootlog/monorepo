import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Textarea } from "@lootlog/ui/components/textarea";
import { Label } from "@lootlog/ui/components/label";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import { useCreateEvent } from "../../hooks/mutations/use-create-event";
import { toast } from "sonner";
import { Trophy, Loader2, Settings, BookOpenText } from "lucide-react";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringMode,
  type EventScoringRules,
} from "../../types/scoring-rules";
import {
  normalizeScoringMode,
  normalizeScoringRules,
} from "../../utils/scoring-rules";
import { ScoringRulesEditor } from "./scoring-rules-editor";

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  world: string;
  startsAt?: Date;
  endsAt?: Date;
  participationConfirmationMinutes: number;
  rulebookMarkdown: string;
  scoringMode: EventScoringMode;
  scoringRules: EventScoringRules;
}

const getDefaultValues = (): FormData => ({
  name: "",
  world: "",
  startsAt: new Date(),
  endsAt: undefined,
  participationConfirmationMinutes: 0,
  rulebookMarkdown: "",
  scoringMode: "SIMPLE",
  scoringRules: normalizeScoringRules(DEFAULT_ADVANCED_EVENT_SCORING_RULES),
});

export const EventCreateDialog = ({
  open,
  onOpenChange,
}: EventCreateDialogProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const navigate = useNavigate();
  const { mutate: createEvent, isPending } = useCreateEvent();
  const [step, setStep] = useState<1 | 2>(1);

  const form = useForm<FormData>({
    defaultValues: getDefaultValues(),
  });

  const scoringMode = normalizeScoringMode(form.watch("scoringMode"));

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(getDefaultValues());
      setStep(1);
    }
    onOpenChange(isOpen);
  };

  const canGoNext = useMemo(() => {
    return scoringMode === "SIMPLE" || scoringMode === "ADVANCED";
  }, [scoringMode]);

  const onSubmit = (data: FormData) => {
    if (data.endsAt && data.startsAt && data.endsAt <= data.startsAt) {
      toast.error(
        t(
          "events.createDialog.endDateMustBeAfterStart",
          "Data końca musi być po dacie startu",
        ),
      );
      return;
    }

    if (!data.name.trim() || !data.world.trim()) {
      toast.error(
        t(
          "events.createDialog.nameWorldRequired",
          "Nazwa eventu i świat są wymagane",
        ),
      );
      return;
    }

    const normalizedMode = normalizeScoringMode(data.scoringMode);

    createEvent(
      {
        name: data.name.trim(),
        world: data.world.trim(),
        startsAt: data.startsAt?.toISOString(),
        endsAt: data.endsAt?.toISOString(),
        participationConfirmationMinutes: Number.isFinite(
          data.participationConfirmationMinutes,
        )
          ? Math.max(0, Math.round(data.participationConfirmationMinutes))
          : 0,
        rulebookMarkdown: data.rulebookMarkdown?.trim().length
          ? data.rulebookMarkdown.trim()
          : null,
        scoringMode: normalizedMode,
        scoringRules:
          normalizedMode === "ADVANCED"
            ? normalizeScoringRules(data.scoringRules)
            : null,
      },
      {
        onSuccess: (eventData) => {
          toast.success(t("events.createDialog.success"));
          handleClose(false);
          navigate({ to: `/${guildId}/events/${eventData.id}` });
        },
        onError: () => {
          toast.error(t("events.createDialog.error"));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
              {t(
                "events.scoring.modeHint",
                "Tryb prosty daje 1 pkt za eligible gracza. Tryb zaawansowany pozwala budować reguły z klocków.",
              )}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => form.setValue("scoringMode", "SIMPLE")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  scoringMode === "SIMPLE"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <p className="font-medium text-sm">
                  {t("events.scoring.modeSimpleTitle", "Tryb prosty")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "events.scoring.modeSimpleDescription",
                    "Każdy eligible gracz otrzymuje 1 pkt.",
                  )}
                </p>
              </button>
              <button
                type="button"
                onClick={() => form.setValue("scoringMode", "ADVANCED")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  scoringMode === "ADVANCED"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <p className="font-medium text-sm">
                  {t("events.scoring.modeAdvancedTitle", "Tryb zaawansowany")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(
                    "events.scoring.modeAdvancedDescription",
                    "Reguły JEŻELI/WTEDY z akcjami punktowymi budowanymi z klocków.",
                  )}
                </p>
              </button>
            </div>
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
                  control={form.control}
                  register={form.register}
                  t={t}
                />
              </div>
            )}
          </form>
        )}

        <div className="px-5 py-3 border-t bg-muted/30 shrink-0 flex gap-2">
          <Button
            type="button"
            variant="outline"
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
              disabled={!canGoNext}
              onClick={() => setStep(2)}
            >
              {t("events.createDialog.next", "Dalej")}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={isPending}
              onClick={form.handleSubmit(onSubmit)}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  {t("events.createDialog.creating")}
                </>
              ) : (
                t("events.createDialog.create")
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
