import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Textarea } from "@lootlog/ui/components/textarea";
import {
  Pencil,
  Loader2,
  Settings,
  RefreshCcw,
  BookOpenText,
} from "lucide-react";
import { useEventMutations } from "../../hooks/mutations/use-event-mutations";
import { toast } from "sonner";
import { ScoringRulesEditor } from "./scoring-rules-editor";
import type { EventScoringRules } from "../../types/scoring-rules";
import { normalizeScoringRules } from "../../utils/scoring-rules";
import {
  fromDateTimeLocalValueToIso,
  toDateTimeLocalValue,
} from "../../utils/date-time-local";

interface EventEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    guildId: string;
    name: string;
    active: boolean;
    createdAt: string;
    startsAt?: string | null;
    endsAt?: string | null;
    assignmentTimeoutMinutes?: number | null;
    participationConfirmationMinutes?: number | null;
    mapAssignmentCap?: number | null;
    rulebookMarkdown?: string | null;
    scoringRules?: EventScoringRules | null;
  };
}

interface FormData {
  name: string;
  startsAt: string;
  endsAt: string;
  assignmentTimeoutMinutes: number;
  participationConfirmationMinutes: number;
  mapAssignmentCap: number;
  rulebookMarkdown: string;
  scoringRules: EventScoringRules;
}

const getDefaultValues = (event: EventEditDialogProps["event"]): FormData => ({
  name: event.name,
  startsAt: toDateTimeLocalValue(event.startsAt ?? event.createdAt),
  endsAt: toDateTimeLocalValue(event.endsAt),
  assignmentTimeoutMinutes: event.assignmentTimeoutMinutes ?? 5,
  participationConfirmationMinutes: event.participationConfirmationMinutes ?? 0,
  mapAssignmentCap: event.mapAssignmentCap ?? 0,
  rulebookMarkdown: event.rulebookMarkdown ?? "",
  scoringRules: normalizeScoringRules(event.scoringRules),
});

export const EventEditDialog = ({
  open,
  onOpenChange,
  event,
}: EventEditDialogProps) => {
  const { t } = useTranslation();
  const { updateEvent, recalculatePoints } = useEventMutations(
    event.guildId,
    event.id,
  );

  const { register, handleSubmit, reset, control } = useForm<FormData>({
    defaultValues: getDefaultValues(event),
  });

  useEffect(() => {
    if (open) {
      reset(getDefaultValues(event));
    }
  }, [open, event, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const startsAt = fromDateTimeLocalValueToIso(data.startsAt);
      const endsAtIso = fromDateTimeLocalValueToIso(data.endsAt);

      await updateEvent.mutateAsync({
        name: data.name.trim(),
        startsAt,
        endsAt: data.endsAt ? endsAtIso : event.endsAt ? null : undefined,
        assignmentTimeoutMinutes: Number.isFinite(data.assignmentTimeoutMinutes)
          ? Math.max(0, Math.round(data.assignmentTimeoutMinutes))
          : 5,
        participationConfirmationMinutes: Number.isFinite(
          data.participationConfirmationMinutes,
        )
          ? Math.max(0, Math.round(data.participationConfirmationMinutes))
          : 0,
        mapAssignmentCap: Number.isFinite(data.mapAssignmentCap)
          ? Math.max(0, Math.round(data.mapAssignmentCap))
          : 0,
        rulebookMarkdown:
          data.rulebookMarkdown.trim().length > 0
            ? data.rulebookMarkdown.trim()
            : null,
        scoringRules: normalizeScoringRules(data.scoringRules),
      });
      toast.success(t("events.scoring.saveSuccess"));
      onOpenChange(false);
    } catch {
      toast.error(t("events.scoring.saveError"));
    }
  };

  const handleRecalculate = async () => {
    try {
      await recalculatePoints.mutateAsync();
      toast.success(
        t(
          "events.scoring.recalculateSuccess",
          "Punkty zostały przeliczone według aktualnych zasad",
        ),
      );
    } catch {
      toast.error(
        t(
          "events.scoring.recalculateError",
          "Nie udało się przeliczyć punktów",
        ),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pencil className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.edit")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {event.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <form
            id="event-edit-form"
            onSubmit={handleSubmit(onSubmit)}
            className="p-5 space-y-5"
          >
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.nameLabel")}
              </Label>
              <Input
                {...register("name", { required: true })}
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("events.createDialog.startsAt", "Data rozpoczęcia")}
                </Label>
                <Input
                  type="datetime-local"
                  {...register("startsAt")}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("events.createDialog.endsAt", "Data zakończenia")}
                </Label>
                <Input
                  type="datetime-local"
                  {...register("endsAt")}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t(
                  "events.settings.assignmentTimeout",
                  "Czas na przypisanie (minuty)",
                )}
              </Label>
              <Input
                type="number"
                min={0}
                {...register("assignmentTimeoutMinutes", {
                  valueAsNumber: true,
                })}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  "events.settings.assignmentTimeoutDescription",
                  "Ile minut przed minimalnym czasem respawnu można się przypisać do mapy",
                )}
              </p>
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
                {...register("participationConfirmationMinutes", {
                  valueAsNumber: true,
                })}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  "events.settings.participationConfirmationDescription",
                  "Ile minut po biciu gracz ma na potwierdzenie udziału (0 = wyłączone)",
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.settings.mapAssignmentCap", "Limit osób na mapie")}
              </Label>
              <Input
                type="number"
                min={0}
                {...register("mapAssignmentCap", { valueAsNumber: true })}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  "events.settings.mapAssignmentCapDescription",
                  "Maksymalna liczba osób, które mogą się przypisać do jednej mapy (0 = brak limitu)",
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <BookOpenText className="size-3" />
                {t("events.rulebook.label", "Regulamin eventu")}
              </Label>
              <Textarea
                {...register("rulebookMarkdown")}
                placeholder={t(
                  "events.rulebook.placeholder",
                  "Wpisz regulamin eventu, zasady uczestnictwa i dodatkowe informacje.",
                )}
                className="min-h-[140px] text-sm"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Settings className="size-3" />
                {t("events.scoring.title")}
              </Label>

              <ScoringRulesEditor control={control} register={register} t={t} />

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleRecalculate}
                disabled={recalculatePoints.isPending}
              >
                {recalculatePoints.isPending ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    {t("events.scoring.recalculating", "Przeliczanie...")}
                  </>
                ) : (
                  <>
                    <RefreshCcw className="size-3.5 mr-1.5" />
                    {t(
                      "events.scoring.recalculateButton",
                      "Przelicz historyczne punkty",
                    )}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t(
                  "events.scoring.recalculateHint",
                  "Użyj po zmianach ustawień eventu, aby przeliczyć stare kille według aktualnych zasad.",
                )}
              </p>
            </div>
          </form>
        </div>

        <div className="px-5 py-3 border-t bg-muted/30 shrink-0 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t("events.createDialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="event-edit-form"
            size="sm"
            disabled={updateEvent.isPending}
            className="flex-1"
          >
            {updateEvent.isPending ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                {t("events.scoring.saving")}
              </>
            ) : (
              <>
                <Pencil className="size-3.5 mr-1.5" />
                {t("events.scoring.save")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
