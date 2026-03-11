import { useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  Loader2,
  Pencil,
  RefreshCcw,
  Settings,
} from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Label } from "@lootlog/ui/components/label";
import { useEventOverview } from "./hooks/queries/use-event-overview";
import { useEventMutations } from "./hooks/mutations/use-event-mutations";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringMode,
  type EventScoringRules,
} from "./types/scoring-rules";
import {
  normalizeScoringMode,
  normalizeScoringRules,
} from "./utils/scoring-rules";
import { ScoringRulesEditor } from "./components/dialogs/scoring-rules-editor";

interface EventScoringFormData {
  scoringMode: EventScoringMode;
  scoringRules: EventScoringRules;
}

const toScoringDefaults = (
  event: NonNullable<ReturnType<typeof useEventOverview>["data"]>,
): EventScoringFormData => {
  const scoringMode = normalizeScoringMode(event.scoringMode);
  return {
    scoringMode,
    scoringRules:
      scoringMode === "ADVANCED"
        ? normalizeScoringRules(event.scoringRules)
        : normalizeScoringRules(DEFAULT_ADVANCED_EVENT_SCORING_RULES),
  };
};

export const EventEditScoringPage = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });

  const routeParams = {
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  };

  const { data: event, isLoading, error } = useEventOverview(routeParams);
  const { updateEvent, recalculatePoints } = useEventMutations(
    routeParams.guildId,
    routeParams.eventId,
  );

  const form = useForm<EventScoringFormData>({
    defaultValues: {
      scoringMode: "SIMPLE",
      scoringRules: normalizeScoringRules(DEFAULT_ADVANCED_EVENT_SCORING_RULES),
    },
  });

  useEffect(() => {
    if (event) {
      form.reset(toScoringDefaults(event));
    }
  }, [event, form]);

  const scoringMode = normalizeScoringMode(form.watch("scoringMode"));

  const onSubmit = async (data: EventScoringFormData) => {
    const normalizedMode = normalizeScoringMode(data.scoringMode);

    try {
      await updateEvent.mutateAsync({
        scoringMode: normalizedMode,
        scoringRules:
          normalizedMode === "ADVANCED"
            ? normalizeScoringRules(data.scoringRules)
            : null,
      });
      toast.success(t("events.scoring.saveSuccess"));
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{t("events.error")}</p>
        <Link to="/$guildId/events/$eventId" params={routeParams}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <Card className="max-w-4xl mx-auto p-4 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">
              {t("events.editSections.scoring")}
            </h1>
            <p className="text-sm text-muted-foreground">{event.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/$guildId/events/$eventId" params={routeParams}>
              <Button variant="outline" size="sm">
                {t("events.createDialog.cancel")}
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateEvent.isPending}
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
        </div>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("events.scoring.mode", "Tryb punktacji")}
            </Label>
            <select
              {...form.register("scoringMode")}
              className="h-9 rounded-md border bg-background px-2 text-sm w-full"
            >
              <option value="SIMPLE">
                {t("events.scoring.modeSimpleTitle", "Tryb prosty")}
              </option>
              <option value="ADVANCED">
                {t("events.scoring.modeAdvancedTitle", "Tryb zaawansowany")}
              </option>
            </select>
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

          <div className="space-y-2 pt-2">
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
          </div>
        </form>
      </Card>
    </div>
  );
};
